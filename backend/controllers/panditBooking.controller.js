import Pandit from "../models/pandit.model.js";
import PanditBooking from "../models/panditBooking.model.js";
import DefaultKit from "../models/defaultKit.model.js";
import Ritual from "../models/ritual.model.js";
import mongoose from "mongoose";

const STATIC_SLOT_TEMPLATE = [
  { label: "6:00 AM - 8:00 AM", startTime: "06:00", endTime: "08:00" },
  { label: "10:00 AM - 12:00 PM", startTime: "10:00", endTime: "12:00" },
  { label: "12:00 PM - 2:00 PM", startTime: "12:00", endTime: "14:00" },
  { label: "6:00 PM - 8:00 PM", startTime: "18:00", endTime: "20:00" },
];

const modeMap = {
  homeVisit: "homeVisit",
  onlinePooja: "onlinePooja",
  templeRitual: "atTemple",
};

const toDateKey = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getNextDateKeys = (days = 7) => {
  const result = [];
  const now = new Date();

  for (let i = 0; i < days; i += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);
    result.push(toDateKey(date));
  }

  return result;
};

const buildPanditAvailableFor = (pandit) => {
  const availableFor = [];

  if (pandit?.serviceTypes?.homeVisit) availableFor.push("Home Puja");
  if (pandit?.serviceTypes?.onlinePooja) availableFor.push("Online Puja");
  if (pandit?.serviceTypes?.atTemple) availableFor.push("Temple Ritual");
  if (pandit?.serviceTypes?.travelForSpecialPoojas) availableFor.push("Travel for Special Pooja");

  return availableFor;
};

const buildRitualDescription = (ritualName) => `Book ${ritualName} with trusted pandits.`;

const buildPanditFilter = ({ ritual, search, city, state, mode }) => {
  const filter = {
    isVerified: true,
    status: "active",
  };

  if (ritual?.trim()) {
    filter.poojaOfferings = {
      $elemMatch: {
        isSelected: true,
        name: { $regex: ritual.trim(), $options: "i" },
      },
    };
  }

  if (mode && modeMap[mode]) {
    filter[`serviceTypes.${modeMap[mode]}`] = true;
  }

  if (city?.trim() || state?.trim()) {
    filter.$and = filter.$and || [];

    if (city?.trim()) {
      const cityRegex = { $regex: city.trim(), $options: "i" };
      filter.$and.push({
        $or: [
          { "address.city": cityRegex },
          { "serviceTypes.detectedLocation.city": cityRegex },
        ],
      });
    }

    if (state?.trim()) {
      const stateRegex = { $regex: state.trim(), $options: "i" };
      filter.$and.push({
        $or: [
          { "address.state": stateRegex },
          { "serviceTypes.detectedLocation.state": stateRegex },
        ],
      });
    }
  }

  if (search?.trim()) {
    const regex = { $regex: search.trim(), $options: "i" };
    filter.$or = [
      { fullName: regex },
      { templeAssociated: regex },
      { languagesSpoken: regex },
      { "address.city": regex },
      { "address.state": regex },
    ];
  }

  return filter;
};

const mapPanditCard = (pandit) => ({
  _id: pandit._id,
  fullName: pandit.fullName,
  profileImage: pandit.profileImage || "",
  ratingAverage: Number(pandit.ratingAverage || 4.5),
  yearsOfExperience: Number(pandit.yearsOfExperience || 0),
  languagesSpoken: pandit.languagesSpoken || [],
  templeAssociated: pandit.templeAssociated || "",
  bio: pandit.bio || "",
  availableFor: buildPanditAvailableFor(pandit),
  city: pandit.address?.city || pandit.serviceTypes?.detectedLocation?.city || "",
  state: pandit.address?.state || pandit.serviceTypes?.detectedLocation?.state || "",
});

export const getRitualsForBooking = async (req, res) => {
  try {
    const rituals = await Ritual.find({ status: "active" }).sort({ createdAt: -1 });

    const data = rituals.map((ritual) => ({
      _id: ritual._id,
      title: ritual.title,
      name: ritual.title,
      description: ritual.description || buildRitualDescription(ritual.title),
      image: ritual.image || "",
      durationHours: Number(ritual.durationHours || 2),
      travelForSpecialPooja: Boolean(ritual.travelForSpecialPooja),
      standardSamagri: Boolean(ritual.standardSamagri),
      customSamagri: Boolean(ritual.customSamagri),
    }));

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Unable to load rituals",
    });
  }
};

