import mongoose from "mongoose";
import Order from "../../models/order.model.js";
import User from "../../models/user.model.js";
import Item from "../../models/product.model.js";
import DeliveryBoy from "../../models/deliveryBoy.model.js";
import { notifyUsersByIds, notifyVendorsByIds } from "../../utils/notification.service.js";
import { toTitleCase, normalizeCityList } from "../../utils/cityNormalizer.js";
import { applyPanditCommission } from "../order.controller.js";

// const TRACKING_STEPS = ["Placed", "Confirmed", "Preparing", "Accepted", "Out for Delivery", "Delivered"];
const TRACKING_STEPS = ["Placed", "Confirmed", "Accepted", "Out for Delivery", "Delivered"];
const SUPPORTED_PRODUCT_TYPES = ["Item", "FestivalKit", "DefaultKit"];
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

const resolveVendorFilter = (req) => {
  if (req.admin?.role === "vendor") {
    return { vendorId: req.admin.vendorId };
  }

  return {};
};

const toMoney = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed >= 0 ? Number(parsed.toFixed(2)) : 0;
};

const normalizePaymentMethod = (value = "COD") => {
  const normalized = String(value || "COD").trim().toUpperCase();
  return normalized === "ONLINE" ? "ONLINE" : "COD";
};

const normalizePaymentStatus = (value = "Pending") => {
  const normalized = String(value || "Pending").trim().toLowerCase();
  if (normalized === "paid") return "Paid";
  if (normalized === "failed") return "Failed";
  return "Pending";
};

const normalizeOrderStatus = (value = "Placed") => {
  const normalized = String(value || "Placed").trim().toLowerCase();

  if (normalized === "placed") return "Placed";
  if (normalized === "confirmed") return "Confirmed";
  // if (normalized === "preparing") return "Preparing";
  if (normalized === "accepted") return "Accepted";
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

const sanitizeAddress = (input = {}) => ({
  name: String(input.name || "").trim(),
  phone: String(input.phone || "").trim(),
  fullAddress: String(input.fullAddress || input.line1 || "").trim(),
  addressType: normalizeAddressType(input.addressType || input.label || "others"),
  city: toTitleCase(input.city),
  state: String(input.state || "").trim(),
  pincode: String(input.pincode || "").trim(),
});

const normalizeOrderItems = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one item is required");
  }

  return items.map((row) => {
    let productType = String(row.productType || "").trim();
    const product = row.product || row.productId || row.id;
    const quantity = Number(row.quantity || 1);
    const price = toMoney(row.price);

    if (!SUPPORTED_PRODUCT_TYPES.includes(productType)) {
      throw new Error(`Unsupported productType: ${productType || "unknown"}`);
    }

    if (productType === "DefaultKit") {
      productType = "FestivalKit";
    }

    if (!product || !mongoose.Types.ObjectId.isValid(product)) {
      throw new Error("Each item must include a valid product id");
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new Error("Each item must have quantity >= 1");
    }

    if (!Number.isFinite(price) || price < 0) {
      throw new Error("Each item must have a valid price");
    }

    return {
      productType,
      product,
      quantity,
      price,
    };
  });
};

