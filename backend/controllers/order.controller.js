import crypto from "crypto";
import Razorpay from "razorpay";
import mongoose from "mongoose";
import Order from "../models/order.model.js";
import { generateInvoicePdf } from "../utils/invoiceGenerator.js";
import Cart from "../models/cart.model.js";
import Item from "../models/product.model.js";
import FestivalKit from "../models/festivalKit.model.js";
import User from "../models/user.model.js";
import Coupon from "../models/coupon.model.js";
import Offer from "../models/offer.model.js";
import Wallet from "../models/wallet.model.js";
import WalletTransaction from "../models/walletTransaction.model.js";
import BookingPricing from "../models/bookingPrice.js";
import PanditWallet from "../models/panditWallet.model.js";
import PanditWalletTransaction from "../models/panditWalletTransaction.model.js";
import DeliveryPricing from "../models/vendorDeliveryPricing.model.js";
import { notifyAdmins, notifyUsersByIds, notifyVendorsByIds } from "../utils/notification.service.js";

const SUPPORTED_PRODUCT_TYPES = ["Item", "FestivalKit", "DefaultKit"];
const TRACKING_STEPS = ["Placed", "Confirmed", "Preparing", "Out for Delivery", "Delivered"];
const ADDRESS_TYPES = ["home", "work", "others"];
const ORDER_ITEMS_POPULATE = {
  path: "items.product",
  strictPopulate: false,
  populate: [
    {
      path: "items.product",
      strictPopulate: false,
    },
    {
      path: "baseKit",
      strictPopulate: false,
      populate: {
        path: "items.product",
        strictPopulate: false,
      },
    },
  ],
};

const toMoney = (value) => {
  const num = Number(value || 0);
  return Number.isFinite(num) && num >= 0 ? Number(num.toFixed(2)) : 0;
};

const getDeliveryFee = (inputFee) => {
  const fromBody = Number(inputFee);
  if (Number.isFinite(fromBody) && fromBody >= 0) {
    return Number(fromBody.toFixed(2));
  }

  const fromEnv = Number(process.env.ORDER_DELIVERY_FEE);
  if (Number.isFinite(fromEnv) && fromEnv >= 0) {
    return Number(fromEnv.toFixed(2));
  }

  return 20;
};

const resolveAddressForCheckout = async ({ userId, addressId, addressInput, addressType, req }) => {
  let resolvedAddress = null;

  if (addressId) {
    const user = await User.findById(userId).select("savedAddresses");
    const selectedAddress = user?.savedAddresses?.find(
      (saved) => String(saved._id) === String(addressId)
    );
    if (selectedAddress) {
      resolvedAddress = {
        name: selectedAddress.name,
        phone: selectedAddress.phone,
        fullAddress: selectedAddress.fullAddress,
        addressType: normalizeAddressType(selectedAddress.addressType),
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
      };
    }
  } else if (addressInput && (addressInput.city || addressInput.pincode || addressInput.fullAddress)) {
    try {
      resolvedAddress = buildAddress(req, addressInput, addressType);
    } catch (err) {
      resolvedAddress = {
        name: addressInput.name || req?.user?.name || "",
        phone: addressInput.phone || req?.user?.phone || "",
        fullAddress: addressInput.fullAddress || "",
        addressType: normalizeAddressType(addressType || addressInput.addressType || "others"),
        city: String(addressInput.city || "").trim(),
        state: String(addressInput.state || "").trim(),
        pincode: String(addressInput.pincode || "").trim(),
      };
    }
  }

  if (!resolvedAddress) {
    const user = await User.findById(userId);
    if (user) {
      const defaultAddress = user.savedAddresses?.find((x) => x.isDefault) || user.savedAddresses?.[0];
      if (defaultAddress) {
        resolvedAddress = {
          name: defaultAddress.name,
          phone: defaultAddress.phone,
          fullAddress: defaultAddress.fullAddress,
          addressType: normalizeAddressType(defaultAddress.addressType),
          city: defaultAddress.city,
          state: defaultAddress.state,
          pincode: defaultAddress.pincode,
        };
      } else {
        resolvedAddress = {
          city: user.selectedCity || user.address || "",
          pincode: "",
        };
      }
    }
  }

  return resolvedAddress;
};

const calculateDynamicDeliveryFee = async (vendorId, address, inputFee) => {
  let matchedCharge = null;

  if (vendorId && address) {
    const { pincode, city } = address;
    const filter = { vendorId, status: { $ne: "inactive" } };

    if (pincode?.trim()) {
      const pricing = await DeliveryPricing.findOne({
        ...filter,
        pincode: pincode.trim(),
      });
      if (pricing) {
        matchedCharge = pricing.deliveryCharge;
      }
    }

    if (matchedCharge === null && city?.trim()) {
      const pricing = await DeliveryPricing.findOne({
        ...filter,
        locationName: { $regex: new RegExp(`^${city.trim()}$`, "i") },
      });
      if (pricing) {
        matchedCharge = pricing.deliveryCharge;
      }
    }
  }

  if (matchedCharge !== null) {
    return matchedCharge;
  }

  return getDeliveryFee(inputFee);
};

