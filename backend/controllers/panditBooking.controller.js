import crypto from "crypto";
import Razorpay from "razorpay";
import Pandit from "../models/pandit.model.js";
import PanditBooking from "../models/panditBooking.model.js";
import PanditBookingIntent from "../models/panditBookingIntent.model.js";
import FestivalKit from "../models/festivalKit.model.js";
import Ritual from "../models/ritual.model.js";
import PanditReview from "../models/panditReview.model.js";
import temple from "../models/temple.model.js";
import BookingPricing from "../models/bookingPrice.js";
import mongoose from "mongoose";
import { notifyAdmins } from "../utils/notification.service.js";
import { createMeeting } from "../utils/zoom.service.js";
import { sendPushNotification } from "../utils/fcm.service.js";
import { notifyPanditBookingStatusUpdate, notifyPanditBookingAction } from "../utils/booking.notifications.js";
import Wallet from "../models/wallet.model.js";
import WalletTransaction from "../models/walletTransaction.model.js";
import Complaint from "../models/complaint.model.js";

// Shared helper: ensure a Zoom meeting exists for a booking (accepts booking doc or id)
export const ensureZoomMeetingForBooking = async (bookingDocOrId) => {
  try {
    let bookingDoc = bookingDocOrId;
    if (!bookingDoc) return null;

    if (typeof bookingDocOrId === "string" || bookingDocOrId instanceof mongoose.Types.ObjectId) {
      bookingDoc = await PanditBooking.findById(bookingDocOrId)
        .populate("user", "fcmToken email")
        .populate("pandit", "fcmToken");
    }

    if (!bookingDoc) return null;

    if (bookingDoc.bookingMode !== "onlinePooja") {
      console.log(`Booking ${String(bookingDoc._id)} mode is '${bookingDoc.bookingMode}'; skipping Zoom creation`);
      return null;
    }

    if (bookingDoc.zoomMeeting && bookingDoc.zoomMeeting.join_url) return bookingDoc.zoomMeeting;

    const slotRows = Array.isArray(bookingDoc?.dateAndTime?.dateAndTime)
      ? bookingDoc.dateAndTime.dateAndTime
      : [];
    const primary = slotRows[0] || {};
    if (!primary?.date || !primary?.time) return null;

    // parse time — handle formats like '4:22 PM - 6:22 PM' by taking first part
    const rawTime = String(primary.time || "");
    const timePart = rawTime.split("-")[0].trim();
    const dateStr = String(bookingDoc.bookingDate || primary.date || "").trim();

    console.log("Zoom meeting input:", {
      bookingId: String(bookingDoc._id),
      bookingDate: bookingDoc.bookingDate,
      slotDate: primary.date,
      slotTime: primary.time,
      timePart,
      dateStr,
    });

    const parseStartTime = (dateText, timeText) => {
      if (!dateText || !timeText) return null;

      const parseTimePart = (timeStr) => {
        const timeMatch = String(timeStr).trim().match(/(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/);
        let hour = 0,
          minute = 0;
        if (timeMatch) {
          hour = Number(timeMatch[1]);
          minute = Number(timeMatch[2]);
          const ampm = (timeMatch[3] || "").toUpperCase();
          if (ampm === "PM" && hour < 12) hour += 12;
          if (ampm === "AM" && hour === 12) hour = 0;
        } else {
          const parts = String(timeStr).split(":");
          hour = Number(parts[0] || 0);
          minute = Number(parts[1] || 0);
        }
        return { hour, minute };
      };

      // 1) Try ISO YYYY-MM-DD first
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateText).trim())) {
        const [y, m, d] = String(dateText).split("-").map(Number);
        if (![y, m, d].every(Number.isFinite)) return null;
        const { hour, minute } = parseTimePart(timeText);
        const dt = new Date(Date.UTC(y, (m || 1) - 1, d, hour, minute, 0));
        return new Date(dt.getTime());
      }

      // 2) Try human-readable like '26 Jun 2026' or '26 June 2026'
      const humanMatch = String(dateText).trim().match(/(\d{1,2})\s+([A-Za-z]+)\s*,?\s*(\d{4})/);
      if (humanMatch) {
        const day = Number(humanMatch[1]);
        const monthName = humanMatch[2].toLowerCase();
        const year = Number(humanMatch[3]);
        const months = {
          jan: 0,
          january: 0,
          feb: 1,
          february: 1,
          mar: 2,
          march: 2,
          apr: 3,
          april: 3,
          may: 4,
          jun: 5,
          june: 5,
          jul: 6,
          july: 6,
          aug: 7,
          august: 7,
          sep: 8,
          sept: 8,
          september: 8,
          oct: 9,
          october: 9,
          nov: 10,
          november: 10,
          dec: 11,
          december: 11,
        };
        const monthIndex = months[monthName.slice(0, 3)] ?? months[monthName] ?? null;
        if (monthIndex === null || !Number.isFinite(day) || !Number.isFinite(year)) return null;
        const { hour, minute } = parseTimePart(timeText);
        const dt = new Date(Date.UTC(year, monthIndex, day, hour, minute, 0));
        return new Date(dt.getTime());
      }

      // 3) Fallback: try native Date parsing of combined string
      try {
        const combined = `${String(dateText).trim()} ${String(timeText).trim()}`;
        const parsed = new Date(combined);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      } catch (e) {
        // ignore
      }

      // couldn't parse
      console.warn("parseStartTime: unable to parse date/time", { dateText, timeText });
      return null;
    };

    const startTime = parseStartTime(dateStr, timePart);
    console.log("Zoom meeting parsed startTime:", {
      bookingId: String(bookingDoc._id),
      startTime: startTime ? startTime.toISOString() : null,
    });
    if (!startTime || Number.isNaN(startTime.getTime())) return null;

    const durationHours = Number(bookingDoc.ritualRef?.durationHours || bookingDoc.ritual?.durationHours || 1);
    const durationMinutes = Math.max(1, Math.round(durationHours * 60));

    const hostEmail = process.env.ZOOM_HOST_EMAIL || (bookingDoc.user && bookingDoc.user.email) || "";

    const meeting = await createMeeting({
      topic: `Pooja: ${bookingDoc.ritual?.name || bookingDoc.ritual?.title || "Pooja"}`,
      startTime,
      durationMinutes,
      hostEmail,
    });

    bookingDoc.zoomMeeting = {
      meetingId: meeting.id || meeting.uuid || null,
      join_url: meeting.join_url || null,
      start_url: meeting.start_url || null,
      password: meeting.password || meeting.pswd || null,
    };

    await bookingDoc.save();

    // Notify user and pandit (DB + FCM if tokens exist)
    try {
      const Notification = (await import("../models/notification.model.js")).default;
      const admin = (await import("firebase-admin")).default;
      const User = (await import("../models/user.model.js")).default;
      const PanditModel = (await import("../models/pandit.model.js")).default;

      const title = "Zoom meeting scheduled";
      const body = `Zoom meeting for ${bookingDoc.ritual?.name || "your booking"} is ready. Tap to join.`;

      const notifUser = new Notification({
        title,
        body,
        data: { bookingId: String(bookingDoc._id), zoom: bookingDoc.zoomMeeting },
        audience: { type: "user", ids: [bookingDoc.user] },
      });
      await notifUser.save();

      const notifPandit = new Notification({
        title,
        body,
        data: { bookingId: String(bookingDoc._id), zoom: bookingDoc.zoomMeeting },
        audience: { type: "pandit", ids: [bookingDoc.pandit] },
      });
      await notifPandit.save();

      try {
        const userDoc = await User.findById(bookingDoc.user).lean();
        const panditDoc = await PanditModel.findById(bookingDoc.pandit).lean();

        if (userDoc?.fcmToken) {
          const result = await sendPushNotification({
            token: userDoc.fcmToken,
            title,
            body,
            data: {
              bookingId: String(bookingDoc._id),
              zoomLink: bookingDoc.zoomMeeting.join_url || "",
            },
          });
          console.log(`Zoom FCM send result for user ${bookingDoc.user}:`, result);
        }

        if (panditDoc?.fcmToken) {
          const result = await sendPushNotification({
            token: panditDoc.fcmToken,
            title,
            body,
            data: {
              bookingId: String(bookingDoc._id),
              zoomLink: bookingDoc.zoomMeeting.join_url || "",
            },
          });
          console.log(`Zoom FCM send result for pandit ${bookingDoc.pandit}:`, result);
        }
      } catch (fcmErr) {
        console.log("Zoom notification FCM error:", fcmErr.message || fcmErr);
      }
    } catch (notifErr) {
      console.log("Zoom notification creation error:", notifErr.message || notifErr);
    }

    return bookingDoc.zoomMeeting;
  } catch (err) {
    console.error("ensureZoomMeetingForBooking error:", err.response?.data || err.message || err);
    // Surface the error to callers so admin endpoints can report details
    throw new Error(err.response?.data?.message || err.message || String(err));
  }
};