export const getPanditsForBooking = async (req, res) => {
  try {
    const { ritual = "", search = "", city = "", state = "", mode = "" } = req.query;

    const filter = buildPanditFilter({ ritual, search, city, state, mode });

    const pandits = await Pandit.find(filter).sort({ ratingAverage: -1, yearsOfExperience: -1, createdAt: -1 });

    res.json({
      success: true,
      count: pandits.length,
      data: pandits.map(mapPanditCard),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Unable to load pandits",
    });
  }
};

export const getPanditBookingProfile = async (req, res) => {
  try {
    const pandit = await Pandit.findOne({
      _id: req.params.panditId,
      status: "active",
      isVerified: true,
    });

    if (!pandit) {
      return res.status(404).json({
        success: false,
        message: "Pandit not found",
      });
    }

    const { ritual = "" } = req.query;

    const recommendedKit = await DefaultKit.findOne({
      status: "active",
      ...(ritual.trim()
        ? {
            $or: [
              { name: { $regex: ritual.trim(), $options: "i" } },
              { description: { $regex: ritual.trim(), $options: "i" } },
            ],
          }
        : {}),
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        ...mapPanditCard(pandit),
        poojaOfferings: pandit.poojaOfferings || [],
        recommendedKit: recommendedKit
          ? {
              _id: recommendedKit._id,
              name: recommendedKit.name,
              image: recommendedKit.image,
              kitPrice: recommendedKit.kitPrice,
              description: recommendedKit.description,
            }
          : null,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Unable to load pandit profile",
    });
  }
};

export const getPanditAvailableSlots = async (req, res) => {
  try {
    const { panditId = "", date = "", days = 7 } = req.query;

    const dateKeys = date ? [date] : getNextDateKeys(Number(days) || 7);

    let bookedSlotsMap = new Map();

    if (panditId) {
      const bookings = await PanditBooking.find({
        pandit: panditId,
        bookingDate: { $in: dateKeys },
        bookingStatus: { $in: ["requested", "confirmed"] },
      }).select("bookingDate timeSlot");

      bookedSlotsMap = bookings.reduce((map, booking) => {
        const key = booking.bookingDate;
        const current = map.get(key) || new Set();
        current.add(booking.timeSlot?.label);
        map.set(key, current);
        return map;
      }, new Map());
    }

    const data = dateKeys.map((dateKey) => {
      const blocked = bookedSlotsMap.get(dateKey) || new Set();

      return {
        date: dateKey,
        slots: STATIC_SLOT_TEMPLATE.map((slot) => ({
          ...slot,
          available: !blocked.has(slot.label),
        })),
      };
    });

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Unable to load availability slots",
    });
  }
};

export const createPanditBooking = async (req, res) => {
  try {
    const {
      ritualName,
      ritualDescription = "",
      ritualImage = "",
      bookingMode,
      assignType = "bestAvailable",
      panditId,
      bookingDate,
      timeSlot,
      address = {},
      dakshinaAmount = 0,
      recommendedKitId = null,
      paymentMethod = "UPI",
      notes = "",
    } = req.body;

    if (!ritualName?.trim() || !bookingMode || !bookingDate || !timeSlot?.label) {
      return res.status(400).json({
        success: false,
        message: "ritualName, bookingMode, bookingDate and timeSlot.label are required",
      });
    }

    let selectedPandit = null;

    if (assignType === "choosePandit") {
      if (!panditId) {
        return res.status(400).json({
          success: false,
          message: "panditId is required when assignType is choosePandit",
        });
      }

      selectedPandit = await Pandit.findOne({
        _id: panditId,
        status: "active",
        isVerified: true,
      });
    } else {
      const filter = buildPanditFilter({
        ritual: ritualName,
        mode: bookingMode,
      });

      selectedPandit = await Pandit.findOne(filter).sort({ ratingAverage: -1, yearsOfExperience: -1 });
    }

    if (!selectedPandit) {
      return res.status(400).json({
        success: false,
        message: "No suitable pandit available for this booking",
      });
    }

    const conflicting = await PanditBooking.findOne({
      pandit: selectedPandit._id,
      bookingDate,
      "timeSlot.label": timeSlot.label,
      bookingStatus: { $in: ["requested", "confirmed"] },
    });

    if (conflicting) {
      return res.status(409).json({
        success: false,
        message: "Selected slot is already booked. Please choose another slot.",
      });
    }

    const booking = await PanditBooking.create({
      user: req.user._id,
      pandit: selectedPandit._id,
      assignType,
      ritual: {
        name: ritualName.trim(),
        description: ritualDescription,
        image: ritualImage,
      },
      bookingMode,
      bookingDate,
      timeSlot: {
        label: timeSlot.label,
        startTime: timeSlot.startTime || "",
        endTime: timeSlot.endTime || "",
      },
      address: {
        line1: address.line1 || "",
        line2: address.line2 || "",
        city: address.city || "",
        state: address.state || "",
        pinCode: address.pinCode || "",
        landmark: address.landmark || "",
      },
      dakshinaAmount: Number(dakshinaAmount || 0),
      recommendedKit: recommendedKitId || null,
      payment: {
        status: "pending",
        method: paymentMethod,
      },
      bookingStatus: "requested",
      notes,
    });

    const populated = await PanditBooking.findById(booking._id)
      .populate("pandit", "fullName phone profileImage ratingAverage yearsOfExperience languagesSpoken")
      .populate("recommendedKit", "name image kitPrice");

    res.status(201).json({
      success: true,
      message: "Booking request created",
      data: populated,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Unable to create booking",
    });
  }
};