const normalizePaymentMethod = (value = "COD") => {
  const normalized = String(value || "COD").trim().toUpperCase();
  if (["ONLINE", "UPI", "RAZORPAY", "PREPAID"].includes(normalized)) {
    return "ONLINE";
  }
  return "COD";
};

const normalizeOrderStatus = (value = "Placed") => {
  const normalized = String(value || "Placed").trim().toLowerCase();

  if (normalized === "placed") return "Placed";
  if (normalized === "confirmed") return "Confirmed";
  if (normalized === "preparing") return "Preparing";
  if (normalized === "out for delivery" || normalized === "out_for_delivery") {
    return "Out for Delivery";
  }
  if (normalized === "delivered") return "Delivered";
  if (normalized === "cancelled" || normalized === "canceled") return "Cancelled";
  if (normalized === "reschedule requested" || normalized === "reschedule_requested") {
    return "Reschedule Requested";
  }

  return "Placed";
};

const normalizeAddressType = (value = "others") => {
  const normalized = String(value || "others").trim().toLowerCase();
  return ADDRESS_TYPES.includes(normalized) ? normalized : "others";
};

const getRazorpayCredentials = () => {
  const keyId = String(process.env.RAZORPAY_KEY_ID || process.env.key_id || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || process.env.key_secret || "").trim();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are not configured in environment");
  }

  return { keyId, keySecret };
};

const isWithinWindow = (doc) => {
  const now = new Date();
  if (doc?.startsAt && now < doc.startsAt) return false;
  if (doc?.expiresAt && now > doc.expiresAt) return false;
  return true;
};

const computeCouponDiscount = ({ amount, coupon }) => {
  if (!coupon) return 0;

  if (coupon.discountType === "percent") {
    const raw = (toMoney(amount) * coupon.discountValue) / 100;
    const capped = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
    return toMoney(capped);
  }

  return toMoney(Math.min(coupon.discountValue, amount));
};

const computeOfferBenefit = ({ amount, offer }) => {
  if (!offer) return 0;

  if (offer.discountType === "percent") {
    const raw = (toMoney(amount) * offer.value) / 100;
    const capped = offer.maxBenefit ? Math.min(raw, offer.maxBenefit) : raw;
    return toMoney(capped);
  }

  return toMoney(Math.min(offer.value, amount));
};

const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await Wallet.create({ user: userId, balance: 0 });
  }
  return wallet;
};

const getOrCreatePanditWallet = async (panditId) => {
  let wallet = await PanditWallet.findOne({ pandit: panditId });
  if (!wallet) {
    wallet = await PanditWallet.create({ pandit: panditId, balance: 0 });
  }
  return wallet;
};

const applyPanditCommission = async ({ panditId, orderId, baseAmount }) => {
  if (!panditId) {
    return null;
  }

  const pricing = await BookingPricing.findOne({ isActive: true }).lean();
  const commissionPercent = Number(pricing?.panditCommissionPercent || 0);

  if (!Number.isFinite(commissionPercent) || commissionPercent <= 0) {
    return null;
  }

  const commissionAmount = toMoney((toMoney(baseAmount) * commissionPercent) / 100);

  if (commissionAmount <= 0) {
    return null;
  }

  const wallet = await getOrCreatePanditWallet(panditId);
  const nextBalance = toMoney(wallet.balance + commissionAmount);
  const threshold = Number(pricing?.panditCommissionThreshold || 0);

  wallet.balance = nextBalance;
  wallet.totalEarned = toMoney(wallet.totalEarned + commissionAmount);
  wallet.isPayable = Number.isFinite(threshold) && threshold > 0 && nextBalance >= threshold;
  wallet.payableBalance = wallet.isPayable ? nextBalance : 0;
  await wallet.save();

  await PanditWalletTransaction.create({
    wallet: wallet._id,
    pandit: panditId,
    type: "credit",
    source: "pandit-commission",
    amount: commissionAmount,
    balanceAfter: nextBalance,
    reference: String(orderId),
    meta: {
      orderId: String(orderId),
      commissionPercent,
    },
  });

  return { commissionAmount, balanceAfter: nextBalance };
};

