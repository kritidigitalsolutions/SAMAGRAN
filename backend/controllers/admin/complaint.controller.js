import Complaint from "../../models/complaint.model.js";
import Order from "../../models/order.model.js";
import mongoose from "mongoose";
import { notifyAdmins, notifyUsersByIds } from "../../utils/notification.service.js";

// ================= USER OPERATIONS =================

// Create a new Complaint/Refund request
export const createComplaint = async (req, res) => {
  try {
    const userId = req.user._id;
    const { orderId, issue, details } = req.body || {};

    if (!orderId || !issue || !details) {
      return res.status(400).json({
        success: false,
        message: "orderId, issue and details are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    // Check if order exists and belongs to the user
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or does not belong to you",
      });
    }

    // Create complaint record
    const complaint = await Complaint.create({
      user: userId,
      order: orderId,
      issue: String(issue).trim(),
      details: String(details).trim(),
    });

    // Notify admins about the new complaint
    void notifyAdmins({
      title: "New Complaint/Refund Request",
      body: `Complaint raised for Order #${String(order._id).slice(-6).toUpperCase()}: "${String(issue).trim()}"`,
      data: {
        eventType: "complaint.created",
        complaintId: String(complaint._id),
        orderId: String(order._id),
        userId: String(userId),
      },
    }).catch((err) => console.error("Complaint notification error:", err.message));

    return res.status(201).json({
      success: true,
      message: "Complaint raised successfully",
      data: complaint,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit complaint",
    });
  }
};

// Get all complaints of logged-in user
export const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ user: req.user._id })
      .populate("order", "totalAmount orderStatus paymentStatus createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: complaints,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load complaints",
    });
  }
};

// Get user complaint for a specific order
export const getComplaintByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const complaint = await Complaint.findOne({ user: req.user._id, order: orderId })
      .populate("order", "totalAmount orderStatus paymentStatus createdAt")
      .lean();

    return res.json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch complaint status",
    });
  }
};

// ================= ADMIN OPERATIONS =================

// Get all complaints for Admin list view
export const getComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({})
      .populate("user", "name email phone")
      .populate("order", "totalAmount orderStatus paymentStatus payableAmount walletUsed createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: complaints,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch complaints list",
    });
  }
};

// Respond (Resolve/Reject) to a complaint
export const respondToComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { status, adminResponse = "" } = req.body || {};

    if (!status || !["Resolved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'Resolved' or 'Rejected'",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(complaintId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint id",
      });
    }

    const complaint = await Complaint.findById(complaintId).populate("order");
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    complaint.status = status;
    complaint.adminResponse = String(adminResponse).trim();
    await complaint.save();

    await complaint.populate([
      { path: "user", select: "name email phone" },
      { path: "order" }
    ]);

    // Notify the user about the response/resolution
    void notifyUsersByIds({
      userIds: [complaint.user?._id || complaint.user],
      title: `Complaint ${status}`,
      body: `Your complaint for Order #${String(complaint.order?._id || '').slice(-6).toUpperCase()} has been ${status.toLowerCase()}.${adminResponse ? ` Admin Response: "${adminResponse}"` : ""}`,
      data: {
        eventType: "complaint.status_changed",
        complaintId: String(complaint._id),
        status,
      },
    }).catch((err) => console.error("User response notification error:", err.message));

    return res.json({
      success: true,
      message: `Complaint marked as ${status} successfully`,
      data: complaint,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to respond to complaint",
    });
  }
};
