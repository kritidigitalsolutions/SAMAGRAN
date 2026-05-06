import jwt from "jsonwebtoken";
import Pandit from "../../models/pandit.model.js";
import PanditOTP from "../../models/panditOtp.model.js";
import { login } from "../auth.controller.js";
import { notifyAdmins, updateDeviceToken } from "../../utils/notification.service.js";
import { uploadFileToFirebase } from "../../utils/firebaseUpload.js";

const validatePhone = (phone) => /^[6-9]\d{9}$/.test(phone);
const normalizeName = (value = "") => String(value || "").trim().toLowerCase();

const generatePanditToken = (panditId) => {
  return jwt.sign(
    {
      id: panditId,
      role: "pandit",
      isAdmin: false,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "30d",
    }
  );
};

const buildOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const parseJsonIfString = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  return value;
};

const normalizeLanguages = (languagesInput) => {
  if (Array.isArray(languagesInput)) {
    return languagesInput
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof languagesInput === "string") {
    return languagesInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeNotesInput = (notes) => {
  if (Array.isArray(notes)) {
    return notes;
  }

  if (typeof notes === "string") {
    return [notes];
  }

  return [];
};

const sanitizeCustomSamagriNotes = (notes = []) => {
  if (!Array.isArray(notes)) {
    return [];
  }

  return notes.map((note) => String(note || "").trim()).filter(Boolean);
};

const toCustomSamagriItem = (item = {}) => ({
  ...(item && item._id ? { _id: item._id } : {}),
  itemName: String(item?.itemName || item?.name || "").trim(),
  quantity: Math.max(1, Number(item?.quantity || 1)),
  size: String(item?.size || "").trim(),
  approvalStatus: ["approved", "rejected"].includes(String(item?.approvalStatus || "").trim())
    ? String(item.approvalStatus).trim()
    : "pending",
  reviewedAt: item?.reviewedAt || null,
  reviewedBy: String(item?.reviewedBy || "").trim(),
});

const sanitizeCustomSamagriItems = (items = []) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map(toCustomSamagriItem)
    .filter((item) => item.itemName);
};

const normalizePoojaOfferingEntry = (entry) => {
  if (typeof entry === "string") {
    return {
      name: entry.trim(),
      isSelected: true,
    };
  }

  if (!entry || typeof entry !== "object") {
    return null;
  }

  const hasNotes = Object.prototype.hasOwnProperty.call(entry, "customSamagriNotes");
  const hasItems = Object.prototype.hasOwnProperty.call(entry, "customSamagriItems");

  return {
    name: String(entry?.name || entry?.title || "").trim(),
    description: String(entry?.description || "").trim(),
    isSelected:
      entry?.isSelected !== undefined
        ? Boolean(entry.isSelected)
        : true,
    durationHours: Number(entry?.durationHours || 0),
    travelForSpecialPooja: Boolean(entry?.travelForSpecialPooja),
    standardSamagri: Boolean(entry?.standardSamagri),
    customSamagri: Boolean(entry?.customSamagri),
    ...(hasNotes
      ? { customSamagriNotes: sanitizeCustomSamagriNotes(normalizeNotesInput(entry.customSamagriNotes)) }
      : {}),
    ...(hasItems
      ? { customSamagriItems: sanitizeCustomSamagriItems(entry.customSamagriItems) }
      : {}),
  };
};

const normalizePoojaOfferingsInput = (body) => {
  const fromPrimary = parseJsonIfString(body?.poojaOfferings, null);
  const fromAlternate = parseJsonIfString(body?.rituals, null);
  const source = fromPrimary ?? fromAlternate;

  if (Array.isArray(source)) {
    return source
      .map(normalizePoojaOfferingEntry)
      .filter((entry) => entry?.name);
  }

  // Supports multipart keys like poojaOfferings[0][name], poojaOfferings[0][isSelected]
  const grouped = {};
  Object.entries(body || {}).forEach(([key, value]) => {
    const match = key.match(/^poojaOfferings\[(\d+)\]\[(\w+)\]$/);
    if (!match) {
      return;
    }

    const index = Number(match[1]);
    const field = match[2];
    grouped[index] = grouped[index] || {};
    grouped[index][field] = value;
  });

  const fromGrouped = Object.keys(grouped)
    .map((idx) => grouped[Number(idx)])
    .map((entry) => ({
      name: String(entry?.name || entry?.title || "").trim(),
      description: String(entry?.description || "").trim(),
      isSelected:
        entry?.isSelected !== undefined
          ? String(entry.isSelected).toLowerCase() === "true"
          : true,
      durationHours: Number(entry?.durationHours || 0),
      travelForSpecialPooja: String(entry?.travelForSpecialPooja || "").toLowerCase() === "true",
      standardSamagri: String(entry?.standardSamagri || "").toLowerCase() === "true",
      customSamagri: String(entry?.customSamagri || "").toLowerCase() === "true",
    }))
    .filter((entry) => entry.name);

  return fromGrouped;
};

const isPanditProfileComplete = (pandit) => {
  const hasBasicInfo =
    Boolean(pandit.fullName?.trim()) &&
    Boolean(pandit.address?.line1?.trim()) &&
    Boolean(pandit.address?.city?.trim()) &&
    Boolean(pandit.address?.state?.trim()) &&
    Boolean(pandit.address?.pinCode?.trim()) &&
    Number(pandit.yearsOfExperience || 0) > 0;

  const hasAadhaarInfo =
    Boolean(pandit.aadhaar?.number?.trim()) &&
    Boolean(pandit.aadhaar?.frontImage?.trim()) &&
    Boolean(pandit.aadhaar?.backImage?.trim()) &&
    Boolean(pandit.aadhaar?.consentGiven);

  const hasServiceSelection =
    Boolean(pandit.serviceTypes?.onlinePooja) ||
    Boolean(pandit.serviceTypes?.homeVisit) ||
    Boolean(pandit.serviceTypes?.atTemple) ||
    Boolean(pandit.serviceTypes?.travelForSpecialPoojas);

  return hasBasicInfo && hasAadhaarInfo && hasServiceSelection;
};

export const requestPanditOtp = async (req, res) => {
  try {
    let { phone, fullName = "" } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone is required",
      });
    }

    phone = String(phone).replace(/\s+/g, "").trim();

    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be 10 digits",
      });
    }

    const existingPandit = await Pandit.findOne({ phone });
    const authType = existingPandit ? "login" : "signup";

    const otp = buildOtp();

    await PanditOTP.findOneAndUpdate(
      { phone, type: authType },
      {
        phone,
        otp,
        type: authType,
        fullName: fullName?.trim() || existingPandit?.fullName || "",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        isVerified: false,
        verifiedAt: null,
      },
      { upsert: true, new: true }
    );

    await PanditOTP.deleteMany({ phone, type: authType === "signup" ? "login" : "signup" });

    res.json({
      success: true,
      isNewPandit: !existingPandit,
      flow: authType,
      message: `OTP sent for pandit ${authType}`,
      data: {
        OTP: otp,
      },
    });
  } catch (err) {
    console.error("PANDIT REQUEST OTP ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const verifyPanditOtp = async (req, res) => {
  try {
    let { phone, otp, type } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: "phone and otp are required",
      });
    }

    phone = String(phone).replace(/\s+/g, "").trim();

    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    if (type !== undefined) {
      type = String(type).trim().toLowerCase();
    }

    if (type !== undefined && !["signup", "login"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP type",
      });
    }

    const otpQuery = { phone };
    if (type) {
      otpQuery.type = type;
    }

    const otpDoc = await PanditOTP.findOne(otpQuery).sort({ createdAt: -1 });

    if (!otpDoc) {
      return res.status(400).json({
        success: false,
        message: "OTP not found",
      });
    }

    if (otpDoc.otp !== String(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (otpDoc.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    const pandit = await Pandit.findOne({ phone });

    otpDoc.isVerified = true;
    otpDoc.verifiedAt = new Date();
    await otpDoc.save();

    if (!pandit && otpDoc.type !== "signup") {
      return res.status(400).json({
        success: false,
        message: "Pandit not found",
      });
    }

    await PanditOTP.deleteMany({ phone, type: otpDoc.type });

    if (!pandit) {
      const createdPandit = await Pandit.create({
        phone,
        fullName: otpDoc.fullName || "",
        isPhoneVerified: true,
      });

      void notifyAdmins({
        title: "New pandit account created",
        body: `${createdPandit.fullName || createdPandit.phone || "A pandit"} signed up`,
        data: {
          eventType: "pandit.signup",
          panditId: String(createdPandit._id),
          phone: createdPandit.phone,
        },
      }).catch((error) => console.error("PANDIT SIGNUP NOTIFICATION ERROR:", error.message));

      return res.json({
        success: true,
        isNewPandit: true,
        message: "Signup successful, please complete your profile",
        data: {
          phone,
          flow: "signup",
        },
      });
    }

    let token = null;
    if (pandit.isPhoneVerified) {
      token = generatePanditToken(pandit._id);
      await PanditOTP.deleteMany({ phone: pandit.phone });
    }
    
    return res.json({
      success: true,
      isNewPandit: false,
      message: pandit.isProfileComplete
        ? "Login verified successfully"
        : "Login verified, please complete remaining profile details",
      data: {
        flow: "login",
        token,
        pandit,
      },
    });


  } catch (err) {
    console.error("PANDIT VERIFY OTP ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getPanditProfile = async (req, res) => {
  try {
    const pandit = await Pandit.findById(req.pandit._id);

    if (!pandit) {
      return res.status(404).json({
        success: false,
        message: "Pandit not found",
      });
    }

    res.json({
      success: true,
      data: pandit,
    });
  } catch (err) {
    console.error("GET PANDIT PROFILE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const updatePanditProfile = async (req, res) => {
  try {
    const body = req.body || {};
    let pandit = null;

    if (req.pandit?._id) {
      pandit = await Pandit.findById(req.pandit._id);
    } else {
      let { phone = "" } = body;
      phone = String(phone).replace(/\s+/g, "").trim();

      if (!validatePhone(phone)) {
        return res.status(400).json({
          success: false,
          message: "Valid phone is required",
        });
      }

      

      const validSession = await PanditOTP.findOne({
        phone,
        isVerified: true,
      }).sort({ verifiedAt: -1 });

      pandit = await Pandit.findOne({ phone });

      if (!pandit) {
        pandit = await Pandit.create({
          phone,
          fullName: validSession?.fullName || "",
          status: "active",
        });
      }
    }

    if (!pandit) {
      return res.status(404).json({
        success: false,
        message: "Pandit not found",
      });
    }

    const {
      fullName,
      yearsOfExperience,
      templeAssociated,
      languagesSpoken,
      address,
      aadhaar,
      serviceTypes,
      poojaOfferings,
    } = body;

    if (typeof fullName === "string") {
      pandit.fullName = fullName.trim();
    }

    if (yearsOfExperience !== undefined) {
      pandit.yearsOfExperience = Number(yearsOfExperience || 0);
    }

    if (typeof templeAssociated === "string") {
      pandit.templeAssociated = templeAssociated.trim();
    }

    if (languagesSpoken !== undefined) {
      pandit.languagesSpoken = normalizeLanguages(languagesSpoken);
    }

    const parsedAddress = parseJsonIfString(address, {});
    if (parsedAddress && typeof parsedAddress === "object") {
      pandit.address = {
        ...pandit.address,
        line1: parsedAddress.line1 ?? pandit.address?.line1,
        line2: parsedAddress.line2 ?? pandit.address?.line2,
        city: parsedAddress.city ?? pandit.address?.city,
        state: parsedAddress.state ?? pandit.address?.state,
        pinCode: parsedAddress.pinCode ?? pandit.address?.pinCode,
      };
    }

    const parsedAadhaar = parseJsonIfString(aadhaar, {});
    if (parsedAadhaar && typeof parsedAadhaar === "object") {
      pandit.aadhaar = {
        ...pandit.aadhaar,
        number: parsedAadhaar.number ?? pandit.aadhaar?.number,
        consentGiven:
          parsedAadhaar.consentGiven !== undefined
            ? Boolean(parsedAadhaar.consentGiven)
            : pandit.aadhaar?.consentGiven,
      };
    }

    if (req.files?.aadhaarFrontImage?.[0]) {
      const uploadedFrontImage = await uploadFileToFirebase(req.files.aadhaarFrontImage[0], {
        folder: "pandits/aadhaar",
      });
      pandit.aadhaar = {
        ...pandit.aadhaar,
        frontImage: uploadedFrontImage || pandit.aadhaar?.frontImage,
      };
    }

    if (req.files?.aadhaarBackImage?.[0]) {
      const uploadedBackImage = await uploadFileToFirebase(req.files.aadhaarBackImage[0], {
        folder: "pandits/aadhaar",
      });
      pandit.aadhaar = {
        ...pandit.aadhaar,
        backImage: uploadedBackImage || pandit.aadhaar?.backImage,
      };
    }

    const profileImageFile =
      req.files?.profileImage?.[0] || req.files?.profile?.[0] || req.files?.avatar?.[0];
    if (profileImageFile) {
      const uploadedProfileImage = await uploadFileToFirebase(profileImageFile, {
        folder: "pandits/profile",
      });
      if (uploadedProfileImage) {
        pandit.profileImage = uploadedProfileImage;
      }
    }

    const parsedServiceTypes = parseJsonIfString(serviceTypes, {});
    if (parsedServiceTypes && typeof parsedServiceTypes === "object") {
      pandit.serviceTypes = {
        ...pandit.serviceTypes,
        onlinePooja:
          parsedServiceTypes.onlinePooja !== undefined
            ? Boolean(parsedServiceTypes.onlinePooja)
            : pandit.serviceTypes?.onlinePooja,
        homeVisit:
          parsedServiceTypes.homeVisit !== undefined
            ? Boolean(parsedServiceTypes.homeVisit)
            : pandit.serviceTypes?.homeVisit,
        atTemple:
          parsedServiceTypes.atTemple !== undefined
            ? Boolean(parsedServiceTypes.atTemple)
            : pandit.serviceTypes?.atTemple,
        travelForSpecialPoojas:
          parsedServiceTypes.travelForSpecialPoojas !== undefined
            ? Boolean(parsedServiceTypes.travelForSpecialPoojas)
            : pandit.serviceTypes?.travelForSpecialPoojas,
        detectedLocation: {
          city:
            parsedServiceTypes.detectedLocation?.city ??
            pandit.serviceTypes?.detectedLocation?.city,
          state:
            parsedServiceTypes.detectedLocation?.state ??
            pandit.serviceTypes?.detectedLocation?.state,
        },
        serviceDistance: {
          selected:
            parsedServiceTypes.serviceDistance?.selected ??
            pandit.serviceTypes?.serviceDistance?.selected,
          customKm:
            parsedServiceTypes.serviceDistance?.customKm !== undefined
              ? Number(parsedServiceTypes.serviceDistance.customKm || 0)
              : pandit.serviceTypes?.serviceDistance?.customKm,
        },
        outstationAvailability: {
          withinDistrict:
            parsedServiceTypes.outstationAvailability?.withinDistrict !== undefined
              ? Boolean(parsedServiceTypes.outstationAvailability.withinDistrict)
              : pandit.serviceTypes?.outstationAvailability?.withinDistrict,
          withinState:
            parsedServiceTypes.outstationAvailability?.withinState !== undefined
              ? Boolean(parsedServiceTypes.outstationAvailability.withinState)
              : pandit.serviceTypes?.outstationAvailability?.withinState,
          anywhereInIndia:
            parsedServiceTypes.outstationAvailability?.anywhereInIndia !== undefined
              ? Boolean(parsedServiceTypes.outstationAvailability.anywhereInIndia)
              : pandit.serviceTypes?.outstationAvailability?.anywhereInIndia,
        },
      };
    }

    const parsedPoojaOfferings = normalizePoojaOfferingsInput(body);
    if (Array.isArray(parsedPoojaOfferings) && parsedPoojaOfferings.length > 0) {
      const existingOfferings = Array.isArray(pandit.poojaOfferings) ? pandit.poojaOfferings : [];
      const offeringsMap = new Map(
        existingOfferings.map((offering) => [normalizeName(offering.name), offering])
      );

      pandit.poojaOfferings = parsedPoojaOfferings.map((offering) => {
        const existing = offeringsMap.get(normalizeName(offering.name));
        const existingPayload = existing?.toObject ? existing.toObject() : existing;
        const merged = { ...(existingPayload || {}), ...offering };

        if (offering.customSamagriNotes === undefined && existingPayload?.customSamagriNotes) {
          merged.customSamagriNotes = existingPayload.customSamagriNotes;
        }

        if (offering.customSamagriItems === undefined && existingPayload?.customSamagriItems) {
          merged.customSamagriItems = existingPayload.customSamagriItems;
        }

        return merged;
      });
    } else if (
      poojaOfferings !== undefined ||
      body?.rituals !== undefined ||
      Object.keys(body || {}).some((key) => key.startsWith("poojaOfferings["))
    ) {
      pandit.poojaOfferings = [];
    }

    pandit.isProfileComplete = isPanditProfileComplete(pandit);
    if (pandit.isProfileComplete) {
      pandit.isPhoneVerified = true;
      pandit.isVerified = true;
      if (pandit.status === "pending") {
        pandit.status = "active";
      }
    }
    await pandit.save();

    let token = null;
    if (pandit.isProfileComplete) {
      token = generatePanditToken(pandit._id);
      await PanditOTP.deleteMany({ phone: pandit.phone });
    }

    res.json({
      success: true,
      message: pandit.isProfileComplete
        ? "Pandit profile completed successfully"
        : "Pandit profile saved, please complete remaining details",
      data: {
        token,
        pandit,
      },
    });
  } catch (err) {
    console.error("UPDATE PANDIT PROFILE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const updatePanditFcmToken = async (req, res) => {
  try {
    const { fcmToken = "" } = req.body || {};
    const token = String(fcmToken || "").trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "fcmToken is required",
      });
    }

    const pandit = await updateDeviceToken({
      Model: Pandit,
      id: req.pandit._id,
      token,
    });

    if (!pandit) {
      return res.status(404).json({
        success: false,
        message: "Pandit not found",
      });
    }

    return res.json({
      success: true,
      message: "FCM token updated",
      data: {
        panditId: pandit._id,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to update FCM token",
    });
  }
};

export const completePanditProfile = updatePanditProfile;
