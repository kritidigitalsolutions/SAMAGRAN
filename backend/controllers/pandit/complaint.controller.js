import PanditComplaint from "../../models/panditComplaint.model.js";
import PanditBooking from "../../models/panditBooking.model.js";
import mongoose from "mongoose";
import { notifyAdmins } from "../../utils/notification.service.js";

// Create a new Complaint from Pandit side
export const createPanditComplaint = async (req, res) => {
  try {
    const panditId = req.pandit._id;
    const { bookingId, issue, details } = req.body || {};

    if (!bookingId || !issue || !details) {
      return res.status(400).json({
        success: false,
        message: "bookingId, issue and details are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking id",
      });
    }

    // Check if booking exists and belongs to the pandit
    const booking = await PanditBooking.findOne({ _id: bookingId, pandit: panditId });
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or does not belong to you",
      });
    }

    // Create complaint record
    const complaint = await PanditComplaint.create({
      pandit: panditId,
      booking: bookingId,
      issue: String(issue).trim(),
      details: String(details).trim(),
    });

    // Notify admins about the new pandit complaint
    void notifyAdmins({
      title: "New Pandit Complaint",
      body: `Pandit ${req.pandit.fullName || "Pandit"} raised complaint for Booking #${String(booking._id).slice(-6).toUpperCase()}: "${String(issue).trim()}"`,
      data: {
        eventType: "pandit_complaint.created",
        complaintId: String(complaint._id),
        bookingId: String(booking._id),
        panditId: String(panditId),
      },
    }).catch((err) => console.error("Pandit complaint notification error:", err.message));

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

// Get all complaints of logged-in pandit
export const getMyPanditComplaints = async (req, res) => {
  try {
    const complaints = await PanditComplaint.find({ pandit: req.pandit._id })
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
      message: error.message || "Failed to load complaints",
    });
  }
};

// Get pandit complaint for a specific booking
export const getComplaintByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking id",
      });
    }

    const complaint = await PanditComplaint.findOne({ pandit: req.pandit._id, booking: bookingId })
      .populate("booking", "dakshinaAmount bookingAmount bookingStatus bookingDate createdAt")
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
