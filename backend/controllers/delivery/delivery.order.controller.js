import mongoose from "mongoose";
import Order from "../../models/order.model.js";

const DELIVERY_STATUSES = [
  "Placed",
  "Confirmed",
  "Preparing",
  "Accepted",
  "Out for Delivery",
  "Delivered",
];
const ORDER_ITEMS_POPULATE = {
  path: "items.product",
  strictPopulate: false,
  populate: [
    {
      path: "items.product",
      strictPopulate: false,
    },
  ],
};

const normalizeStatus = (value = "Placed") => {
  const normalized = String(value || "Placed").trim().toLowerCase();
  if (normalized === "placed") return "Placed";
  if (normalized === "confirmed") return "Confirmed";
  if (normalized === "preparing") return "Preparing";
  if (normalized === "accepted") return "Accepted";
  if (normalized === "out for delivery" || normalized === "out_for_delivery") return "Out for Delivery";
  if (normalized === "delivered") return "Delivered";
  return "Placed";
};

const isAllowedDeliveryTransition = (currentStatus, nextStatus) => {
  if (!DELIVERY_STATUSES.includes(currentStatus) || !DELIVERY_STATUSES.includes(nextStatus)) {
    return false;
  }

  if (nextStatus === currentStatus) {
    return true;
  }

  if (nextStatus === "Accepted") {
    return ["Placed", "Confirmed", "Preparing"].includes(currentStatus);
  }

  if (nextStatus === "Out for Delivery") {
    return currentStatus === "Accepted";
  }

  if (nextStatus === "Delivered") {
    return currentStatus === "Out for Delivery";
  }

  return false;
};

export const getAssignedOrders = async (req, res) => {
  try {
    const deliveryBoyId = req.deliveryBoy?._id;

    const orders = await Order.find({ deliveryBoy: deliveryBoyId })
      .sort({ createdAt: -1 })
      .populate("user", "name phone")
      .populate(ORDER_ITEMS_POPULATE)
      .lean();

    return res.json({
      success: true,
      data: { orders },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Unable to load delivery orders" });
  }
};

export const updateDeliveryOrderStatus = async (req, res) => {
  try {
    const deliveryBoyId = req.deliveryBoy?._id;
    const { id } = req.params;
    const { orderStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    const order = await Order.findOne({ _id: id, deliveryBoy: deliveryBoyId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const nextStatus = normalizeStatus(orderStatus);
    const currentStatus = normalizeStatus(order.orderStatus || "Placed");

    if (!isAllowedDeliveryTransition(currentStatus, nextStatus)) {
      return res.status(400).json({ success: false, message: "Status update not allowed" });
    }

    order.orderStatus = nextStatus;
    await order.save();

    const updated = await Order.findById(order._id)
      .populate("user", "name phone")
      .populate(ORDER_ITEMS_POPULATE)
      .lean();

    return res.json({
      success: true,
      message: "Order status updated",
      data: { order: updated },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Unable to update order status" });
  }
};
