import crypto from "crypto";
import Razorpay from "razorpay";
import mongoose from "mongoose";
import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";
import Item from "../models/product.model.js";
import FestivalKit from "../models/festivalKit.model.js";
import DefaultKit from "../models/defaultKit.model.js";
import UserKit from "../models/userKit.model.js";

const SUPPORTED_PRODUCT_TYPES = ["Item", "FestivalKit", "DefaultKit", "UserKit"];

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

const getRazorpayCredentials = () => {
  const keyId = String(process.env.RAZORPAY_KEY_ID || process.env.key_id || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || process.env.key_secret || "").trim();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are not configured in environment");
  }

  return { keyId, keySecret };
};

const getProductDocAndPrice = async ({ userId, productType, productId }) => {
  if (!SUPPORTED_PRODUCT_TYPES.includes(productType)) {
    throw new Error(`Unsupported productType: ${productType}`);
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product id");
  }

  if (productType === "Item") {
    const product = await Item.findOne({ _id: productId, status: "active" });
    if (!product) {
      throw new Error("Item not found");
    }

    return {
      doc: product,
      unitPrice: toMoney(product.pricing?.price),
    };
  }

  if (productType === "FestivalKit") {
    const kit = await FestivalKit.findById(productId);
    if (!kit) {
      throw new Error("Festival kit not found");
    }

    return {
      doc: kit,
      unitPrice: toMoney(kit.kitPrice || kit.totalPrice),
    };
  }

  if (productType === "DefaultKit") {
    const kit = await DefaultKit.findOne({ _id: productId, status: "active" });
    if (!kit) {
      throw new Error("Default kit not found");
    }

    return {
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
    const productType = String(row.productType || "").trim();
    const productId = row.productId || row.product;
    let quantity = Number(row.quantity || 1);

    if (!Number.isFinite(quantity) || quantity < 1) {
      quantity = 1;
    }

    const { unitPrice, doc } = await getProductDocAndPrice({
      userId,
      productType,
      productId,
    });

    if (productType === "Item" && Number(doc.stock?.quantity || 0) < quantity) {
      throw new Error(`${doc.title} is out of stock for selected quantity`);
    }

    if (productType === "UserKit") {
      quantity = 1;
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

const buildAddress = (req, addressInput = {}) => {
  const address = {
    name: String(addressInput?.name || req.user?.name || "").trim(),
    phone: String(addressInput?.phone || req.user?.phone || "").trim(),
    fullAddress: String(
      addressInput?.fullAddress || addressInput?.line1 || req.user?.address || ""
    ).trim(),
    city: String(addressInput?.city || "").trim(),
    state: String(addressInput?.state || "").trim(),
    pincode: String(addressInput?.pincode || "").trim(),
  };

  if (!address.name || !address.phone || !address.fullAddress) {
    throw new Error("Delivery address is incomplete");
  }

  return address;
};

const verifyRazorpaySignature = ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  const { keySecret } = getRazorpayCredentials();
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  return expectedSignature === razorpaySignature;
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
      address,
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
    const finalAddress = buildAddress(req, address);

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

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: {
        order,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};