export const confirmPanditBookingPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { transactionId = "", paymentMethod = "UPI" } = req.body;

    const booking = await PanditBooking.findOne({
      _id: bookingId,
      user: req.user._id,
    })
      .populate("pandit", "fullName phone profileImage ratingAverage yearsOfExperience languagesSpoken")
      .populate("recommendedKit", "name image kitPrice");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    booking.payment.status = "paid";
    booking.payment.method = paymentMethod;
    booking.payment.transactionId = transactionId;
    booking.payment.paidAt = new Date();
    booking.bookingStatus = "confirmed";

    await booking.save();

    res.json({
      success: true,
      message: "Payment successful and booking confirmed",
      data: booking,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Unable to confirm payment",
    });
  }
};

export const getMyPanditBookings = async (req, res) => {
  try {
    const bookings = await PanditBooking.find({ user: req.user._id })
      .populate("pandit", "fullName phone profileImage ratingAverage yearsOfExperience languagesSpoken")
      .populate("recommendedKit", "name image kitPrice")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Unable to load bookings",
    });
  }
};

export const getPanditBookingById = async (req, res) => {
  try {
    const booking = await PanditBooking.findOne({
      _id: req.params.bookingId,
      user: req.user._id,
    })
      .populate("pandit", "fullName phone profileImage ratingAverage yearsOfExperience languagesSpoken templeAssociated")
      .populate("recommendedKit", "name image kitPrice description");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.json({
      success: true,
      data: booking,
    });
   } catch (err) {
     res.status(500).json({
       success: false,
      message: err.message || "Unable to load booking",
     });
   }
 };

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeSamagriType = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();

  if (["standard", "standard_kit", "standardkit"].includes(normalized)) {
    return "standard";
  }

  if (["customize", "custom", "customize_kit", "customkit"].includes(normalized)) {
    return "customize";
  }

  return "";
};

const normalizeRejectReasonType = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();

  if (["time_slot_already_booked", "time_slot", "slot_booked"].includes(normalized)) {
    return "time_slot_already_booked";
  }

  if (["location_too_far", "location_far", "far"].includes(normalized)) {
    return "location_too_far";
  }

  if (["pooja_not_performed", "not_performed", "not_my_pooja"].includes(normalized)) {
    return "pooja_not_performed";
  }

  if (["unavailable_personal", "personal", "unavailable"].includes(normalized)) {
    return "unavailable_personal";
  }

  if (normalized === "other") {
    return "other";
  }

  return "";
};

const buildBookingStats = (bookings = []) => {
  const stats = {
    total: bookings.length,
    requested: 0,
    confirmed: 0,
    cancelled: 0,
    completed: 0,
  };

  bookings.forEach((booking) => {
    const status = booking?.bookingStatus;
    if (Object.prototype.hasOwnProperty.call(stats, status)) {
      stats[status] += 1;
    }
  });

  return stats;
};