const resolveDiscountsAndWallet = async ({
  userId,
  baseAmount,
  couponCode,
  offerId,
  walletAmount,
  vendorId = null,
}) => {
  let coupon = null;
  let offer = null;
  let couponDiscount = 0;
  let offerDiscount = 0;
  let cashbackAmount = 0;
  let welcomeCouponCode = "";
  
  let walletUsed = 0;

  const resolvedCouponCode = couponCode;

  if (resolvedCouponCode) {
    const normalizedCode = String(resolvedCouponCode).trim().toUpperCase();
    coupon = await Coupon.findOne({
      code: normalizedCode,
      isActive: true,
      ...(vendorId ? { vendorId } : {}),
    });

    if (!coupon || !isWithinWindow(coupon)) {
      throw new Error("Invalid or inactive coupon code");
    }

    if (coupon && toMoney(baseAmount) < toMoney(coupon.minOrderAmount)) {
      throw new Error("Order amount is below coupon minimum");
    }

    if (coupon && coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new Error("Coupon usage limit reached");
    }

    if (coupon && coupon.perUserLimit) {
      const usageCount = await Order.countDocuments({
        user: userId,
        couponCode: normalizedCode,
      });

      if (usageCount >= coupon.perUserLimit) {
        throw new Error("Coupon usage limit reached for user");
      }
    }

    if (coupon) {
      couponDiscount = computeCouponDiscount({ amount: baseAmount, coupon });
      welcomeCouponCode = normalizedCode;
    }
  }

  if (offerId && mongoose.Types.ObjectId.isValid(offerId)) {
    offer = await Offer.findOne({
      _id: offerId,
      ...(vendorId ? { vendorId } : {}),
    });

    if (!offer || !offer.isActive || !isWithinWindow(offer)) {
      throw new Error("Invalid or inactive offer");
    }

    if (toMoney(baseAmount) < toMoney(offer.minOrderAmount)) {
      throw new Error("Order amount is below offer minimum");
    }

    const benefit = computeOfferBenefit({ amount: baseAmount, offer });
    offerDiscount = benefit;
  }

  const discountTotal = toMoney(couponDiscount + offerDiscount);
  let payableAmount = toMoney(baseAmount - discountTotal);

  if (walletAmount && payableAmount > 0) {
    const requested = toMoney(walletAmount);
    if (requested > 0) {
      const wallet = await getOrCreateWallet(userId);
      walletUsed = toMoney(Math.min(wallet.balance, requested, payableAmount));
      payableAmount = toMoney(payableAmount - walletUsed);
    }
  }

  return {
    coupon,
    offer,
    couponDiscount,
    offerDiscount,
    cashbackAmount,
    discountTotal,
    walletUsed,
    payableAmount,
    welcomeCouponCode,
  };
};

const getProductDocAndPrice = async ({ userId, productType, productId }) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product id");
  }

  let resolvedProductType = String(productType || "").trim();

  if (!resolvedProductType) {
    const item = await Item.findOne({ _id: productId, status: "active" });
    if (item) {
      return {
        productType: "Item",
        doc: item,
        unitPrice: toMoney(item.pricing?.price),
        vendorId: item.vendorId || null,
      };
    }

    const festivalKit = await FestivalKit.findById(productId);
    if (festivalKit) {
      return {
        productType: "FestivalKit",
        doc: festivalKit,
        unitPrice: toMoney(festivalKit.kitPrice || festivalKit.totalPrice),
      };
    }

    throw new Error("Product not found");
  }

  if (!SUPPORTED_PRODUCT_TYPES.includes(resolvedProductType)) {
    throw new Error(`Unsupported productType: ${resolvedProductType}`);
  }

  if (resolvedProductType === "Item") {
    const product = await Item.findOne({ _id: productId, status: "active" });
    if (!product) {
      throw new Error("Item not found");
    }

    return {
      productType: "Item",
      doc: product,
      unitPrice: toMoney(product.pricing?.price),
    };
  }

  if (resolvedProductType === "FestivalKit") {
    const kit = await FestivalKit.findById(productId);
    if (!kit) {
      throw new Error("Kit not found");
    }

    return {
      productType: "FestivalKit",
      doc: kit,
      unitPrice: toMoney(kit.kitPrice || kit.totalPrice),
      vendorId: kit.vendorId || null,
    };
  }

  if (resolvedProductType === "DefaultKit") {
    const kit = await FestivalKit.findOne({
      _id: productId,
      kitType: { $in: ["Customize", "default"] },
      status: "active",
    });
    if (!kit) {
      throw new Error("Customize kit not found");
    }

    return {
      productType: "FestivalKit",
      doc: kit,
      unitPrice: toMoney(kit.kitPrice || kit.totalPrice),
      vendorId: kit.vendorId || null,
    };
  }
};

const resolveCheckoutItems = async ({ userId, directItems = null }) => {
  const fromDirect = Array.isArray(directItems) && directItems.length > 0;
  const sourceItems = fromDirect
    ? directItems
    : await Cart.find({ user: userId }).lean();

  if (!sourceItems.length) {
    throw new Error("No items found to place order");
  }

  const resolved = [];
  let resolvedVendorId = null;
  for (const row of sourceItems) {
    const providedProductType = String(row.productType || "").trim();
    const productId = row.id || row.productId || row.product;

    if (!productId) {
      throw new Error("Each item must include id or productId");
    }

    let quantity = Number(row.quantity || 1);

    if (!Number.isFinite(quantity) || quantity < 1) {
      quantity = 1;
    }

    const { unitPrice, doc, productType, vendorId } = await getProductDocAndPrice({
      userId,
      productType: providedProductType,
      productId,
    });

    const itemVendorId = vendorId || doc?.vendorId || null;
    if (!resolvedVendorId && itemVendorId) {
      resolvedVendorId = itemVendorId;
    } else if (resolvedVendorId && itemVendorId && String(itemVendorId) !== String(resolvedVendorId)) {
      throw new Error("Multiple vendors in one order are not supported");
    }

    if (productType === "Item" && Number(doc.stock?.quantity || 0) < quantity) {
      throw new Error(`${doc.title} is out of stock for selected quantity`);
    }

    if (productType !== "Item") {
      quantity = 1;
    }

    resolved.push({
      productType,
      product: doc._id,
      quantity,
      price: unitPrice,
      lineTotal: toMoney(unitPrice * quantity),
    });
  }

  const itemTotal = toMoney(
    resolved.reduce((sum, item) => sum + item.lineTotal, 0)
  );

  const orderItems = resolved.map(({ lineTotal, ...item }) => item);

  return {
    orderItems,
    itemTotal,
    source: fromDirect ? "direct" : "cart",
    vendorId: resolvedVendorId,
  };
};

const buildAddress = (req, addressInput = {}, explicitAddressType = "") => {
  const address = {
    name: String(addressInput?.name || req.user?.name || "").trim(),
    phone: String(addressInput?.phone || req.user?.phone || "").trim(),
    fullAddress: String(
      addressInput?.fullAddress || addressInput?.line1 || req.user?.address || ""
    ).trim(),
    addressType: normalizeAddressType(
      explicitAddressType || addressInput?.addressType || addressInput?.label || "others"
    ),
    city: String(addressInput?.city || "").trim(),
    state: String(addressInput?.state || "").trim(),
    pincode: String(addressInput?.pincode || "").trim(),
  };

  if (!address.name || !address.phone || !address.fullAddress) {
    throw new Error("Delivery address is incomplete");
  }

  return address;
};

const buildAddressFingerprint = (address = {}) => {
  const normalized = [
    String(address.phone || "").replace(/\s+/g, "").trim().toLowerCase(),
    String(address.fullAddress || "").replace(/\s+/g, " ").trim().toLowerCase(),
    String(address.city || "").trim().toLowerCase(),
    String(address.state || "").trim().toLowerCase(),
    String(address.pincode || "").replace(/\s+/g, "").trim().toLowerCase(),
  ];

  return normalized.join("|");
};

const buildTrackingPayload = (order) => {
  const currentStatus = normalizeOrderStatus(order?.orderStatus);
  const currentIndex = TRACKING_STEPS.indexOf(currentStatus);

  const steps = TRACKING_STEPS.map((step, index) => {
    if (currentStatus === "Cancelled") {
      return {
        label: step,
        completed: false,
        active: step === "Placed",
      };
    }

    return {
      label: step,
      completed: index < currentIndex || (currentStatus === "Delivered" && index === currentIndex),
      active: index === currentIndex,
    };
  });

  return {
    currentStatus,
    isCancelled: currentStatus === "Cancelled",
    steps,
    placedAt: order?.createdAt || null,
    lastUpdatedAt: order?.updatedAt || null,
  };
};

const sendOrderNotificationToUser = async ({ userId, orderId, title, body, data = {} }) => {
  return notifyUsersByIds({
    userIds: [userId],
    title,
    body,
    data: { orderId: String(orderId), ...data },
  }).catch((error) => {
    console.error("USER ORDER NOTIFICATION ERROR:", error?.message || error);
  });
};

const sendOrderNotificationToVendor = async ({ vendorId, orderId, title, body, data = {} }) => {
  if (!vendorId) {
    return null;
  }

  return notifyVendorsByIds({
    vendorIds: [vendorId],
    title,
    body,
    data: { orderId: String(orderId), ...data },
  }).catch((error) => {
    console.error("VENDOR ORDER NOTIFICATION ERROR:", error?.message || error);
  });
};

