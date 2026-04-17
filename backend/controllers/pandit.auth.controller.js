import jwt from "jsonwebtoken";
import Pandit from "../models/pandit.model.js";
import PanditOTP from "../models/panditOtp.model.js";

const validatePhone = (phone) => /^[6-9]\d{9}$/.test(phone);

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
const OTP_SESSION_WINDOW_MS = 15 * 60 * 1000;

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

const normalizePoojaOfferingsInput = (body) => {
  const fromPrimary = parseJsonIfString(body?.poojaOfferings, null);
  const fromAlternate = parseJsonIfString(body?.rituals, null);
  const source = fromPrimary ?? fromAlternate;

  if (Array.isArray(source)) {
    return source
      .map((entry) => {
        if (typeof entry === "string") {
          return {
            name: entry.trim(),
            isSelected: true,
          };
        }

        if (!entry || typeof entry !== "object") {
          return null;
        }

        return {
          name: String(entry?.name || entry?.title || "").trim(),
          isSelected:
            entry?.isSelected !== undefined
              ? Boolean(entry.isSelected)
              : true,
          durationHours: Number(entry?.durationHours || 0),
          travelForSpecialPooja: Boolean(entry?.travelForSpecialPooja),
          standardSamagri: Boolean(entry?.standardSamagri),
          customSamagri: Boolean(entry?.customSamagri),
        };
      })
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

    if (!pandit) {
      return res.json({
        success: true,
        isNewPandit: true,
        message: "New signup successful, please complete the profile",
        data: {
          phone,
          flow: "signup",
        },
      });
    }

    res.json({
      success: true,
      isNewPandit: false,
      message: "Login verified successfully",
      data: {
        flow: "login",
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
        verifiedAt: { $gte: new Date(Date.now() - OTP_SESSION_WINDOW_MS) },
      }).sort({ verifiedAt: -1 });

      if (!validSession) {
        return res.status(401).json({
          success: false,
          message: "OTP verification required before profile update",
        });
      }

      pandit = await Pandit.findOne({ phone });

      if (!pandit) {
        pandit = await Pandit.create({
          phone,
          fullName: validSession.fullName || "",
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
      pandit.aadhaar = {
        ...pandit.aadhaar,
        frontImage: `/uploads/${req.files.aadhaarFrontImage[0].filename}`,
      };
    }

    if (req.files?.aadhaarBackImage?.[0]) {
      pandit.aadhaar = {
        ...pandit.aadhaar,
        backImage: `/uploads/${req.files.aadhaarBackImage[0].filename}`,
      };
    }

    const profileImageFile =
      req.files?.profileImage?.[0] || req.files?.profile?.[0] || req.files?.avatar?.[0];
    if (profileImageFile) {
      pandit.profileImage = `/uploads/${profileImageFile.filename}`;
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
      pandit.poojaOfferings = parsedPoojaOfferings;
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

export const completePanditProfile = updatePanditProfile;
