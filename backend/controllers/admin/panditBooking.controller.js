import PanditBooking from "../../models/panditBooking.model.js";
import mongoose from "mongoose";
import { ensureZoomMeetingForBooking, autoCancelExpiredBookings } from "../../controllers/panditBooking.controller.js";
import { createMeeting } from "../../utils/zoom.service.js";
import { normalizeCityList } from "../../utils/cityNormalizer.js";

export const getAllPanditBookingsForAdmin = async (req, res) => {
  try {
    await autoCancelExpiredBookings();
    const { search = "", status = "all", city = "", pincode = "" } = req.query;

    const filter = {};

    if (status !== "all") {
      filter.bookingStatus = status;
    }

    if (String(city || "").trim()) {
      filter["address.city"] = { $regex: `^${String(city).trim()}$`, $options: "i" };
    }

    if (String(pincode || "").trim()) {
      filter["address.pincode"] = { $regex: `^${String(pincode).trim()}$`, $options: "i" };
    }

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      filter.$or = [
        { "ritual.name": regex },
        { "address.city": regex },
        { "address.state": regex },
        { bookingDate: regex },
      ];
    }

    const [bookings, rawCities, pincodes] = await Promise.all([
      PanditBooking.find(filter)
        .populate("pandit", "fullName phone status profileImage address yearsOfExperience templeAssociated")
        .populate("user", "name phone email")
        .populate("temple")
        .populate("recommendedKit")
        .sort({ createdAt: -1 }),
      PanditBooking.distinct("address.city"),
      PanditBooking.distinct("address.pincode")
    ]);

    const cities = normalizeCityList(rawCities);

    await Promise.all(
      bookings.map(async (booking) => {
        const payment = booking?.payment || {};
        const walletAmount = Number(payment.walletAmount || 0);
        const amountDue = Number(payment.amountDue || 0);
        const bookingAmount = Number(booking.bookingAmount || booking.dakshinaAmount || 0);
        const isWalletPaid =
          String(payment.method || "").toUpperCase() === "WALLET" ||
          (amountDue <= 0 && walletAmount >= bookingAmount && bookingAmount > 0);

        if (isWalletPaid && String(payment.status || "").toLowerCase() !== "paid") {
          booking.payment.status = "paid";
          booking.payment.gateway = booking.payment.gateway || "wallet";
          booking.payment.paidAt = booking.payment.paidAt || new Date();
          await booking.save();
        }
      })
    );

    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
      cities: cities.filter(Boolean),
      pincodes: pincodes.filter(Boolean),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Unable to load pandit bookings",
    });
  }
};

export const updatePanditBookingByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking id",
      });
    }

    const booking = await PanditBooking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const {
      bookingStatus,
      bookingDate,
      timeSlot,
      dakshinaAmount,
      bookingAmount,
      notes,
      payment,
      bookingMode,
      address,
    } = req.body;

    if (bookingStatus !== undefined) {
      booking.bookingStatus = String(bookingStatus || "").trim() || booking.bookingStatus;
    }

    if (bookingDate !== undefined) {
      booking.bookingDate = String(bookingDate || "").trim();
    }

    if (timeSlot && typeof timeSlot === "object") {
      booking.timeSlot = {
        ...booking.timeSlot,
        ...timeSlot,
      };
    }

    const targetAmount = bookingAmount !== undefined ? bookingAmount : dakshinaAmount;
    if (targetAmount !== undefined) {
      booking.dakshinaAmount = Number(targetAmount || 0);
      booking.bookingAmount = Number(targetAmount || 0);
    }

    if (notes !== undefined) {
      booking.notes = String(notes || "").trim();
    }

    if (bookingMode !== undefined) {
      booking.bookingMode = String(bookingMode || "").trim() || booking.bookingMode;
    }

    if (payment && typeof payment === "object") {
      booking.payment = {
        ...booking.payment,
        ...payment,
      };
    }

    if (address && typeof address === "object") {
      booking.address = {
        ...booking.address,
        ...address,
      };
    }

    await booking.save();

    const populated = await PanditBooking.findById(booking._id)
      .populate("pandit", "fullName phone status profileImage address yearsOfExperience templeAssociated")
      .populate("user", "name phone email")
      .populate("temple")
      .populate("recommendedKit");

    return res.json({
      success: true,
      message: "Booking updated successfully",
      data: populated,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to update booking",
    });
  }
};

export const deletePanditBookingByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking id",
      });
    }

    const booking = await PanditBooking.findByIdAndDelete(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    return res.json({
      success: true,
      message: "Booking deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to delete booking",
    });
  }
};

export const createZoomMeetingForBookingByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking id" });
    }

    const booking = await PanditBooking.findById(id)
      .populate("user", "fcmToken email")
      .populate("pandit", "fcmToken");

    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    let zoom;
    try {
      zoom = await ensureZoomMeetingForBooking(booking);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Unable to create Zoom meeting" });
    }

    if (!zoom) {
      return res.status(500).json({ success: false, message: "Unable to create Zoom meeting" });
    }

    const refreshed = await PanditBooking.findById(id)
      .populate("user", "fcmToken email")
      .populate("pandit", "fcmToken");

    return res.json({ success: true, message: "Zoom meeting created", data: refreshed });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Unable to create zoom meeting" });
  }
};

export const createZoomTestMeeting = async (req, res) => {
  try {
    const {
      topic = "Zoom Test Meeting",
      startTime,
      durationMinutes = 30,
      hostEmail = "",
      timezone = "Asia/Kolkata",
    } = req.body || {};

    if (!startTime) {
      return res.status(400).json({
        success: false,
        message: "startTime is required (ISO string or Date parseable)",
      });
    }

    const parsedStart = new Date(startTime);
    if (Number.isNaN(parsedStart.getTime())) {
      return res.status(400).json({
        success: false,
        message: "startTime is invalid. Use ISO format like 2026-05-30T10:00:00+05:30",
      });
    }

    const meeting = await createMeeting({
      topic,
      startTime: parsedStart,
      durationMinutes: Number(durationMinutes) || 30,
      hostEmail,
      timezone,
    });

    return res.json({
      success: true,
      message: "Zoom test meeting created",
      data: meeting,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to create Zoom test meeting",
    });
  }
};