const getAmountBreakupFromItems = (items = [], deliveryFeeInput = 0, codChargeInput = 0) => {
  const itemTotal = toMoney(items.reduce((sum, item) => sum + toMoney(item.price) * Number(item.quantity || 1), 0));
  const deliveryFee = toMoney(deliveryFeeInput);
  const codCharge = toMoney(codChargeInput);
  const totalAmount = toMoney(itemTotal + deliveryFee + codCharge);

  return {
    itemTotal,
    deliveryFee,
    codCharge,
    totalAmount,
  };
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

const getOrderStatusNotification = (status, orderId) => {
  const shortId = String(orderId).slice(-6).toUpperCase();
  switch (String(status).trim()) {
    case "Placed":
      return {
        title: "Order Placed! 🛒",
        body: `Your order #${shortId} has been placed successfully.`,
      };
    case "Confirmed":
      return {
        title: "Order Confirmed! ✅",
        body: `Your order #${shortId} has been confirmed.`,
      };
    // case "Preparing":
    //   return {
    //     title: "Preparing Order! 🍳",
    //     body: `We are preparing your order #${shortId}.`,
    //   };
    case "Accepted":
      return {
        title: "Order Accepted! 👍",
        body: `Your order #${shortId} has been accepted.`,
      };
    case "Out for Delivery":
    case "Out For Delivery":
      return {
        title: "Out for Delivery! 🚚",
        body: `Your order #${shortId} is out for delivery.`,
      };
    case "Delivered":
      return {
        title: "Order Delivered! 🎉",
        body: `Your order #${shortId} has been delivered. Thank you!`,
      };
    case "Cancelled":
      return {
        title: "Order Cancelled! ❌",
        body: `Your order #${shortId} has been cancelled.`,
      };
    default:
      return {
        title: `Order Status: ${status}`,
        body: `Your order #${shortId} is now ${status}.`,
      };
  }
};

const sendAdminOrderNotificationToUser = async ({ userId, orderId, title, body, status, data = {} }) => {
  let finalTitle = title;
  let finalBody = body;

  if (status) {
    const custom = getOrderStatusNotification(status, orderId);
    finalTitle = custom.title;
    finalBody = custom.body;
  }

  return notifyUsersByIds({
    userIds: [userId],
    title: finalTitle,
    body: finalBody,
    data: { orderId: String(orderId), ...data },
  }).catch((error) => {
    console.error("ADMIN USER ORDER NOTIFICATION ERROR:", error?.message || error);
  });
};

const sendAdminOrderNotificationToVendor = async ({ vendorId, orderId, title, body, data = {} }) => {
  if (!vendorId) {
    return null;
  }

  return notifyVendorsByIds({
    vendorIds: [vendorId],
    title,
    body,
    data: { orderId: String(orderId), ...data },
  }).catch((error) => {
    console.error("ADMIN VENDOR ORDER NOTIFICATION ERROR:", error?.message || error);
  });
};

const applyInventoryAdjustment = async (order, nextStatus) => {
  const previousStatus = normalizeOrderStatus(order.orderStatus);

  if (previousStatus === nextStatus) {
    return;
  }

  if (nextStatus === "Delivered" && !order.inventoryAdjusted) {
    const updates = (order.items || [])
      .filter((item) => item.productType === "Item" && item.product)
      .map((item) =>
        Item.updateOne(
          { _id: item.product },
          { $inc: { "stock.quantity": -Math.abs(Number(item.quantity || 1)) } }
        )
      );

    if (updates.length) {
      await Promise.all(updates);
    }

    order.inventoryAdjusted = true;
  }

  if (nextStatus === "Cancelled" && order.inventoryAdjusted) {
    const updates = (order.items || [])
      .filter((item) => item.productType === "Item" && item.product)
      .map((item) =>
        Item.updateOne(
          { _id: item.product },
          { $inc: { "stock.quantity": Math.abs(Number(item.quantity || 1)) } }
        )
      );

    if (updates.length) {
      await Promise.all(updates);
    }

    order.inventoryAdjusted = false;
  }
};

const formatOrderForAdmin = (order) => ({
  ...order,
  itemCount: Array.isArray(order.items) ? order.items.length : 0,
  tracking: buildTrackingPayload(order),
});

const populateOrders = async (orders) => {
  return Order.populate(orders, [
    { path: "user", select: "name email phone" },
    { path: "deliveryBoy", select: "fullName phone status" },
    { path: "vendorId", select: "name businessName email phone address" },
    ORDER_ITEMS_POPULATE,
  ]);
};

export const getAllOrdersForAdmin = async (req, res) => {
  try {
    const {
      search = "",
      status = "all",
      paymentStatus = "all",
      paymentMethod = "all",
      userId = "",
      city = "",
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {
      ...resolveVendorFilter(req),
    };

    if (status !== "all") {
      filter.orderStatus = normalizeOrderStatus(status);
    }

    if (paymentStatus !== "all") {
      filter.paymentStatus = normalizePaymentStatus(paymentStatus);
    }

    if (paymentMethod !== "all") {
      filter.paymentMethod = normalizePaymentMethod(paymentMethod);
    }

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filter.user = userId;
    }

    if (String(city || "").trim()) {
      filter["address.city"] = { $regex: `^${String(city).trim()}$`, $options: "i" };
    }

    if (String(search || "").trim()) {
      const regex = { $regex: String(search).trim(), $options: "i" };
      filter.$or = [
        { "address.name": regex },
        { "address.phone": regex },
        { "address.fullAddress": regex },
        { "address.city": regex },
        { "address.state": regex },
        { razorpayOrderId: regex },
        { razorpayPaymentId: regex },
      ];

      if (mongoose.Types.ObjectId.isValid(search)) {
        filter.$or.push({ _id: search });
      }
    }

    const normalizedPage = Math.max(1, Number(page) || 1);
    const normalizedLimit = Math.max(1, Number(limit) || 20);
    const skip = (normalizedPage - 1) * normalizedLimit;

    const distinctFilter = { ...resolveVendorFilter(req) };

    const [orders, total, rawCities] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(normalizedLimit)
        .lean(),
      Order.countDocuments(filter),
      Order.distinct("address.city", distinctFilter)
    ]);

    const cities = normalizeCityList(rawCities);

    const populatedOrders = await populateOrders(orders);

    return res.json({
      success: true,
      count: populatedOrders.length,
      data: {
        orders: populatedOrders.map(formatOrderForAdmin),
        cities: cities.filter(Boolean),
        pagination: {
          total,
          currentPage: normalizedPage,
          totalPages: Math.ceil(total / normalizedLimit),
          limit: normalizedLimit,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load orders",
    });
  }
};

export const getOrderByIdForAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const order = await Order.findOne({ _id: id, ...resolveVendorFilter(req) })
      .populate("user", "name email phone")
      .populate("vendorId")
      .populate("deliveryBoy", "fullName phone status")
      .populate(ORDER_ITEMS_POPULATE)
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.json({
      success: true,
      data: {
        order: formatOrderForAdmin(order),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load order",
    });
  }
};

