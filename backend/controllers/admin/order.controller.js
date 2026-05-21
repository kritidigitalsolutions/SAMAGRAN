import mongoose from "mongoose";
import Order from "../../models/order.model.js";
import User from "../../models/user.model.js";
import Item from "../../models/product.model.js";
import DeliveryBoy from "../../models/deliveryBoy.model.js";

const TRACKING_STEPS = ["Placed", "Confirmed", "Preparing", "Accepted", "Out for Delivery", "Delivered"];
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
  if (normalized === "preparing") return "Preparing";
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
  city: String(input.city || "").trim(),
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

const getAmountBreakupFromItems = (items = [], deliveryFeeInput = 0) => {
  const itemTotal = toMoney(items.reduce((sum, item) => sum + toMoney(item.price) * Number(item.quantity || 1), 0));
  const deliveryFee = toMoney(deliveryFeeInput);
  const totalAmount = toMoney(itemTotal + deliveryFee);

  return {
    itemTotal,
    deliveryFee,
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

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(normalizedLimit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    const populatedOrders = await populateOrders(orders);

    return res.json({
      success: true,
      count: populatedOrders.length,
      data: {
        orders: populatedOrders.map(formatOrderForAdmin),
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
      paymentMethod,
      paymentStatus,
      paymentGateway,
      orderStatus,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (user !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(user)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user id",
        });
      }

      const userExists = await User.exists({ _id: user });
      if (!userExists) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      order.user = user;
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

    const computedBreakup = getAmountBreakupFromItems(
      order.items,
      deliveryFee !== undefined ? deliveryFee : order.amountBreakup?.deliveryFee
    );

    order.amountBreakup = {
      itemTotal: computedBreakup.itemTotal,
      deliveryFee: computedBreakup.deliveryFee,
    };
    order.totalAmount = computedBreakup.totalAmount;

    await order.save();

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