export const getPanditAssignedBookings = async (req, res) => {
  try {
    const { status = "all", search = "" } = req.query;

    const filter = {
      pandit: req.pandit._id,
    };

    if (status !== "all") {
      filter.bookingStatus = status;
    }

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      filter.$or = [
        { "ritual.name": regex },
        { bookingDate: regex },
        { "address.city": regex },
        { "address.state": regex },
      ];
    }

    const bookings = await PanditBooking.find(filter)
      .populate("user", "name phone email profileImage")
      .populate("recommendedKit", "name image kitPrice")
      .sort({ createdAt: -1 });

    const allBookingsForStats = await PanditBooking.find({ pandit: req.pandit._id }).select("bookingStatus");

    res.json({
      success: true,
      count: bookings.length,
      stats: buildBookingStats(allBookingsForStats),
      data: bookings,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Unable to load pandit bookings",
    });
  }
};

export const approvePanditBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { samagriType = "", note = "" } = req.body || {};

    const resolvedSamagriType = normalizeSamagriType(samagriType);

    if (!resolvedSamagriType) {
      return res.status(400).json({
        success: false,
        message: "samagriType is required and must be standard or customize",
      });
    }

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking id",
      });
    }

    const booking = await PanditBooking.findOne({
      _id: bookingId,
      pandit: req.pandit._id,
    })
      .populate("user", "name phone email profileImage")
      .populate("recommendedKit", "name image kitPrice");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.bookingStatus === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled booking cannot be approved",
      });
    }

    if (booking.bookingStatus === "completed") {
      return res.status(400).json({
        success: false,
        message: "Completed booking cannot be approved",
      });
    }

    booking.bookingStatus = "confirmed";
    booking.panditDecision = {
      ...booking.panditDecision,
      samagriType: resolvedSamagriType,
      rejectReasonType: "",
      rejectReasonText: "",
      note: String(note || "").trim(),
      decidedAt: new Date(),
    };

    if (String(note || "").trim()) {
      booking.notes = booking.notes
        ? `${booking.notes}\nPandit note (approved): ${String(note).trim()}`
        : `Pandit note (approved): ${String(note).trim()}`;
    }

    await booking.save();

    return res.json({
      success: true,
      message: "Appointment approved successfully",
      data: booking,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to approve booking",
    });
  }
};

export const rejectPanditBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const {
      reasonType = "",
      reason = "",
      otherReason = "",
      note = "",
    } = req.body || {};

    const resolvedReasonType = normalizeRejectReasonType(reasonType || reason);
    const resolvedNote = String(note || "").trim();
    const resolvedOtherReason = String(otherReason || "").trim();

    if (!resolvedReasonType) {
      return res.status(400).json({
        success: false,
        message:
          "reasonType is required. Allowed values: time_slot_already_booked, location_too_far, pooja_not_performed, unavailable_personal, other",
      });
    }

    if (!resolvedNote) {
      return res.status(400).json({
        success: false,
        message: "note is required when rejecting a booking",
      });
    }

    if (resolvedReasonType === "other" && !resolvedOtherReason) {
      return res.status(400).json({
        success: false,
        message: "otherReason is required when reasonType is other",
      });
    }

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking id",
      });
    }

    const booking = await PanditBooking.findOne({
      _id: bookingId,
      pandit: req.pandit._id,
    })
      .populate("user", "name phone email profileImage")
      .populate("recommendedKit", "name image kitPrice");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.bookingStatus === "completed") {
      return res.status(400).json({
        success: false,
        message: "Completed booking cannot be rejected",
      });
    }

    booking.bookingStatus = "cancelled";
    booking.panditDecision = {
      ...booking.panditDecision,
      samagriType: "",
      rejectReasonType: resolvedReasonType,
      rejectReasonText: resolvedReasonType === "other" ? resolvedOtherReason : "",
      note: resolvedNote,
      decidedAt: new Date(),
    };

    const rejectSummary =
      resolvedReasonType === "other"
        ? `Rejected by pandit: other - ${resolvedOtherReason}`
        : `Rejected by pandit: ${resolvedReasonType}`;

    booking.notes = booking.notes
      ? `${booking.notes}\n${rejectSummary}\nPandit note: ${resolvedNote}`
      : `${rejectSummary}\nPandit note: ${resolvedNote}`;

    await booking.save();

    return res.json({
      success: true,
      message: "Appointment rejected successfully",
      data: booking,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to reject booking",
    });
  }
};

export const deletePanditBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking id",
      });
    }

    const deleted = await PanditBooking.findOneAndDelete({
      _id: bookingId,
      pandit: req.pandit._id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    return res.json({
      success: true,
      message: "Appointment deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to delete booking",
    });
  }
};