const modeMap = {
  home: "homeVisit",
  online: "onlinePooja",
  temple: "atTemple",
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

const getRazorpayCredentials = () => {
  const keyId = String(process.env.RAZORPAY_KEY_ID || process.env.key_id || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || process.env.key_secret || "").trim();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are not configured in environment");
  }

  return { keyId, keySecret };
};

const getBookingIntentSecret = () => {
  const secret = String(process.env.JWT_SECRET || process.env.RAZORPAY_KEY_SECRET || process.env.key_secret || "").trim();

  if (!secret) {
    throw new Error("Booking intent secret is not configured in environment");
  }

  return secret;
};

const encodeBase64Url = (value) => Buffer.from(value).toString("base64url");

const decodeBase64Url = (value) => Buffer.from(value, "base64url").toString("utf8");

const signBookingIntentPayload = (payloadText) => {
  const secret = getBookingIntentSecret();
  return crypto.createHmac("sha256", secret).update(payloadText).digest("hex");
};

const createBookingIntentToken = (payloadObject) => {
  const payloadText = encodeBase64Url(JSON.stringify(payloadObject));
  const signature = signBookingIntentPayload(payloadText);
  return `${payloadText}.${signature}`;
};

const verifyBookingIntentToken = (token = "") => {
  try {
    const [payloadText, signature] = String(token || "").split(".");

    if (!payloadText || !signature) {
      return null;
    }

    const expectedSignature = signBookingIntentPayload(payloadText);
    if (expectedSignature !== signature) {
      return null;
    }

    const decoded = JSON.parse(decodeBase64Url(payloadText));
    return decoded;
  } catch {
    return null;
  }
};

const verifyRazorpaySignature = ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  const { keySecret } = getRazorpayCredentials();
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  return expectedSignature === razorpaySignature;
};

const normalizeBookingPaymentMethod = (value = "UPI") => {
  const normalized = String(value || "UPI").trim().toUpperCase();

  if (["ONLINE", "UPI", "RAZORPAY", "PREPAID"].includes(normalized)) {
    return "ONLINE";
  }

  return normalized || "UPI";
};

const getActiveBookingPrice = async () => {
  const pricing = await BookingPricing.findOne({ isActive: true }).sort({ updatedAt: -1 }).lean();
  const price = Number(pricing?.price || 0);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Active pandit booking price is not configured");
  }

  return Number(price.toFixed(2));
};

const normalizeBookingAddress = (addressInput = {}) => {
  const fullAddressFromParts = [
    String(addressInput?.line1 || "").trim(),
    String(addressInput?.line2 || "").trim(),
    String(addressInput?.landmark || "").trim(),
  ]
    .filter(Boolean)
    .join(", ");

  return {
    name: String(addressInput?.name || "").trim(),
    phone: String(addressInput?.phone || "").trim(),
    secondPhone:String(addressInput?.phone || "").trim(),
    email:String(addressInput?.email || "").trim(),
    fullAddress: String(addressInput?.fullAddress || fullAddressFromParts || "").trim(),
    addressType: String(addressInput?.addressType || "others").trim() || "others",
    city: String(addressInput?.city || "").trim(),
    state: String(addressInput?.state || "").trim(),
    pincode: String(addressInput?.pincode || addressInput?.pinCode || "").trim(),
  };
};

const normalizeRequestReason = (value = "") => String(value || "").trim();
const normalizeRequestNotes = (value = "") => String(value || "").trim();

const normalizeDateString = (value = "") => {
  const input = String(value || "").trim();
  if (!input) return "";

  // 1) ISO YYYY-MM-DD
  const isoMatch = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = String(isoMatch[2]).padStart(2, "0");
    const d = String(isoMatch[3]).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // 2) Human-readable like '26 Jun 2026' or '26 June 2026'
  const humanMatch = input.match(/(\d{1,2})\s+([A-Za-z]+)\s*,?\s*(\d{4})/);
  if (humanMatch) {
    const day = Number(humanMatch[1]);
    const monthName = humanMatch[2].toLowerCase();
    const year = Number(humanMatch[3]);
    const months = {
      jan: 1,
      january: 1,
      feb: 2,
      february: 2,
      mar: 3,
      march: 3,
      apr: 4,
      april: 4,
      may: 5,
      jun: 6,
      june: 6,
      jul: 7,
      july: 7,
      aug: 8,
      august: 8,
      sep: 9,
      sept: 9,
      september: 9,
      oct: 10,
      october: 10,
      nov: 11,
      november: 11,
      dec: 12,
      december: 12,
    };
    const monthIndex = months[monthName.slice(0, 3)] ?? months[monthName] ?? null;
    if (!Number.isFinite(day) || !Number.isFinite(year) || monthIndex === null) return "";
    const d = String(day).padStart(2, "0");
    const m = String(monthIndex).padStart(2, "0");
    return `${year}-${m}-${d}`;
  }

  // 3) Fallback to native parsing
  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return "";
};

const normalizeDateAndTimePayload = (value, fallbackDate = "") => {
  if (!value) return [];

  const rows = Array.isArray(value)
    ? value
    : Array.isArray(value?.dateAndTime)
      ? value.dateAndTime
      : [value];

  const normalized = rows
    .map((row) => ({
      date: normalizeDateString(row?.date || fallbackDate || ""),
      time: String(row?.time || row?.label || "").trim(),
    }))
    .filter((row) => row.date && row.time);

  return normalized;
};

const getPrimaryBookingTime = (dateAndTime = {}) => {
  const rows = Array.isArray(dateAndTime?.dateAndTime) ? dateAndTime.dateAndTime : [];
  return rows[0]?.time || "";
};

const getBookedSlotConflictQuery = ({ panditId, bookingDate, slotDate, slotTime }) => ({
  pandit: panditId,
  bookingDate,
  "dateAndTime.dateAndTime": {
    $elemMatch: {
      date: slotDate,
      time: slotTime,
    },
  },
  bookingStatus: { $in: ["requested", "confirmed"] },
  "payment.status": "paid",
});

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
  ratingCount: Number(pandit.ratingCount || 0),
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