export const updateOrderByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const order = await Order.findOne({ _id: id, ...resolveVendorFilter(req) });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const {
      user,
      items,
      address,
      deliveryFee,
      codCharge,
      paymentMethod,
      paymentStatus,
      paymentGateway,
      orderStatus,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    const previousOrderStatus = order.orderStatus;
    const previousPaymentStatus = order.paymentStatus;

    if (user !== undefined) {
      const userIdToSave = user && typeof user === "object" ? (user._id || user.id) : user;
      if (!mongoose.Types.ObjectId.isValid(userIdToSave)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user id",
        });
      }

      const userExists = await User.exists({ _id: userIdToSave });
      if (!userExists) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      order.user = userIdToSave;
    }

    if (Array.isArray(items)) {
      order.items = normalizeOrderItems(items);
    }

    if (address && typeof address === "object") {
      order.address = {
        ...order.address,
        ...sanitizeAddress({
          ...order.address,
          ...address,
        }),
      };
      order.addressType = order.address?.addressType || null;
    }

    if (paymentMethod !== undefined) {
      order.paymentMethod = normalizePaymentMethod(paymentMethod);
    }

    if (paymentStatus !== undefined) {
      order.paymentStatus = normalizePaymentStatus(paymentStatus);
    }

    if (paymentGateway !== undefined) {
      order.paymentGateway = paymentGateway ? String(paymentGateway).trim() : null;
    }

    if (orderStatus !== undefined) {
      const nextStatus = normalizeOrderStatus(orderStatus);
      await applyInventoryAdjustment(order, nextStatus);
      order.orderStatus = nextStatus;
    }

    if (razorpayOrderId !== undefined) {
      order.razorpayOrderId = razorpayOrderId ? String(razorpayOrderId).trim() : null;
    }

    if (razorpayPaymentId !== undefined) {
      order.razorpayPaymentId = razorpayPaymentId ? String(razorpayPaymentId).trim() : null;
    }

    if (razorpaySignature !== undefined) {
      order.razorpaySignature = razorpaySignature ? String(razorpaySignature).trim() : null;
    }

    if (codCharge !== undefined) {
      order.codCharge = Number(codCharge || 0);
    }

    const computedBreakup = getAmountBreakupFromItems(
      order.items,
      deliveryFee !== undefined ? deliveryFee : order.amountBreakup?.deliveryFee,
      codCharge !== undefined ? codCharge : (order.amountBreakup?.codCharge ?? order.codCharge ?? 0)
    );

    order.amountBreakup = {
      ...(order.amountBreakup || {}),
      itemTotal: computedBreakup.itemTotal,
      deliveryFee: computedBreakup.deliveryFee,
      codCharge: computedBreakup.codCharge,
    };
    order.codCharge = computedBreakup.codCharge;
    order.totalAmount = computedBreakup.totalAmount;

    await order.save();

    const nextOrderStatus = order.orderStatus;
    const nextPaymentStatus = order.paymentStatus;
    const effectiveUserId = String(order.user?._id || order.user);
    const effectiveVendorId = order.vendorId ? String(order.vendorId?._id || order.vendorId) : null;

    if (nextOrderStatus !== previousOrderStatus) {
      void sendAdminOrderNotificationToUser({
        userId: effectiveUserId,
        orderId: order._id,
        status: nextOrderStatus,
        data: {
          eventType: "order.status.updated",
          orderStatus: nextOrderStatus,
        },
      });

      // Credit Pandit commission when order is delivered
      if (nextOrderStatus === "Delivered") {
        try {
          await applyPanditCommission({
            panditId: order.pandit?._id || order.pandit || null,
            orderId: order._id,
            baseAmount: order.amountBreakup?.itemTotal || order.totalAmount || 0,
          });
        } catch (commErr) {
          console.error("Error applying pandit commission on admin order update:", commErr.message);
        }
      }
    }

    if (nextPaymentStatus !== previousPaymentStatus && nextPaymentStatus === "Paid") {
      void sendAdminOrderNotificationToUser({
        userId: effectiveUserId,
        orderId: order._id,
        title: "Payment received",
        body: `Payment for order #${String(order._id).slice(-6).toUpperCase()} has been confirmed.`,
        data: {
          eventType: "payment.success",
          paymentStatus: nextPaymentStatus,
        },
      });

      if (effectiveVendorId) {
        void sendAdminOrderNotificationToVendor({
          vendorId: effectiveVendorId,
          orderId: order._id,
          title: "Payment success",
          body: `Payment for order #${String(order._id).slice(-6).toUpperCase()} has been confirmed.`,
          data: {
            eventType: "payment.success",
            paymentStatus: nextPaymentStatus,
          },
        });
      }
    }

    const populatedOrder = await Order.findById(order._id)
      .populate("user", "name email phone")
      .populate("deliveryBoy", "fullName phone status")
      .populate(ORDER_ITEMS_POPULATE)
      .lean();

    return res.json({
      success: true,
      message: "Order updated successfully",
      data: {
        order: formatOrderForAdmin(populatedOrder),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to update order",
    });
  }
};

