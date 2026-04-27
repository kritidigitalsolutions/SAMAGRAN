import PanditBooking from "../../models/panditBooking.model.js";
import mongoose from "mongoose";

export const getAllPanditBookingsForAdmin = async (req, res) => {
  try {
    const { search = "", status = "all" } = req.query;

    const filter = {};

    if (status !== "all") {
      filter.bookingStatus = status;
    }

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      filter.$or = [
        { "ritual.name": regex },
        { "templeSnapshot.name": regex },
        { "address.city": regex },
        { "address.state": regex },
        { bookingDate: regex },
      ];
    }

    const bookings = await PanditBooking.find(filter)
      .populate("pandit", "fullName phone")
      .populate("ritualRef", "title description image durationHours status")
      .populate("temple", "name image address")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
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
      dateAndTime,
      dakshinaAmount,
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

    if (dateAndTime && typeof dateAndTime === "object") {
      booking.dateAndTime = {
        ...booking.dateAndTime,
        ...dateAndTime,
      };
    }

    if (dakshinaAmount !== undefined) {
      booking.dakshinaAmount = Number(dakshinaAmount || 0);
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
      .populate("pandit", "fullName phone")
      .populate("ritualRef", "title description image durationHours status")
      .populate("temple", "name image address")
      .populate("user", "name phone email");

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