export const gettemplesForBooking = async (req, res) => {
  try {
    const { search = "", city = "", state = "" } = req.query;
    const filter = { status: "active" };

    if (city?.trim()) {
      filter["address.city"] = { $regex: city.trim(), $options: "i" };
    }

    if (state?.trim()) {
      filter["address.state"] = { $regex: state.trim(), $options: "i" };
    }

    if (search?.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      filter.$or = [
        { name: regex },
        { description: regex },
        { "address.city": regex },
        { "address.state": regex },
        { "address.line1": regex },
        { "address.landmark": regex },
      ];
    }

    const temples = await temple.find(filter).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: temples.length,
      data: temples,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load temples",
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
      // data: pandits.map(mapPanditCard),
      data: pandits
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

    const recommendedKit = await FestivalKit.findOne({
      status: "active",
      kitType: { $in: ["Customize", "default"] },
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
        poojaOfferings: (function () {
          try {
            const raw = JSON.parse(JSON.stringify(pandit.poojaOfferings || []));
            return raw.map((off) => ({
              ...off,
              customSamagriNotes: Array.isArray(off.customSamagriNotes)
                ? off.customSamagriNotes
                    .map((note) => String(note || "").trim())
                    .filter(Boolean)
                : [],
              customSamagriItems: Array.isArray(off.customSamagriItems)
                ? off.customSamagriItems.filter((it) => String(it.approvalStatus) === "approved")
                : [],
            }));
          } catch (e) {
            return pandit.poojaOfferings || [];
          }
        })(),
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
        "payment.status": "paid",
      }).select("bookingDate dateAndTime");

      bookedSlotsMap = bookings.reduce((map, booking) => {
        const key = booking.bookingDate;
        const current = map.get(key) || new Set();
        const bookedTime = getPrimaryBookingTime(booking.dateAndTime);
        if (bookedTime) {
          current.add(bookedTime);
        }
        map.set(key, current);
        return map;
      }, new Map());
    }

    const data = dateKeys.map((dateKey) => {
      const blocked = Array.from(bookedSlotsMap.get(dateKey) || new Set());
      return {
        date: dateKey,
        bookedSlots: blocked,
        // Dynamic mode: app controls candidate slots; backend returns already booked ones.
        slots: blocked.map((time) => ({
          label: time,
          time,
          available: false,
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
    console.log("Create booking request body:", req.body);

    const {
      ritualId = "",
      ritualName,
      ritualDescription = "",
      ritualImage = "",
      bookingMode,
      panditId,
      bookingDate,
      dateAndTime,
      timeSlot,
      address = {},
      templeId = "",
      price = null,
      walletAmount = 0,
      recommendedKitId = null,
    } = req.body;

    const fallbackFromTimeSlot = timeSlot
      ? [
          {
            date: bookingDate || "",
            time: timeSlot?.time || timeSlot?.label || timeSlot?.startTime || "",
          },
        ]
      : [];

    const normalizedDateAndTime = normalizeDateAndTimePayload(
      dateAndTime || fallbackFromTimeSlot,
      bookingDate,
    );

    if (!bookingMode || !normalizedDateAndTime.length) {
      return res.status(400).json({
        success: false,
        message: "bookingMode and dateAndTime are required",
      });
    }

    const primaryDateAndTime = normalizedDateAndTime[0];
    const resolvedBookingDate = normalizeDateString(bookingDate || primaryDateAndTime?.date || "");

    if (!resolvedBookingDate) {
      return res.status(400).json({
        success: false,
        message: "dateAndTime[0].date is required when bookingDate is not provided",
      });
    }

    const resolvedAssignType = panditId ? "choosePandit" : "bestAvailable";

    let selectedRitual = null;
    if (ritualId) {
      if (!mongoose.Types.ObjectId.isValid(ritualId)) {
        return res.status(400).json({ success: false, message: "Invalid ritualId" });
      }
      selectedRitual = await Ritual.findOne({ _id: ritualId, status: "active" });
      if (!selectedRitual) {
        return res.status(404).json({ success: false, message: "Ritual not found or inactive" });
      }
    }

    if (!selectedRitual && !ritualName?.trim()) {
      return res.status(400).json({ success: false, message: "ritualName or ritualId is required" });
    }

    let selectedtemple = null;
    if (bookingMode === "temple") {
      if (!templeId || !mongoose.Types.ObjectId.isValid(templeId)) {
        return res.status(400).json({ success: false, message: "Valid templeId is required for temple booking" });
      }
      selectedtemple = await temple.findOne({ _id: templeId, status: "active" });
      if (!selectedtemple) {
        return res.status(404).json({ success: false, message: "Temple not found or inactive" });
      }
    }

    let selectedPandit = null;
    if (resolvedAssignType === "choosePandit") {
      if (!mongoose.Types.ObjectId.isValid(panditId)) {
        return res.status(400).json({ success: false, message: "Valid panditId is required" });
      }
      selectedPandit = await Pandit.findOne({ _id: panditId, status: "active", isVerified: true });
    } else {
      const filter = buildPanditFilter({ ritual: selectedRitual?.title || ritualName, mode: bookingMode });
      selectedPandit = await Pandit.findOne(filter).sort({ ratingAverage: -1, yearsOfExperience: -1 });
    }

    if (!selectedPandit) {
      return res.status(400).json({ success: false, message: "No suitable pandit available" });
    }

    const conflicting = await PanditBooking.findOne(
      getBookedSlotConflictQuery({
        panditId: selectedPandit._id,
        bookingDate: resolvedBookingDate,
        slotDate: primaryDateAndTime.date,
        slotTime: primaryDateAndTime.time,
      }),
    );

    if (conflicting) {
      return res.status(409).json({ success: false, message: "Selected slot is already booked" });
    }

    const bookingPrice = await getActiveBookingPrice();
    const userWallet = await Wallet.findOne({ user: req.user._id });
    const normalizedWalletAmount = Number.isFinite(Number(walletAmount))
      ? Math.max(Number(walletAmount), 0)
      : 0;
    const walletBalance = Number(userWallet?.balance || 0);
    const walletUsed = Math.min(walletBalance, normalizedWalletAmount, bookingPrice);
    const amountDue = Number((bookingPrice - walletUsed).toFixed(2));

    if (amountDue <= 0 && (!userWallet || userWallet.balance < bookingPrice)) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
        data: {
          required: bookingPrice,
          balance: userWallet?.balance || 0,
        },
      });
    }

    const resolvedBookingAddress = selectedtemple
      ? {
          name: selectedtemple.name || "",
          phone: selectedtemple.contactPhone || "",
          fullAddress: [
            String(selectedtemple.address?.line1 || "").trim(),
            String(selectedtemple.address?.line2 || "").trim(),
            String(selectedtemple.address?.landmark || "").trim(),
          ].filter(Boolean).join(", "),
          addressType: "temple",
          city: selectedtemple.address?.city || "",
          state: selectedtemple.address?.state || "",
          pincode: selectedtemple.address?.pinCode || "",
        }
      : normalizeBookingAddress(address);

    const baseBookingPayload = {
      user: req.user._id,
      pandit: selectedPandit._id,
      ritual: {
        name: selectedRitual?.title || ritualName.trim(),
        description: selectedRitual?.description || ritualDescription,
        image: selectedRitual?.image || ritualImage,
      },
      ritualRef: selectedRitual?._id || null,
      bookingMode,
      bookingDate: resolvedBookingDate,
      dateAndTime: { dateAndTime: normalizedDateAndTime },
      address: resolvedBookingAddress,
      temple: selectedtemple?._id || null,
      templeSnapshot: selectedtemple ? {
        name: selectedtemple.name || "",
        image: selectedtemple.image || "",
        city: selectedtemple.address?.city || "",
        state: selectedtemple.address?.state || "",
        line1: selectedtemple.address?.line1 || "",
        landmark: selectedtemple.address?.landmark || "",
      } : {},
      dakshinaAmount: bookingPrice,
      bookingAmount: bookingPrice,
      price: bookingPrice,
      recommendedKit: recommendedKitId && mongoose.Types.ObjectId.isValid(recommendedKitId) ? recommendedKitId : null,
    };

    let createdBooking = null;

    if (amountDue <= 0) {
      const transactionId = `WALLET_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

      createdBooking = await PanditBooking.create({
        ...baseBookingPayload,
        payment: {
          status: "paid",
          method: "WALLET",
          gateway: "wallet",
          walletAmount: bookingPrice,
          amountDue: 0,
          transactionId,
          paidAt: new Date(),
        },
        bookingStatus: "requested",
      });

      userWallet.balance -= bookingPrice;
      await userWallet.save();

      await createWalletTransaction(
        userWallet,
        bookingPrice,
        "debit",
        createdBooking._id,
        `Pandit booking: ${createdBooking.ritual.name}`,
        { bookingId: createdBooking._id, panditId: selectedPandit._id }
      );
    } else {
      createdBooking = await PanditBooking.create({
        ...baseBookingPayload,
        payment: {
          status: "pending",
          method: walletUsed > 0 ? "MIXED" : "ONLINE",
          walletAmount: walletUsed,
          amountDue,
        },
        bookingStatus: "requested",
      });
    }

    const booking = await PanditBooking.findById(createdBooking._id)
      .populate("pandit", "fullName phone profileImage ratingAverage yearsOfExperience languagesSpoken")
      .populate("temple", "name image description address contactPhone contactPerson")
      .populate("ritualRef", "title description image durationHours status")
      .populate("recommendedKit", "name image kitPrice");

    let razorpayOrder = null;
    // Log booking creation details for debugging
    try {
      const primaryTime = getPrimaryBookingTime(booking.dateAndTime) || "";
      console.log("Pandit booking created:", {
        bookingId: String(booking._id),
        paymentStatus: booking.payment?.status,
        bookingDate: booking.bookingDate,
        time: primaryTime,
      });
    } catch (logErr) {
      console.log("Error logging booking creation:", logErr.message || logErr);
    }

    // Create Zoom meeting immediately if booking is already paid
    try {
      if (booking?.payment?.status === "paid") {
        console.log(`Attempting Zoom meeting creation for booking ${String(booking._id)}`);
        const zoom = await ensureZoomMeetingForBooking(booking);
        console.log(`Zoom meeting creation result for booking ${String(booking._id)}:`, zoom);
        if (zoom) {
          // attach zoom info to the response booking object
          booking.zoomMeeting = booking.zoomMeeting || zoom;
        }
      } else {
        console.log(`Booking ${String(booking._id)} payment status is '${booking.payment?.status}'; skipping Zoom creation`);
      }
    } catch (e) {
      console.error("Error while creating zoom meeting for booking:", e.response?.data || e.message || e);
    }
    if (amountDue > 0) {
      const { keyId, keySecret } = getRazorpayCredentials();
      const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
      razorpayOrder = await razorpay.orders.create({
        amount: Math.round(amountDue * 100),
        currency: "INR",
        receipt: `pandit_booking_${String(booking._id).slice(-8)}_${Date.now()}`,
        notes: {
          bookingId: String(booking._id),
          userId: String(req.user._id),
        },
      });

      await PanditBooking.updateOne(
        { _id: booking._id },
        {
          $set: {
            "payment.method": walletUsed > 0 ? "MIXED" : "ONLINE",
            "payment.gateway": "Razorpay",
            "payment.razorpayOrderId": razorpayOrder.id,
          },
        },
      );

      booking.payment.method = walletUsed > 0 ? "MIXED" : "ONLINE";
      booking.payment.gateway = "Razorpay";
      booking.payment.razorpayOrderId = razorpayOrder.id;
    }

    if (amountDue <= 0) {
      void notifyAdmins({
        title: "Pandit booking requested (Wallet)",
        body: `${req.user.name || req.user.phone} booked ${booking?.ritual?.name || "a ritual"} via wallet`,
        data: {
          eventType: "pandit.booking.requested.wallet",
          bookingId: String(booking._id),
          userId: String(req.user._id),
        },
      }).catch(console.error);
    }

    res.status(201).json({
      success: true,
      message: amountDue <= 0 ? "Booking successful with wallet payment" : "Booking initiated",
      data: {
        booking,
        walletUsed,
        amountDue,
        razorpayOrder,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Unable to create booking with wallet",
    });
  }
};

export const createPanditBookingRazorpayOrder = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking id",
      });
    }

    const booking = await PanditBooking.findOne({
      _id: bookingId,
      user: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.payment?.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Booking is already paid",
      });
    }

    const amount = Number(
      booking.payment?.amountDue !== undefined
        ? booking.payment?.amountDue
        : booking.bookingAmount || booking.dakshinaAmount || 0
    );
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Booking amount must be greater than zero",
      });
    }

    const { keyId, keySecret } = getRazorpayCredentials();
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `pandit_booking_${String(booking._id).slice(-8)}_${Date.now()}`,
      notes: {
        bookingId: String(booking._id),
        userId: String(req.user._id),
      },
    });

    booking.payment.method = "ONLINE";
    booking.payment.gateway = "Razorpay";
    booking.payment.razorpayOrderId = razorpayOrder.id;
    booking.payment.razorpayPaymentId = "";
    booking.payment.razorpaySignature = "";
    await booking.save();

    return res.json({
      success: true,
      message: "Razorpay order created for pandit booking",
      data: {
        bookingId: booking._id,
        keyId,
        amount,
        currency: "INR",
        razorpayOrder,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to create Razorpay order for booking",
    });
  }
};

export const confirmPanditBookingPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const {
      razorpayOrderId = "",
      razorpayPaymentId = "",
      razorpaySignature = "",
      bookingIntentToken = "",
    } = req.body;

    console.log("Confirm payment request:", {
      bookingId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature: razorpaySignature ? "[present]" : "[missing]",
      bookingIntentToken: bookingIntentToken ? "[present]" : "[missing]",
    });

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "razorpayOrderId, razorpayPaymentId and razorpaySignature are required",
      });
    }

    const isValidSignature = verifyRazorpaySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay payment signature",
      });
    }

    let intentPayload = verifyBookingIntentToken(bookingIntentToken);

    if (!intentPayload) {
      const storedIntent = await PanditBookingIntent.findOne({
        razorpayOrderId: String(razorpayOrderId || "").trim(),
        user: req.user._id,
        status: "pending",
      }).lean();

      if (storedIntent?.payload) {
        intentPayload = storedIntent.payload;
      }
    }

    if (intentPayload) {
      if (String(intentPayload.userId) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "Invalid booking intent for current user",
        });
      }

      if (Number(intentPayload.expiresAt || 0) < Date.now()) {
        return res.status(400).json({
          success: false,
          message: "Booking intent expired. Please start booking again",
        });
      }

      const expectedOrderId = String(intentPayload.razorpayOrderId || "").trim();
      if (expectedOrderId !== String(razorpayOrderId || "").trim()) {
        return res.status(400).json({
          success: false,
          message: "Razorpay order id mismatch for booking intent",
        });
      }

      if (bookingId && String(bookingId).trim() && String(bookingId).trim() !== expectedOrderId) {
        return res.status(400).json({
          success: false,
          message: "URL bookingId must match razorpay order id for payment-first flow",
        });
      }

      const bookingInput = intentPayload.booking || {};
      const slotRows = Array.isArray(bookingInput?.dateAndTime?.dateAndTime)
        ? bookingInput.dateAndTime.dateAndTime
        : [];
      const primaryDateAndTime = slotRows[0] || {};

      if (!bookingInput.panditId || !bookingInput.bookingDate || !primaryDateAndTime?.date || !primaryDateAndTime?.time) {
        return res.status(400).json({
          success: false,
          message: "Invalid booking intent payload",
        });
      }

      const duplicatePaidByTxn = await PanditBooking.findOne({
        "payment.transactionId": String(razorpayPaymentId || "").trim(),
      });

      if (duplicatePaidByTxn) {
        return res.status(400).json({
          success: false,
          message: "Booking payment is already requested",
          data: duplicatePaidByTxn,
        });
      }

      const conflicting = await PanditBooking.findOne(
        getBookedSlotConflictQuery({
          panditId: bookingInput.panditId,
          bookingDate: bookingInput.bookingDate,
          slotDate: primaryDateAndTime.date,
          slotTime: primaryDateAndTime.time,
        }),
      );

      if (conflicting) {
        return res.status(409).json({
          success: false,
          message: "Selected slot has already been booked by another paid booking",
        });
      }

      const createdBooking = await PanditBooking.create({
        user: req.user._id,
        pandit: bookingInput.panditId,
        ritual: {
          name: bookingInput?.ritual?.name || "",
          description: bookingInput?.ritual?.description || "",
          image: bookingInput?.ritual?.image || "",
        },
        ritualRef: bookingInput.ritualRef || null,
        bookingMode: bookingInput.bookingMode,
        bookingDate: bookingInput.bookingDate,
        dateAndTime: bookingInput.dateAndTime,
        address: bookingInput.address || {},
        temple: bookingInput.temple || null,
        templeSnapshot: bookingInput.templeSnapshot || {},
        dakshinaAmount: Number(bookingInput.bookingAmount || bookingInput.dakshinaAmount || 0),
        bookingAmount: Number(bookingInput.bookingAmount || bookingInput.dakshinaAmount || 0),
        recommendedKit: bookingInput.recommendedKit || null,
        payment: {
          status: "paid",
          method: "ONLINE",
          gateway: "Razorpay",
          transactionId: String(razorpayPaymentId || "").trim(),
          razorpayOrderId: String(razorpayOrderId || "").trim(),
          razorpayPaymentId: String(razorpayPaymentId || "").trim(),
          razorpaySignature: String(razorpaySignature || "").trim(),
          paidAt: new Date(),
        },
        bookingStatus: "requested",
      });

      const booking = await PanditBooking.findById(createdBooking._id)
        .populate("pandit", "fullName phone profileImage ratingAverage yearsOfExperience languagesSpoken")
        .populate("temple", "name image description address contactPhone contactPerson")
        .populate("ritualRef", "title description image durationHours status")
        .populate("recommendedKit", "name image kitPrice");

      // create Zoom meeting for this paid booking
      try {
        console.log(`Intent flow: attempting Zoom meeting creation for booking ${String(booking._id)}`);
        const zoom = await ensureZoomMeetingForBooking(booking);
        console.log(`Intent flow: Zoom result for booking ${String(booking._id)}:`, zoom);
        if (zoom) booking.zoomMeeting = zoom;
      } catch (e) {
        console.error("Error creating Zoom meeting for intent-created booking:", e.response?.data || e.message || e);
      }

      void notifyAdmins({
        title: "Pandit booking requested",
        body: `${req.user.name || req.user.phone || "A user"} booked ${booking?.ritual?.name || "a ritual"}`,
        data: {
          eventType: "pandit.booking.requested",
          bookingId: String(booking._id),
          userId: String(req.user._id),
          panditId: String(createdBooking.pandit),
          ritualName: booking?.ritual?.name || "",
        },
      }).catch((error) => console.error("PANDIT BOOKING NOTIFICATION ERROR:", error.message));

      await PanditBookingIntent.deleteMany({
        razorpayOrderId: String(razorpayOrderId || "").trim(),
        user: req.user._id,
      });

      return res.json({
        success: true,
        message: "Payment successful and booking requested",
        data: booking,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking id. Missing booking intent for this order. Please retry booking creation.",
      });
    }

    const booking = await PanditBooking.findOne({
      _id: bookingId,
      user: req.user._id,
    })
      .populate("pandit", "fullName phone profileImage ratingAverage yearsOfExperience languagesSpoken")
      .populate("temple", "name image description address contactPhone contactPerson")
      .populate("ritualRef", "title description image durationHours status")
      .populate("recommendedKit", "name image kitPrice");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.payment?.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Booking payment is already confirmed",
      });
    }

    if (
      booking.payment?.razorpayOrderId &&
      String(booking.payment.razorpayOrderId) !== String(razorpayOrderId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Razorpay order id does not match booking payment order",
      });
    }

    booking.payment.status = "paid";
    booking.payment.method = "ONLINE";
    booking.payment.gateway = "Razorpay";
    booking.payment.transactionId = String(razorpayPaymentId || "").trim();
    booking.payment.razorpayOrderId = String(razorpayOrderId || "").trim();
    booking.payment.razorpayPaymentId = String(razorpayPaymentId || "").trim();
    booking.payment.razorpaySignature = String(razorpaySignature || "").trim();
    booking.payment.paidAt = new Date();
    booking.bookingStatus = "requested";

    const walletAmount = Number(booking.payment?.walletAmount || 0);
    if (walletAmount > 0) {
      const wallet = await Wallet.findOne({ user: req.user._id });
      if (!wallet || wallet.balance < walletAmount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance",
        });
      }

      wallet.balance = Number((wallet.balance - walletAmount).toFixed(2));
      await wallet.save();

      await createWalletTransaction(
        wallet,
        walletAmount,
        "debit",
        booking._id,
        `Pandit booking: ${booking.ritual?.name || ""}`,
        { bookingId: booking._id, panditId: booking.pandit }
      );
    }

    await booking.save();

    // create zoom meeting after payment-confirmation if not present
    let zoomError = null;
    try {
      if (booking?.payment?.status === "paid") {
        console.log(`Confirm-payment flow: attempting Zoom meeting creation for booking ${String(booking._id)}`);
        const zoom = await ensureZoomMeetingForBooking(booking);
        console.log(`Confirm-payment flow: Zoom result for booking ${String(booking._id)}:`, zoom);
        if (zoom) booking.zoomMeeting = zoom;
      }
    } catch (e) {
      zoomError = e.message || String(e);
      console.error("Error creating zoom meeting after payment-confirmation:", e.response?.data || e.message || e);
    }

    // Send notifications to pandit and user
    try {
      if (booking.pandit) {
        await notifyPanditBookingAction(
          booking.pandit._id,
          booking._id,
          "booking_requested",
          { _id: req.user._id, name: req.user.name || req.user.phone || "User" },
          booking.ritual?.name || "Ritual"
        );

        const panditName = booking.pandit.fullName || booking.pandit.name || "Pandit";
        await notifyPanditBookingStatusUpdate(
          booking.user,
          booking._id,
          "requested",
          { _id: booking.pandit._id, name: panditName },
          booking.ritual?.name || "Ritual"
        );
      }
    } catch (e) {
      console.error("Error sending booking notifications:", e.message || e);
    }

    const responseBody = {
      success: true,
      message: "Payment successful and booking requested",
      data: booking,
    };

    if (zoomError) responseBody.zoomError = zoomError;

    return res.json(responseBody);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Unable to requested payment",
    });
  }
};

// export const getMyPanditBookings = async (req, res) => {
//   try {
//     await autoCancelExpiredBookings();
//     const bookings = await PanditBooking.find({ user: req.user._id, "payment.status": "paid" })
//       .populate("pandit", "fullName phone profileImage ratingAverage yearsOfExperience languagesSpoken poojaOfferings")
//       .populate("temple", "name image description address contactPhone contactPerson")
//       .populate("ritualRef", "title description image durationHours status")
//       .populate("recommendedKit", "name image kitPrice")
//       .select("-__V")
//       .sort({ createdAt: -1 });

//     res.json({
//       success: true,
//       count: bookings.length,
//       data: bookings,
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: err.message || "Unable to load bookings",
//     });
//   }
// };

export const getMyPanditBookings = async (req, res) => {
  try {
    await autoCancelExpiredBookings();

    const bookings = await PanditBooking.find({
      user: req.user._id,
    })
      .populate(
        "pandit",
        "fullName phone profileImage ratingAverage yearsOfExperience languagesSpoken poojaOfferings"
      )
      .populate(
        "temple",
        "name image description address contactPhone contactPerson"
      )
      .populate(
        "ritualRef",
        "title description image durationHours status"
      )
      .populate("recommendedKit", "name image kitPrice")
      .select("-__v")
      .sort({ createdAt: -1 })
      .lean();

    // Get all booking ids
    const bookingIds = bookings.map((item) => item._id);

    // Find reviewed bookings
    const reviews = await PanditReview.find({
      booking: { $in: bookingIds },
    }).select("booking");

    const reviewedBookingIds = new Set(
      reviews.map((item) => item.booking.toString())
    );

    // Add isUserReview field
    const updatedBookings = bookings.map((item) => ({
      ...item,
      isUserReview: reviewedBookingIds.has(item._id.toString()),
    }));

    res.json({
      success: true,
      count: updatedBookings.length,
      data: updatedBookings,
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
    await autoCancelExpiredBookings();
    const booking = await PanditBooking.findOne({
      _id: req.params.bookingId,
      user: req.user._id,
    })
      .populate("pandit", "fullName phone profileImage ratingAverage yearsOfExperience languagesSpoken templeAssociated")
      .populate("temple", "name image description address contactPhone contactPerson")
      .populate("ritualRef", "title description image durationHours status")
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
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";

  const normalized = raw
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");

  if (
    [
      "time_slot_already_booked",
      "time_slot",
      "slot_booked",
      "time_slot_booked",
      "time_slot_is_booked",
      "already_booked",
      "slot_already_booked",
      "reason_slot",
      "slot_reason",
    ].includes(normalized)
  ) {
    return "time_slot_already_booked";
  }

  if (
    [
      "location_too_far",
      "location_far",
      "location_is_too_far",
      "far",
      "reason_location",
      "location_reason",
      "distance_too_far",
      "too_far",
    ].includes(normalized)
  ) {
    return "location_too_far";
  }

  if (
    [
      "pooja_not_performed",
      "not_performed",
      "pooja_not_done",
      "not_my_pooja",
      "reason_pooja",
      "pooja_reason",
      "cant_perform_pooja",
      "cannot_perform",
    ].includes(normalized)
  ) {
    return "pooja_not_performed";
  }

  if (
    [
      "unavailable_personal",
      "personal",
      "unavailable",
      "not_available",
      "reason_personal",
      "personal_reason",
      "personal_issue",
      "personal_reasons",
      "not_feeling_well",
      "health_issue",
    ].includes(normalized)
  ) {
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
    await autoCancelExpiredBookings();
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
      .populate("pandit", "fullName phone profileImage ratingAverage yearsOfExperience languagesSpoken poojaOfferings")
      .populate("user", "name phone email profileImage")
      .populate("ritualRef", "title description image durationHours status")
      .populate("temple", "name image description address contactPhone contactPerson")
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
      .populate("ritualRef", "title description image durationHours status")
      .populate("temple", "name image address")
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

    // Send notification to user about booking confirmation
    await notifyPanditBookingStatusUpdate(
      booking.user._id,
      booking._id,
      "confirmed",
      { _id: req.pandit._id, name: req.pandit.fullName || "Pandit" },
      booking.ritualRef?.title || "Ritual"
    );

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

export const completePanditBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { completionNote = "" } = req.body || {};

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
      .populate("ritualRef", "title description image durationHours status")
      .populate("temple", "name image address")
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
        message: "Cancelled booking cannot be completed",
      });
    }

    if (booking.bookingStatus === "completed") {
      return res.status(400).json({
        success: false,
        message: "Booking is already completed",
      });
    }

    booking.bookingStatus = "completed";
    booking.completedAt = new Date();
    
    if (String(completionNote || "").trim()) {
      booking.notes = booking.notes
        ? `${booking.notes}\nCompletion note: ${String(completionNote).trim()}`
        : `Completion note: ${String(completionNote).trim()}`;
    }

    await booking.save();

    // Send notification to user about booking completion
    await notifyPanditBookingStatusUpdate(
      booking.user._id,
      booking._id,
      "completed",
      { _id: req.pandit._id, name: req.pandit.fullName || "Pandit" },
      booking.ritualRef?.title || "Ritual"
    );

    return res.json({
      success: true,
      message: "Booking marked as completed successfully",
      data: booking,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to complete booking",
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
          // "reasonType is required. Allowed values: time_slot_already_booked, location_too_far, pooja_not_performed, unavailable_personal, other",
          "reasonType is required. Allowed values: time_slot_already_booked, location_too_far, pooja_not_performed, unavailable_personal, other",
      });
    }

    const effectiveNote = resolvedNote || "Auto note: rejection submitted by pandit app.";

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
      .populate("ritualRef", "title description image durationHours status")
      .populate("temple", "name image address")
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
      note: effectiveNote,
      decidedAt: new Date(),
    };

    const rejectSummary =
      resolvedReasonType === "other"
        ? `Rejected by pandit: other - ${resolvedOtherReason}`
        : `Rejected by pandit: ${resolvedReasonType}`;

    booking.notes = booking.notes
      ? `${booking.notes}\n${rejectSummary}\nPandit note: ${effectiveNote}`
      : `${rejectSummary}\nPandit note: ${effectiveNote}`;

    await booking.save();

    // Send notification to user about booking cancellation
    await notifyPanditBookingStatusUpdate(
      booking.user._id,
      booking._id,
      "cancelled",
      { _id: req.pandit._id, name: req.pandit.fullName || "Pandit" },
      booking.ritualRef?.title || "Ritual"
    );

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

export const cancelPanditBookingByUser = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason = "", notes = "" } = req.body || {};

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking id",
      });
    }

    const resolvedReason = normalizeRequestReason(reason);

    const booking = await PanditBooking.findOne({
      _id: bookingId,
      user: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.bookingStatus === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Booking already cancelled",
      });
    }

    if (booking.bookingStatus === "completed") {
      return res.status(400).json({
        success: false,
        message: "Completed booking cannot be cancelled",
      });
    }

    booking.bookingStatus = "cancelled";
    booking.cancellationRequests = booking.cancellationRequests || [];
    booking.cancellationRequests.push({
      reason: resolvedReason,
      notes: normalizeRequestNotes(notes),
      requestedBy: "user",
      requestedAt: new Date(),
    });

    // 2. Refund money to user's wallet if paid
    let refundCredited = false;
    let refundAmount = 0;
    if (booking.payment?.status === "paid" && (booking.bookingAmount > 0 || booking.dakshinaAmount > 0)) {
      const userId = booking.user;
      
      let wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        wallet = await Wallet.create({ user: userId, balance: 0 });
      }

      refundAmount = Number(booking.bookingAmount || booking.dakshinaAmount || 0);
      wallet.balance = Number((wallet.balance + refundAmount).toFixed(2));
      await wallet.save();

      await WalletTransaction.create({
        wallet: wallet._id,
        user: userId,
        type: "credit",
        source: "refund",
        amount: refundAmount,
        balanceAfter: wallet.balance,
        reference: `REFUND_${booking._id}`,
        notes: `Refund for cancelled Pandit booking: ${booking.ritual?.name || "Ritual"}`,
        meta: {
          bookingId: booking._id,
          reason: "user_cancelled",
        },
      });

      try {
        await Complaint.create({
          user: userId,
          booking: booking._id,
          issue: "Pandit Booking Cancellation Refund",
          details: `Refund of ₹${refundAmount} credited to user wallet for cancelled Pandit booking. Ritual: "${booking.ritual?.name || "Ritual"}".`,
          status: "Resolved",
          adminResponse: `Refunded ₹${refundAmount} directly to user's wallet upon cancellation.`,
        });
      } catch (complaintErr) {
        console.error("Error logging user cancellation refund complaint:", complaintErr.message || complaintErr);
      }

      if (booking.payment) {
        booking.payment.status = "refunded";
      }
      refundCredited = true;
    }

    await booking.save();

    // Send notification to pandit
    try {
      if (booking.pandit) {
        await notifyPanditBookingAction(
          booking.pandit,
          booking._id,
          "user_cancelled",
          { _id: req.user._id, name: req.user.name || req.user.phone || "User" },
          booking.ritual?.name || "Ritual"
        );
      }
    } catch (e) {
      console.error("Error sending booking cancelled notification to pandit:", e.message || e);
    }

    void notifyAdmins({
      title: "Pandit booking cancelled by user",
      body: `${req.user?.name || req.user?.phone || "A user"} cancelled booking ${String(booking._id).slice(-6)}`,
      data: {
        eventType: "pandit.booking.cancelled",
        bookingId: String(booking._id),
        userId: String(req.user._id),
        refundRequested: true,
      },
    }).catch((error) => console.error("PANDIT BOOKING CANCEL NOTIFICATION ERROR:", error.message));

    return res.json({
      success: true,
      message: refundCredited ? `Booking cancelled and ₹${refundAmount} refunded to your wallet` : "Booking cancelled successfully",
      note: refundCredited ? "Your money has been refunded to your wallet." : "Your money will be refunded to your wallet within 48 hours.",
      data: booking,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to cancel booking",
    });
  }
};

