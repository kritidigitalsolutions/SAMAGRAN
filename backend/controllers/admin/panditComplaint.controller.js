import PanditComplaint from "../../models/panditComplaint.model.js";
import mongoose from "mongoose";
import { notifyPanditById } from "../../utils/notification.service.js";

// Get all Pandit complaints for Admin list view
export const getPanditComplaints = async (req, res) => {
  try {
    const complaints = await PanditComplaint.find({})
      .populate("pandit", "fullName email phone")
      .populate("booking", "dakshinaAmount bookingAmount bookingStatus bookingDate createdAt")
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

// Respond (Resolve/Reject) to a Pandit complaint
export const respondToPanditComplaint = async (req, res) => {
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

    const complaint = await PanditComplaint.findById(complaintId).populate("booking");
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
      { path: "pandit", select: "fullName email phone" },
      { path: "booking" }
    ]);

    // Notify the pandit about the response/resolution
    void notifyPanditById({
      panditId: complaint.pandit?._id || complaint.pandit,
      title: `Complaint ${status}`,
      body: `Your complaint for Booking #${String(complaint.booking?._id || '').slice(-6).toUpperCase()} has been ${status.toLowerCase()}.${adminResponse ? ` Admin Response: "${adminResponse}"` : ""}`,
      data: {
        eventType: "pandit_complaint.status_changed",
        complaintId: String(complaint._id),
        status,
      },
    }).catch((err) => console.error("Pandit response notification error:", err.message));

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