export const updateOrderTrackingByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    if (orderStatus === undefined) {
      return res.status(400).json({
        success: false,
        message: "orderStatus is required",
      });
    }

    const order = await Order.findOne({ _id: id, ...resolveVendorFilter(req) })
      .populate("user", "name email phone")
      .populate("deliveryBoy", "fullName phone status")
      .populate(ORDER_ITEMS_POPULATE);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const nextStatus = normalizeOrderStatus(orderStatus);
    await applyInventoryAdjustment(order, nextStatus);
    order.orderStatus = nextStatus;
    await order.save();

    const effectiveUserId = String(order.user?._id || order.user);
    const effectiveVendorId = order.vendorId ? String(order.vendorId?._id || order.vendorId) : null;

    // Credit Pandit commission when order is delivered
    if (nextStatus === "Delivered") {
      try {
        await applyPanditCommission({
          panditId: order.pandit?._id || order.pandit || null,
          orderId: order._id,
          baseAmount: order.amountBreakup?.itemTotal || order.totalAmount || 0,
        });
      } catch (commErr) {
        console.error("Error applying pandit commission on admin order status tracking update:", commErr.message);
      }
    }

    void sendAdminOrderNotificationToUser({
      userId: effectiveUserId,
      orderId: order._id,
      status: nextStatus,
      data: {
        eventType: "order.status.updated",
        orderStatus: nextStatus,
      },
    });

    const orderObject = order.toObject();

    return res.json({
      success: true,
      message: "Order tracking updated successfully",
      data: {
        order: formatOrderForAdmin(orderObject),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to update order tracking",
    });
  }
};

export const deleteOrderByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const order = await Order.findOneAndDelete({ _id: id, ...resolveVendorFilter(req) });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to delete order",
    });
  }
};