export const reschedulePanditBookingByUser = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const {
      ritualId = "",
      ritualName = "",
      ritualDescription = "",
      ritualImage = "",
      bookingMode,
      panditId,
      bookingDate = "",
      dateAndTime,
      timeSlot,
      address,
      templeId = "",
      price,
      reason = "",
      notes = "",
    } = req.body || {};

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking id",
      });
    }

    // const resolvedReason = normalizeRequestReason(reason);
    // if (!resolvedReason) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "reason is required",
    //   });
    // }

    const booking = await PanditBooking.findOne({
      _id: bookingId,
      user: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.bookingStatus === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled booking cannot be rescheduled",
      });
    }

    if (booking.bookingStatus === "completed") {
      return res.status(400).json({
        success: false,
        message: "Completed booking cannot be rescheduled",
      });
    }

    const fallbackFromTimeSlot = timeSlot
      ? [
          {
            date: bookingDate || "",
            time: timeSlot?.time || timeSlot?.label || timeSlot?.startTime || "",
          },
        ]
      : [];

    const normalizedDateAndTime = normalizeDateAndTimePayload(
      dateAndTime || fallbackFromTimeSlot,
      bookingDate,
    );

    if (normalizedDateAndTime.length) {
      const primaryDateAndTime = normalizedDateAndTime[0];
      const resolvedBookingDate = normalizeDateString(bookingDate || primaryDateAndTime?.date || "");

      if (!resolvedBookingDate) {
        return res.status(400).json({
          success: false,
          message: "dateAndTime[0].date is required when bookingDate is not provided",
        });
      }

      const nextPanditId = panditId || booking.pandit;
      if (!mongoose.Types.ObjectId.isValid(nextPanditId)) {
        return res.status(400).json({
          success: false,
          message: "Valid panditId is required",
        });
      }

      const selectedPandit = await Pandit.findOne({
        _id: nextPanditId,
        status: "active",
        isVerified: true,
      });

      if (!selectedPandit) {
        return res.status(400).json({
          success: false,
          message: "Selected pandit is not available",
        });
      }

      const conflicting = await PanditBooking.findOne({
        ...getBookedSlotConflictQuery({
          panditId: selectedPandit._id,
          bookingDate: resolvedBookingDate,
          slotDate: primaryDateAndTime.date,
          slotTime: primaryDateAndTime.time,
        }),
        _id: { $ne: booking._id },
      });

      if (conflicting) {
        return res.status(409).json({
          success: false,
          message: "Selected slot is already booked. Please choose another slot.",
        });
      }

      booking.bookingDate = resolvedBookingDate;
      booking.dateAndTime = { dateAndTime: normalizedDateAndTime };
      booking.pandit = selectedPandit._id;
    }

    if (bookingMode !== undefined) {
      booking.bookingMode = String(bookingMode || "").trim() || booking.bookingMode;
    }

    if (ritualId) {
      if (!mongoose.Types.ObjectId.isValid(ritualId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid ritualId",
        });
      }

      const selectedRitual = await Ritual.findOne({
        _id: ritualId,
        status: "active",
      });

      if (!selectedRitual) {
        return res.status(404).json({
          success: false,
          message: "Ritual not found or inactive",
        });
      }

      booking.ritualRef = selectedRitual._id;
      booking.ritual = {
        name: selectedRitual.title || "",
        description: selectedRitual.description || "",
        image: selectedRitual.image || "",
      };
    } else if (ritualName || ritualDescription || ritualImage) {
      booking.ritual = {
        ...booking.ritual,
        ...(ritualName ? { name: String(ritualName).trim() } : {}),
        ...(ritualDescription ? { description: String(ritualDescription).trim() } : {}),
        ...(ritualImage ? { image: String(ritualImage).trim() } : {}),
      };
    }

    if (templeId) {
      if (!mongoose.Types.ObjectId.isValid(templeId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid templeId",
        });
      }

      const selectedTemple = await temple.findOne({
        _id: templeId,
        status: "active",
      });

      if (!selectedTemple) {
        return res.status(404).json({
          success: false,
          message: "Temple not found or inactive",
        });
      }

      booking.temple = selectedTemple._id;
      booking.templeSnapshot = {
        name: selectedTemple.name || "",
        image: selectedTemple.image || "",
        city: selectedTemple.address?.city || "",
        state: selectedTemple.address?.state || "",
        line1: selectedTemple.address?.line1 || "",
        landmark: selectedTemple.address?.landmark || "",
      };
      booking.address = {
        name: selectedTemple.name || "",
        phone: selectedTemple.contactPhone || "",
        secondPhone: selectedTemple.phone || "",
        email: selectedTemple.email || "",
        fullAddress: [
          String(selectedTemple.address?.line1 || "").trim(),
          String(selectedTemple.address?.line2 || "").trim(),
          String(selectedTemple.address?.landmark || "").trim(),
        ]
          .filter(Boolean)
          .join(", "),
        addressType: "temple",
        city: selectedTemple.address?.city || "",
        state: selectedTemple.address?.state || "",
        pincode: selectedTemple.address?.pinCode || "",
      };
    } else if (address && typeof address === "object") {
      booking.address = normalizeBookingAddress(address);
    }

    if (price !== undefined) {
      booking.price = Number(price || booking.price || 0);
    }

    const resolvedReason = normalizeRequestReason(reason);
    const resolvedNotes = normalizeRequestNotes(notes);

    booking.bookingStatus = "reschedule_requested";
    booking.rescheduleRequests = booking.rescheduleRequests || [];
    booking.rescheduleRequests.push({
      reason: resolvedReason,
      notes: resolvedNotes,
      requestedBy: "user",
      requestedAt: new Date(),
    });

    await booking.save();

    return res.json({
      success: true,
      message: "Reschedule request submitted",
      data: booking,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to reschedule booking",
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

export const createWalletTransaction = async (wallet, amount, type, reference, notes, meta) => {
  const transaction = await WalletTransaction.create({
    wallet: wallet._id,
    user: wallet.user,
    type,
    source: meta?.source || "pandit_booking",
    amount,
    balanceAfter: wallet.balance,
    reference,
    notes,
    meta,
  });

  return transaction;
};

export const createPanditBookingWithWallet = async (req, res) => {
  try {
    const {
      ritualId = "",
      ritualName,
      ritualDescription = "",
      ritualImage = "",
      bookingMode,
      panditId,
      bookingDate,
      dateAndTime,
      timeSlot,
      address = {},
      templeId = "",
      recommendedKitId = null,
    } = req.body;

    const fallbackFromTimeSlot = timeSlot
      ? [
          {
            date: bookingDate || "",
            time: timeSlot?.time || timeSlot?.label || timeSlot?.startTime || "",
          },
        ]
      : [];

    const normalizedDateAndTime = normalizeDateAndTimePayload(
      dateAndTime || fallbackFromTimeSlot,
      bookingDate,
    );

    if (!bookingMode || !normalizedDateAndTime.length) {
      return res.status(400).json({
        success: false,
        message: "bookingMode and dateAndTime are required",
      });
    }

    const primaryDateAndTime = normalizedDateAndTime[0];
    const resolvedBookingDate = normalizeDateString(bookingDate || primaryDateAndTime?.date || "");

    if (!resolvedBookingDate) {
      return res.status(400).json({
        success: false,
        message: "dateAndTime[0].date is required when bookingDate is not provided",
      });
    }

    const resolvedAssignType = panditId ? "choosePandit" : "bestAvailable";

    let selectedRitual = null;
    if (ritualId) {
      if (!mongoose.Types.ObjectId.isValid(ritualId)) {
        return res.status(400).json({ success: false, message: "Invalid ritualId" });
      }
      selectedRitual = await Ritual.findOne({ _id: ritualId, status: "active" });
      if (!selectedRitual) {
        return res.status(404).json({ success: false, message: "Ritual not found or inactive" });
      }
    }

    if (!selectedRitual && !ritualName?.trim()) {
      return res.status(400).json({ success: false, message: "ritualName or ritualId is required" });
    }

    let selectedtemple = null;
    if (bookingMode === "temple") {
      if (!templeId || !mongoose.Types.ObjectId.isValid(templeId)) {
        return res.status(400).json({ success: false, message: "Valid templeId is required for temple booking" });
      }
      selectedtemple = await temple.findOne({ _id: templeId, status: "active" });
      if (!selectedtemple) {
        return res.status(404).json({ success: false, message: "Temple not found or inactive" });
      }
    }

    let selectedPandit = null;
    if (resolvedAssignType === "choosePandit") {
      if (!mongoose.Types.ObjectId.isValid(panditId)) {
        return res.status(400).json({ success: false, message: "Valid panditId is required" });
      }
      selectedPandit = await Pandit.findOne({ _id: panditId, status: "active", isVerified: true });
    } else {
      const filter = buildPanditFilter({ ritual: selectedRitual?.title || ritualName, mode: bookingMode });
      selectedPandit = await Pandit.findOne(filter).sort({ ratingAverage: -1, yearsOfExperience: -1 });
    }

    if (!selectedPandit) {
      return res.status(400).json({ success: false, message: "No suitable pandit available" });
    }

    const conflicting = await PanditBooking.findOne(
      getBookedSlotConflictQuery({
        panditId: selectedPandit._id,
        bookingDate: resolvedBookingDate,
        slotDate: primaryDateAndTime.date,
        slotTime: primaryDateAndTime.time,
      }),
    );

    if (conflicting) {
      return res.status(409).json({ success: false, message: "Selected slot is already booked" });
    }

    const bookingPrice = await getActiveBookingPrice();
    const userWallet = await Wallet.findOne({ user: req.user._id });

    if (!userWallet || userWallet.balance < bookingPrice) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
        data: {
          required: bookingPrice,
          balance: userWallet?.balance || 0,
        },
      });
    }

    const resolvedBookingAddress = selectedtemple
      ? {
          name: selectedtemple.name || "",
          phone: selectedtemple.contactPhone || "",
          fullAddress: [
            String(selectedtemple.address?.line1 || "").trim(),
            String(selectedtemple.address?.line2 || "").trim(),
            String(selectedtemple.address?.landmark || "").trim(),
          ].filter(Boolean).join(", "),
          addressType: "temple",
          city: selectedtemple.address?.city || "",
          state: selectedtemple.address?.state || "",
          pincode: selectedtemple.address?.pinCode || "",
        }
      : normalizeBookingAddress(address);

    const transactionId = `WALLET_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    const createdBooking = await PanditBooking.create({
      user: req.user._id,
      pandit: selectedPandit._id,
      ritual: {
        name: selectedRitual?.title || ritualName.trim(),
        description: selectedRitual?.description || ritualDescription,
        image: selectedRitual?.image || ritualImage,
      },
      ritualRef: selectedRitual?._id || null,
      bookingMode,
      bookingDate: resolvedBookingDate,
      dateAndTime: { dateAndTime: normalizedDateAndTime },
      address: resolvedBookingAddress,
      temple: selectedtemple?._id || null,
      templeSnapshot: selectedtemple ? {
        name: selectedtemple.name || "",
        image: selectedtemple.image || "",
        city: selectedtemple.address?.city || "",
        state: selectedtemple.address?.state || "",
        line1: selectedtemple.address?.line1 || "",
        landmark: selectedtemple.address?.landmark || "",
      } : {},
      dakshinaAmount: bookingPrice,
      bookingAmount: bookingPrice,
      recommendedKit: recommendedKitId && mongoose.Types.ObjectId.isValid(recommendedKitId) ? recommendedKitId : null,
      payment: {
        status: "paid",
        method: "WALLET",
        gateway: "wallet",
        transactionId,
        paidAt: new Date(),
      },
      bookingStatus: "requested",
    });

    userWallet.balance -= bookingPrice;
    await userWallet.save();

    await createWalletTransaction(
      userWallet,
      bookingPrice,
      "debit",
      createdBooking._id,
      `Pandit booking: ${createdBooking.ritual.name}`,
      { bookingId: createdBooking._id, panditId: selectedPandit._id }
    );

    // create zoom meeting after payment-confirmation if not present
    try {
      if (createdBooking?.payment?.status === "paid") {
        const zoom = await ensureZoomMeetingForBooking(createdBooking);
        if (zoom) {
          createdBooking.zoomMeeting = zoom;
          await createdBooking.save();
        }
      }
    } catch (e) {
      console.error("Error creating zoom meeting after wallet booking:", e.message || e);
    }

    // Send notifications to pandit and user
    try {
      if (createdBooking.pandit) {
        await notifyPanditBookingAction(
          createdBooking.pandit,
          createdBooking._id,
          "booking_requested",
          { _id: req.user._id, name: req.user.name || req.user.phone || "User" },
          createdBooking.ritual?.name || "Ritual"
        );

        const panditName = selectedPandit.fullName || selectedPandit.name || "Pandit";
        await notifyPanditBookingStatusUpdate(
          createdBooking.user,
          createdBooking._id,
          "requested",
          { _id: selectedPandit._id, name: panditName },
          createdBooking.ritual?.name || "Ritual"
        );
      }
    } catch (e) {
      console.error("Error sending booking notifications:", e.message || e);
    }

    const booking = await PanditBooking.findById(createdBooking._id)
      .populate("pandit", "fullName phone profileImage ratingAverage yearsOfExperience languagesSpoken")
      .populate("temple", "name image description address contactPhone contactPerson")
      .populate("ritualRef", "title description image durationHours status")
      .populate("recommendedKit", "name image kitPrice");

    void notifyAdmins({
      title: "Pandit booking requested (Wallet)",
      body: `${req.user.name || req.user.phone} booked ${booking?.ritual?.name || "a ritual"} via wallet`,
      data: {
        eventType: "pandit.booking.requested.wallet",
        bookingId: String(booking._id),
        userId: String(req.user._id),
      },
    }).catch(console.error);

    res.status(201).json({
      success: true,
      message: "Booking successful with wallet payment",
      data: booking,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Unable to create booking with wallet",
    });
  }
};

const getIndianDateString = () => {
  const d = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); // Shift to India time (UTC+5.5)
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const autoCancelExpiredBookings = async () => {
  try {
    const pricing = await BookingPricing.findOne({ isActive: true }).lean();
    const durationHours = pricing?.autoCancelDurationHours || 1;
    const cutoffTime = new Date(Date.now() - durationHours * 60 * 60 * 1000);
    const today = getIndianDateString();
    
    // Find all requested bookings that either:
    // a) bookingDate is strictly in the past, or
    // b) createdAt is older than cutoffTime
    const expiredBookings = await PanditBooking.find({
      bookingStatus: "requested",
      $or: [
        { bookingDate: { $lt: today, $ne: "" } },
        { createdAt: { $lt: cutoffTime } },
      ],
    });

    if (expiredBookings.length === 0) return;

    console.log(`[Auto-Cancel] Found ${expiredBookings.length} expired bookings (duration threshold: ${durationHours}h).`);

    const Notification = (await import("../models/notification.model.js")).default;
    const admin = (await import("firebase-admin")).default;
    const User = (await import("../models/user.model.js")).default;

    for (const booking of expiredBookings) {
      try {
        // 1. Update booking status
        booking.bookingStatus = "cancelled";
        booking.notes = booking.notes
          ? `${booking.notes}\n[System Auto-Cancelled] Booking expired: Pandit did not accept request on time.`
          : `[System Auto-Cancelled] Booking expired: Pandit did not accept request on time.`;
        
        booking.cancellationRequests = booking.cancellationRequests || [];
        booking.cancellationRequests.push({
          reason: "Booking expired: Pandit did not accept request within the time frame.",
          notes: "System automatic cancellation due to expiration of booking date.",
          requestedBy: "system",
          requestedAt: new Date(),
        });

        await booking.save();

        // 2. Refund money to user's wallet if paid
        if (booking.payment?.status === "paid" && (booking.bookingAmount > 0 || booking.dakshinaAmount > 0)) {
          const userId = booking.user;
          
          let wallet = await Wallet.findOne({ user: userId });
          if (!wallet) {
            wallet = await Wallet.create({ user: userId, balance: 0 });
          }

          const refundAmount = Number(booking.bookingAmount || booking.dakshinaAmount || 0);
          wallet.balance = Number((wallet.balance + refundAmount).toFixed(2));
          await wallet.save();

          await WalletTransaction.create({
            wallet: wallet._id,
            user: userId,
            type: "credit",
            source: "refund",
            amount: refundAmount,
            balanceAfter: wallet.balance,
            reference: `REFUND_${booking._id}`,
            notes: `Refund for expired Pandit booking: ${booking.ritual?.name || "Ritual"}`,
            meta: {
              bookingId: booking._id,
              reason: "auto_cancellation_expired",
            },
          });

          try {
            await Complaint.create({
              user: userId,
              booking: booking._id,
              issue: "Pandit Booking Expired Refund",
              details: `Refund of ₹${refundAmount} credited to user wallet for expired Pandit booking. Ritual: "${booking.ritual?.name || "Ritual"}".`,
              status: "Resolved",
              adminResponse: `Refunded ₹${refundAmount} directly to user's wallet due to booking expiration.`,
            });
          } catch (complaintErr) {
            console.error("Error logging auto cancellation refund complaint:", complaintErr.message || complaintErr);
          }

          // 3. Send notification to user
          const title = "Booking Cancelled & Refunded";
          const body = `Your booking for ${booking.ritual?.name || "Ritual"} has been cancelled as it was not accepted on time. Rs ${refundAmount} has been refunded to your wallet.`;

          const notifUser = new Notification({
            title,
            body,
            data: { bookingId: String(booking._id), status: "cancelled", refunded: true, refundAmount },
            audience: { type: "user", ids: [userId] },
          });
          await notifUser.save();

          const userDoc = await User.findById(userId).lean();
          if (userDoc?.fcmToken) {
            const message = {
              notification: { title, body },
              data: { 
                bookingId: String(booking._id), 
                status: "cancelled", 
                refunded: "true", 
                refundAmount: String(refundAmount) 
              },
              token: userDoc.fcmToken,
            };
            await admin.messaging().send(message);
          }
        } else {
          // If not paid, just send standard cancellation notification
          const title = "Booking Cancelled";
          const body = `Your booking request for ${booking.ritual?.name || "Ritual"} has expired and has been cancelled.`;

          const notifUser = new Notification({
            title,
            body,
            data: { bookingId: String(booking._id), status: "cancelled" },
            audience: { type: "user", ids: [booking.user] },
          });
          await notifUser.save();

          const userDoc = await User.findById(booking.user).lean();
          if (userDoc?.fcmToken) {
            const message = {
              notification: { title, body },
              data: { bookingId: String(booking._id), status: "cancelled" },
              token: userDoc.fcmToken,
            };
            await admin.messaging().send(message);
          }
        }
        console.log(`[Auto-Cancel] Booking ${booking._id} cancelled and refunded/notified successfully.`);
      } catch (innerErr) {
        console.error(`[Auto-Cancel] Error cancelling booking ${booking._id}:`, innerErr.message || innerErr);
      }
    }
  } catch (err) {
    console.error("[Auto-Cancel] Global error in autoCancelExpiredBookings:", err.message || err);
  }
};