const upsertSavedAddressForUser = async ({
  userId,
  address,
  label = "",
  setAsDefault = false,
}) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (!Array.isArray(user.savedAddresses)) {
    user.savedAddresses = [];
  }

  const fingerprint = buildAddressFingerprint(address);
  const existingAddress = user.savedAddresses.find((saved) =>
    buildAddressFingerprint(saved) === fingerprint
  );

  let targetAddress;

  if (existingAddress) {
    existingAddress.name = address.name;
    existingAddress.phone = address.phone;
    existingAddress.fullAddress = address.fullAddress;
    existingAddress.addressType = address.addressType;
    existingAddress.city = address.city;
    existingAddress.state = address.state;
    existingAddress.pincode = address.pincode;
    if (label) {
      existingAddress.label = String(label).trim();
    }
    targetAddress = existingAddress;
  } else {
    user.savedAddresses.push({
      ...address,
      label: String(label || "").trim(),
      isDefault: false,
    });
    targetAddress = user.savedAddresses[user.savedAddresses.length - 1];
  }

  if (setAsDefault || user.savedAddresses.length === 1) {
    user.savedAddresses.forEach((saved) => {
      saved.isDefault = String(saved._id) === String(targetAddress._id);
    });
  }

  user.address = address.fullAddress;
  if (!user.name && address.name) {
    user.name = address.name;
  }

  await user.save();

  return targetAddress;
};

const verifyRazorpaySignature = ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  const { keySecret } = getRazorpayCredentials();
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  return expectedSignature === razorpaySignature;
};

