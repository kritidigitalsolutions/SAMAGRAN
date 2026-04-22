import crypto from "crypto";
import Razorpay from "razorpay";
import mongoose from "mongoose";
import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";
import Item from "../models/product.model.js";
import FestivalKit from "../models/festivalKit.model.js";
import DefaultKit from "../models/defaultKit.model.js";
import UserKit from "../models/userKit.model.js";
import User from "../models/user.model.js";

const SUPPORTED_PRODUCT_TYPES = ["Item", "FestivalKit", "DefaultKit", "UserKit"];
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

    const defaultKit = await DefaultKit.findOne({ _id: productId, status: "active" });
    if (defaultKit) {
      return {
        productType: "DefaultKit",
        doc: defaultKit,
        unitPrice: toMoney(defaultKit.kitPrice || defaultKit.totalPrice),
      };
    }

    const userKit = await UserKit.findOne({ _id: productId, user: userId });
    if (userKit) {
      if (userKit.status === "ordered") {
        throw new Error("Selected user kit is already ordered");
      }

      return {
        productType: "UserKit",
        doc: userKit,
        unitPrice: toMoney(userKit.totalPrice),
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
      throw new Error("Festival kit not found");
    }

    return {
      productType: "FestivalKit",
      doc: kit,
      unitPrice: toMoney(kit.kitPrice || kit.totalPrice),
    };
  }

  if (resolvedProductType === "DefaultKit") {
    const kit = await DefaultKit.findOne({ _id: productId, status: "active" });
    if (!kit) {
      throw new Error("Default kit not found");
    }

    return {
      productType: "DefaultKit",
      doc: kit,
      unitPrice: toMoney(kit.kitPrice || kit.totalPrice),
    };
  }

  const userKit = await UserKit.findOne({ _id: productId, user: userId });
  if (!userKit) {
    throw new Error("User kit not found");
  }

  if (userKit.status === "ordered") {
    throw new Error("Selected user kit is already ordered");
  }

  return {
    productType: "UserKit",
    doc: userKit,
    unitPrice: toMoney(userKit.totalPrice),
  };
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
  const userKitIds = [];

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

    const { unitPrice, doc, productType } = await getProductDocAndPrice({
      userId,
      productType: providedProductType,
      productId,
    });

    if (productType === "Item" && Number(doc.stock?.quantity || 0) < quantity) {
      throw new Error(`${doc.title} is out of stock for selected quantity`);
    }

    if (productType !== "Item") {
      quantity = 1;
    }

    if (productType === "UserKit") {
      userKitIds.push(doc._id);
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
    userKitIds,
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
      completed: index < currentIndex,
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
    const { items = null, deliveryFee } = req.body;

    const { orderItems, itemTotal } = await resolveCheckoutItems({
      userId,
      directItems: items,
    });

    const finalDeliveryFee = getDeliveryFee(deliveryFee);
    const totalAmount = toMoney(itemTotal + finalDeliveryFee);

    if (totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Order amount must be greater than zero",
      });
    }

    const { keyId, keySecret } = getRazorpayCredentials();
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: `order_${String(userId).slice(-6)}_${Date.now()}`,
      notes: {
        userId: String(userId),
        itemCount: String(orderItems.length),
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
        currency: "INR",
        razorpayOrder,
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
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);

    const { orderItems, itemTotal, source, userKitIds } = await resolveCheckoutItems({
      userId,
      directItems: items,
    });

    const finalDeliveryFee = getDeliveryFee(deliveryFee);
    const totalAmount = toMoney(itemTotal + finalDeliveryFee);

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

    let paymentStatus = "Pending";
    let paymentGateway = null;

    if (normalizedPaymentMethod === "ONLINE") {
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

    const order = await Order.create({
      user: userId,
      items: orderItems,
      totalAmount,
      addressType: finalAddress.addressType || null,
      amountBreakup: {
        itemTotal,
        deliveryFee: finalDeliveryFee,
      },
      paymentMethod: normalizedPaymentMethod,
      paymentStatus,
      paymentGateway,
      razorpayOrderId: razorpayOrderId || null,
      razorpayPaymentId: razorpayPaymentId || null,
      razorpaySignature: razorpaySignature || null,
      address: finalAddress,
    });

    if (source === "cart") {
      await Cart.deleteMany({ user: userId });
    }

    if (userKitIds.length > 0) {
      await UserKit.updateMany(
        {
          _id: { $in: userKitIds },
          user: userId,
          status: "draft",
        },
        {
          $set: {
            status: "ordered",
            paymentStatus: paymentStatus === "Paid" ? "paid" : "pending",
            order: order._id,
          },
        }
      );
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