export const assignDeliveryBoyToOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryBoyId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    if (!mongoose.Types.ObjectId.isValid(deliveryBoyId)) {
      return res.status(400).json({ success: false, message: "Invalid delivery boy id" });
    }

    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    if (!deliveryBoy) {
      return res.status(404).json({ success: false, message: "Delivery boy not found" });
    }

    if (deliveryBoy.status !== "active") {
      return res.status(400).json({ success: false, message: "Delivery boy is inactive" });
    }

    const order = await Order.findOne({ _id: id, ...resolveVendorFilter(req) });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    order.deliveryBoy = deliveryBoy._id;
    order.deliveryAssignedAt = new Date();
    order.deliveryAssignedBy = req.admin?._id || null;
    await order.save();

    // Notify User that delivery boy is assigned
    const shortId = String(order._id).slice(-6).toUpperCase();
    void sendAdminOrderNotificationToUser({
      userId: String(order.user),
      orderId: order._id,
      title: "Delivery Partner Assigned 🛵",
      body: `${deliveryBoy.fullName} has been assigned to deliver your order #${shortId}.`,
      data: {
        eventType: "order.delivery_boy.assigned",
        deliveryBoyName: deliveryBoy.fullName,
        deliveryBoyPhone: deliveryBoy.phone,
      },
    });

    const populatedOrder = await Order.findById(order._id)
      .populate("user", "name email phone")
      .populate("deliveryBoy", "fullName phone status")
      .populate(ORDER_ITEMS_POPULATE)
      .lean();

    return res.json({
      success: true,
      message: "Delivery boy assigned",
      data: {
        order: formatOrderForAdmin(populatedOrder),
        deliveryBoy: {
          id: deliveryBoy._id,
          fullName: deliveryBoy.fullName,
          phone: deliveryBoy.phone,
          status: deliveryBoy.status,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to assign delivery boy",
    });
  }
};

export const updateOrderInvoiceDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { invoiceDetails } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const order = await Order.findOne({ _id: id, ...resolveVendorFilter(req) });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.invoiceDetails = {
      sellerName: String(invoiceDetails?.sellerName || "").trim(),
      sellerAddress: String(invoiceDetails?.sellerAddress || "").trim(),
      sellerGstin: String(invoiceDetails?.sellerGstin || "").trim(),
      sellerFssai: String(invoiceDetails?.sellerFssai || "").trim(),
      sellerCin: String(invoiceDetails?.sellerCin || "").trim(),
      sellerPan: String(invoiceDetails?.sellerPan || "").trim(),
      sellerEmail: String(invoiceDetails?.sellerEmail || "").trim(),
      sellerPhone: String(invoiceDetails?.sellerPhone || "").trim(),
      customerName: String(invoiceDetails?.customerName || "").trim(),
      customerAddress: String(invoiceDetails?.customerAddress || "").trim(),
      customerPhone: String(invoiceDetails?.customerPhone || "").trim(),
      customerEmail: String(invoiceDetails?.customerEmail || "").trim(),
      invoiceNumber: String(invoiceDetails?.invoiceNumber || "").trim(),
      invoiceDate: String(invoiceDetails?.invoiceDate || "").trim(),
      placeOfSupply: String(invoiceDetails?.placeOfSupply || "").trim(),
      paymentMode: String(invoiceDetails?.paymentMode || "").trim(),
      companyName: String(invoiceDetails?.companyName || "").trim(),
      companyAddress: String(invoiceDetails?.companyAddress || "").trim(),
      companyCin: String(invoiceDetails?.companyCin || "").trim(),
      companyPan: String(invoiceDetails?.companyPan || "").trim(),
      companyFssai: String(invoiceDetails?.companyFssai || "").trim(),
      companyEmail: String(invoiceDetails?.companyEmail || "").trim(),
      companyPhone: String(invoiceDetails?.companyPhone || "").trim(),
      authorizedSignatory: String(invoiceDetails?.authorizedSignatory || "").trim(),
      hideCompanyDetails: Boolean(invoiceDetails?.hideCompanyDetails),
    };

    await order.save();

    return res.json({
      success: true,
      message: "Invoice details updated successfully",
      data: {
        invoiceDetails: order.invoiceDetails,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to update invoice details",
    });
  }
};