const populateOrderItems = async (orders) => {
  return Order.populate(orders, ORDER_ITEMS_POPULATE);
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { items = null, deliveryFee, couponCode, offerId, walletAmount, addressId, address } = req.body;

    const { orderItems, itemTotal, vendorId } = await resolveCheckoutItems({
      userId,
      directItems: items,
    });

    const resolvedAddress = await resolveAddressForCheckout({
      userId,
      addressId,
      addressInput: address,
      req,
    });

    const finalDeliveryFee = await calculateDynamicDeliveryFee(vendorId, resolvedAddress, deliveryFee);
    const totalAmount = toMoney(itemTotal + finalDeliveryFee);

    if (totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Order amount must be greater than zero",
      });
    }

    const {
      coupon,
      offer,
      couponDiscount,
      offerDiscount,
      cashbackAmount,
      discountTotal,
      walletUsed,
      payableAmount,
      welcomeCouponCode,
    } = await resolveDiscountsAndWallet({
      userId,
      baseAmount: totalAmount,
      couponCode,
      offerId,
      walletAmount,
      vendorId,
    });

    if (payableAmount <= 0) {
      return res.json({
        success: true,
        message: "No online payment required",
        data: {
          keyId: null,
          itemTotal,
          deliveryFee: finalDeliveryFee,
          totalAmount,
          couponCode: coupon?.code || null,
          offerId: offer?._id || null,
          couponDiscount,
          offerDiscount,
          cashbackAmount,
          discountTotal,
          walletUsed,
          payableAmount: 0,
          currency: "INR",
          razorpayOrder: null,
          requiresPayment: false,
        },
      });
    }

    const { keyId, keySecret } = getRazorpayCredentials();
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(payableAmount * 100),
      currency: "INR",
      receipt: `order_${String(userId).slice(-6)}_${Date.now()}`,
      notes: {
        userId: String(userId),
        itemCount: String(orderItems.length),
        vendorId: vendorId ? String(vendorId) : "",
      },
    });

    return res.json({
      success: true,
      message: "Razorpay order created",
      data: {
        keyId,
        itemTotal,
        deliveryFee: finalDeliveryFee,
        totalAmount,
        couponCode: coupon?.code || null,
        offerId: offer?._id || null,
        couponDiscount,
        offerDiscount,
        cashbackAmount,
        discountTotal,
        walletUsed,
        payableAmount,
        currency: "INR",
        razorpayOrder,
        requiresPayment: true,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}; 

export const placeOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      paymentMethod = "COD",
      addressId,
      addressType,
      address,
      saveAddress = true,
      addressLabel,
      items = null,
      deliveryFee,
      couponCode,
      offerId,
      walletAmount,
      pandit_id,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    let resolvedPanditId = null;
    if (pandit_id) {
      if (!mongoose.Types.ObjectId.isValid(pandit_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid pandit_id",
        });
      }
      resolvedPanditId = pandit_id;
    }

    const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);

    const { orderItems, itemTotal, source, vendorId } = await resolveCheckoutItems({
      userId,
      directItems: items,
    });

    let finalAddress;
    if (addressId) {
      const user = await User.findById(userId).select("savedAddresses");
      const selectedAddress = user?.savedAddresses?.find(
        (saved) => String(saved._id) === String(addressId)
      );

      if (!selectedAddress) {
        return res.status(404).json({
          success: false,
          message: "Saved address not found",
        });
      }

      finalAddress = {
        name: selectedAddress.name,
        phone: selectedAddress.phone,
        fullAddress: selectedAddress.fullAddress,
        addressType: normalizeAddressType(selectedAddress.addressType),
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
      };
    } else {
      finalAddress = buildAddress(req, address, addressType);
    }

    const finalDeliveryFee = await calculateDynamicDeliveryFee(vendorId, finalAddress, deliveryFee);
    const totalAmount = toMoney(itemTotal + finalDeliveryFee);

    const {
      coupon,
      offer,
      couponDiscount,
      offerDiscount,
      cashbackAmount,
      discountTotal,
      walletUsed,
      payableAmount,
      welcomeCouponCode,
    } = await resolveDiscountsAndWallet({
      userId,
      baseAmount: totalAmount,
      couponCode,
      offerId,
      walletAmount,
      vendorId,
    });

    let paymentStatus = "Pending";
    let paymentGateway = null;

    if (normalizedPaymentMethod === "ONLINE" && payableAmount > 0) {
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({
          success: false,
          message:
            "razorpayOrderId, razorpayPaymentId and razorpaySignature are required for online payment",
        });
      }

      const isValidSignature = verifyRazorpaySignature({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });

      if (!isValidSignature) {
        return res.status(400).json({
          success: false,
          message: "Invalid Razorpay payment signature",
        });
      }

      paymentStatus = "Paid";
      paymentGateway = "Razorpay";
    }

    if (payableAmount <= 0) {
      paymentStatus = "Paid";
      paymentGateway = walletUsed > 0 ? "Wallet" : paymentGateway;
    }

    let wallet = null;
    if (walletUsed > 0) {
      wallet = await getOrCreateWallet(userId);
      if (toMoney(wallet.balance) < walletUsed) {
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance",
        });
      }
    }

    const order = await Order.create({
      user: userId,
      pandit: resolvedPanditId,
      vendorId: vendorId || null,
      items: orderItems,
      totalAmount,
      addressType: finalAddress.addressType || null,
      amountBreakup: {
        itemTotal,
        deliveryFee: finalDeliveryFee,
        couponDiscount,
        offerDiscount,
        walletUsed,
        payableAmount,
      },
      couponCode: coupon?.code || null,
      offer: offer
        ? {
            id: offer._id,
            type: offer.offerType,
          }
        : { id: null, type: null },
      discountTotal,
      cashbackAmount,
      walletUsed,
      payableAmount,
      paymentMethod: normalizedPaymentMethod,
      paymentStatus,
      paymentGateway,
      razorpayOrderId: razorpayOrderId || null,
      razorpayPaymentId: razorpayPaymentId || null,
      razorpaySignature: razorpaySignature || null,
      address: finalAddress,
    });

    if (walletUsed > 0 && wallet) {
      const nextBalance = toMoney(wallet.balance - walletUsed);
      wallet.balance = nextBalance;
      await wallet.save();

      await WalletTransaction.create({
        wallet: wallet._id,
        user: userId,
        type: "debit",
        source: "order",
        amount: walletUsed,
        balanceAfter: nextBalance,
        reference: String(order._id),
        meta: {
          orderId: String(order._id),
        },
      });
    }

    if (coupon?.code) {
      await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });
    }

    if (welcomeCouponCode && coupon?.code === welcomeCouponCode) {
      await User.updateOne(
        { _id: userId },
        {
          $set: {
            welcomeCouponRedeemed: true,
            welcomeCouponCode: "",
          },
        },
      );
    }

    if (source === "cart") {
      await Cart.deleteMany({ user: userId });
    }

    if (saveAddress && !addressId) {
      await upsertSavedAddressForUser({
        userId,
        address: finalAddress,
        label: addressLabel,
      });
    }

    const populatedOrder = await Order.findById(order._id)
      .populate(ORDER_ITEMS_POPULATE)
      .lean();

    void notifyAdmins({
      title: "New order placed",
      body: `${req.user.name || req.user.phone || "A user"} placed an order${coupon?.code ? ` with coupon ${coupon.code}` : ""}`,
      data: {
        eventType: "order.placed",
        orderId: String(order._id),
        userId: String(req.user._id),
        couponCode: coupon?.code || "",
        paymentStatus,
      },
    }).catch((error) => console.error("ORDER NOTIFICATION ERROR:", error.message));

    void sendOrderNotificationToUser({
      userId,
      orderId: order._id,
      title: "Order confirmed",
      body: `Your order #${String(order._id).slice(-6).toUpperCase()} has been placed successfully.`,
      data: {
        eventType: "order.placed",
        userName: req.user.name || req.user.phone || "Customer",
        paymentStatus,
      },
    });

    if (vendorId) {
      void sendOrderNotificationToVendor({
        vendorId,
        orderId: order._id,
        title: "New order received",
        body: `Order #${String(order._id).slice(-6).toUpperCase()} has been placed and is ready for processing.`,
        data: {
          eventType: "order.received",
          paymentStatus,
          userId: String(req.user._id),
        },
      });
    }

    if (paymentStatus === "Paid") {
      if (resolvedPanditId) {
        await applyPanditCommission({
          panditId: resolvedPanditId,
          orderId: order._id,
          baseAmount: itemTotal,
        });
      }

      void sendOrderNotificationToUser({
        userId,
        orderId: order._id,
        title: "Payment received",
        body: `Payment for order #${String(order._id).slice(-6).toUpperCase()} has been received successfully.`,
        data: {
          eventType: "payment.success",
          paymentStatus,
        },
      });

      if (vendorId) {
        void sendOrderNotificationToVendor({
          vendorId,
          orderId: order._id,
          title: "Payment success",
          body: `Payment for order #${String(order._id).slice(-6).toUpperCase()} has been received.`,
          data: {
            eventType: "payment.success",
            paymentStatus,
            userId: String(req.user._id),
          },
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: {
        order: populatedOrder,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getSavedAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("savedAddresses");
    const savedAddresses = Array.isArray(user?.savedAddresses) ? user.savedAddresses : [];

    const ordered = savedAddresses.sort((a, b) => {
      if (a.isDefault === b.isDefault) {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
      return a.isDefault ? -1 : 1;
    });

    return res.json({
      success: true,
      data: {
        addresses: ordered,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const addSavedAddress = async (req, res) => {
  try {
    const rootPayload = req.body || {};
    const payload = rootPayload?.address || rootPayload;
    const finalAddress = buildAddress(req, payload, rootPayload.addressType);

    const savedAddress = await upsertSavedAddressForUser({
      userId: req.user._id,
      address: finalAddress,
      label: payload.label,
      setAsDefault: Boolean(payload.isDefault),
    });

    return res.status(201).json({
      success: true,
      message: "Address saved successfully",
      data: {
        address: savedAddress,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const updateSavedAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const rootPayload = req.body || {};
    const payload = rootPayload?.address || rootPayload;

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address id",
      });
    }

    const user = await User.findById(req.user._id);
    const targetAddress = user?.savedAddresses?.id(addressId);

    if (!targetAddress) {
      return res.status(404).json({
        success: false,
        message: "Saved address not found",
      });
    }

    const mergedAddress = buildAddress(req, {
      ...targetAddress.toObject(),
      ...payload,
    }, rootPayload.addressType);

    targetAddress.name = mergedAddress.name;
    targetAddress.phone = mergedAddress.phone;
    targetAddress.fullAddress = mergedAddress.fullAddress;
    targetAddress.addressType = mergedAddress.addressType;
    targetAddress.city = mergedAddress.city;
    targetAddress.state = mergedAddress.state;
    targetAddress.pincode = mergedAddress.pincode;

    if (payload.label !== undefined) {
      targetAddress.label = String(payload.label || "").trim();
    }

    if (payload.isDefault === true) {
      user.savedAddresses.forEach((saved) => {
        saved.isDefault = String(saved._id) === String(targetAddress._id);
      });
    }

    await user.save();

    return res.json({
      success: true,
      message: "Address updated successfully",
      data: {
        address: targetAddress,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const deleteSavedAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address id",
      });
    }

    const user = await User.findById(req.user._id);
    const addresses = Array.isArray(user?.savedAddresses) ? user.savedAddresses : [];
    const targetAddress = addresses.id(addressId);

    if (!targetAddress) {
      return res.status(404).json({
        success: false,
        message: "Saved address not found",
      });
    }

    const deletedWasDefault = Boolean(targetAddress.isDefault);
    targetAddress.deleteOne();

    if (deletedWasDefault && user.savedAddresses.length > 0) {
      user.savedAddresses.forEach((saved, index) => {
        saved.isDefault = index === 0;
      });
    }

    await user.save();

    return res.json({
      success: true,
      message: "Address deleted successfully",
      data: {
        addresses: user.savedAddresses,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    const populatedOrders = await populateOrderItems(orders);

    const formattedOrders = populatedOrders.map((order) => ({
      ...order,
      tracking: buildTrackingPayload(order),
      itemCount: Array.isArray(order.items) ? order.items.length : 0,
    }));

    return res.json({
      success: true,
      count: formattedOrders.length,
      data: {
        orders: formattedOrders,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const order = await Order.findOne({ _id: orderId, user: req.user._id }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const populatedOrder = await populateOrderItems(order);

    return res.json({
      success: true,
      data: {
        order: populatedOrder,
        tracking: buildTrackingPayload(populatedOrder),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const cancelOrderByUser = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason = "", notes = "" } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const resolvedReason = String(reason || "").trim();
    if (!resolvedReason) {
      return res.status(400).json({
        success: false,
        message: "reason is required",
      });
    }

    const order = await Order.findOne({ _id: orderId, user: req.user._id });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const currentStatus = normalizeOrderStatus(order.orderStatus);
    if (currentStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Order already cancelled",
      });
    }

    if (currentStatus === "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Delivered order cannot be cancelled",
      });
    }

    // Process Refund to Wallet
    let refundAmount = 0;
    if (order.paymentStatus === "Paid") {
      refundAmount = toMoney((order.payableAmount || 0) + (order.walletUsed || 0));
    } else if (order.walletUsed > 0) {
      refundAmount = toMoney(order.walletUsed);
    }

    if (refundAmount > 0) {
      const wallet = await getOrCreateWallet(order.user);
      const nextBalance = toMoney(wallet.balance + refundAmount);
      wallet.balance = nextBalance;
      await wallet.save();

      await WalletTransaction.create({
        wallet: wallet._id,
        user: order.user,
        type: "credit",
        source: "refund",
        amount: refundAmount,
        balanceAfter: nextBalance,
        reference: String(order._id),
        notes: `Refund for cancelled order #${String(order._id).slice(-6).toUpperCase()}`,
        meta: {
          orderId: String(order._id),
          type: "cancellation",
        },
      });

      order.paymentStatus = "Refunded";
    }

    order.orderStatus = "Cancelled";
    order.cancellationRequests = order.cancellationRequests || [];
    order.cancellationRequests.push({
      reason: resolvedReason,
      notes: String(notes || "").trim(),
      requestedBy: "user",
      requestedAt: new Date(),
    });

    await order.save();

    // Notify Admins
    void notifyAdmins({
      title: "Order Cancelled",
      body: `${req.user.name || req.user.phone || "A user"} cancelled order #${String(order._id).slice(-6).toUpperCase()}.${refundAmount > 0 ? ` Refund of ₹${refundAmount} credited to user wallet.` : ""}`,
      data: {
        eventType: "order.cancelled",
        orderId: String(order._id),
        userId: String(req.user._id),
        refundAmount: String(refundAmount),
      },
    }).catch((error) => console.error("CANCEL NOTIFICATION ERROR:", error.message));

    // Notify User
    void sendOrderNotificationToUser({
      userId: req.user._id,
      orderId: order._id,
      title: "Order Cancelled",
      body: `Your order #${String(order._id).slice(-6).toUpperCase()} has been cancelled successfully.${refundAmount > 0 ? ` Refund of ₹${refundAmount} has been credited to your wallet.` : ""}`,
      data: {
        eventType: "order.cancelled",
        refundAmount: String(refundAmount),
      },
    });

    return res.json({
      success: true,
      message: "Order cancelled successfully",
      data: order,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to cancel order",
    });
  }
};

export const rescheduleOrderByUser = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason = "", notes = "" } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    // const resolvedReason = String(reason || "").trim();
    // if (!resolvedReason) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "reason is required",
    //   });
    // }

    const order = await Order.findOne({ _id: orderId, user: req.user._id });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const currentStatus = normalizeOrderStatus(order.orderStatus);
    if (currentStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled order cannot be rescheduled",
      });
    }

    if (currentStatus === "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Delivered order cannot be rescheduled",
      });
    }

    order.orderStatus = "Reschedule Requested";
    order.rescheduleRequests = order.rescheduleRequests || [];
    const resolvedReason = String(reason || "").trim();

    order.rescheduleRequests.push({
      reason: resolvedReason,
      notes: String(notes || "").trim(),
      requestedBy: "user",
      requestedAt: new Date(),
    });

    await order.save();

    return res.json({
      success: true,
      message: "Reschedule request submitted",
      data: order,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to reschedule order",
    });
  }
};

export const getOrderInvoicePdf = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const order = await Order.findOne({ _id: orderId, user: req.user._id })
      .populate("user", "name email phone")
      .populate("vendorId")
      .populate("items.product");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Set headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${orderId}.pdf`);

    // Generate PDF and pipe to response
    generateInvoicePdf(order, res);

  } catch (err) {
    console.error("Invoice Generation Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to generate invoice PDF",
    });
  }
};
