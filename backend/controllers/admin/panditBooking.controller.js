import PanditBooking from "../../models/panditBooking.model.js";

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
        { "address.city": regex },
        { "address.state": regex },
        { bookingDate: regex },
      ];
    }

    const bookings = await PanditBooking.find(filter)
      .populate("pandit", "fullName phone")
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