export const addPanditBookingReview = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rating, comment = "" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await PanditBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Verify booking is completed
    if (booking.bookingStatus !== "completed") {
      return res.status(400).json({
        success: false,
        message: "You can only review completed bookings",
      });
    }

    // Verify user owns the booking
    if (String(booking.user) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to review this booking",
      });
    }

    // Validate rating
    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5",
      });
    }

    // Check if review already exists for this booking
    const existingReview = await PanditReview.findOne({ booking: bookingId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this booking",
      });
    }

    // Create review
    // const review = await PanditReview.create({
    //   pandit: booking.pandit,
    //   user: req.user._id,
    //   booking: bookingId,
    //   rating: numRating,
    //   comment: String(comment || "").trim(),
    // });
    // Create review
    const review = await PanditReview.create({
      pandit: booking.pandit,
      user: req.user._id,
      booking: bookingId,
      rating: numRating,
      comment: String(comment || "").trim(),
    });

    // Update booking review status
    await PanditBooking.findByIdAndUpdate(bookingId, {
      isUserReview: true,
    });

    // Recalculate average rating and rating count for Pandit
    const stats = await PanditReview.aggregate([
      { $match: { pandit: booking.pandit } },
      {
        $group: {
          _id: "$pandit",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    let ratingAverage = 4.5;
    let ratingCount = 0;

    if (stats.length > 0) {
      ratingAverage = Number(stats[0].averageRating.toFixed(1));
      ratingCount = stats[0].totalReviews;
    }

    await Pandit.findByIdAndUpdate(booking.pandit, {
      ratingAverage,
      ratingCount,
    });

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: review,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to submit review",
    });
  }
};



// export const getMyPanditBookings = async (req, res) => {
//   try {
//     const bookings = await PanditBooking.find({
//       user: req.user._id,
//     })
//       .populate("pandit", "name profileImage ratingAverage ratingCount")
//       .sort({ createdAt: -1 });

//     return res.status(200).json({
//       success: true,
//       count: bookings.length,
//       data: bookings,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };