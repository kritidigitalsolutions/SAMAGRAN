import Pandit from "../../models/pandit.model.js";
import mongoose from "mongoose";
import PanditBooking from "../../models/panditBooking.model.js";
import { uploadFileToFirebase } from "../../utils/firebaseUpload.js";

const parseJsonIfString = (value, fallback = undefined) => {
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

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "off"].includes(normalized)) {
      return false;
    }
  }

  return Boolean(value);
};

const toNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeLanguages = (languagesInput) => {
  if (Array.isArray(languagesInput)) {
    return languagesInput
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }

  if (typeof languagesInput === "string") {
    return languagesInput
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeAddress = (input = {}, previous = {}) => {
  const addressInput = parseJsonIfString(input, {}) || {};
  return {
    line1:
      addressInput.line1 !== undefined
        ? String(addressInput.line1 || "").trim()
        : String(previous?.line1 || "").trim(),
    line2:
      addressInput.line2 !== undefined
        ? String(addressInput.line2 || "").trim()
        : String(previous?.line2 || "").trim(),
    city:
      addressInput.city !== undefined
        ? String(addressInput.city || "").trim()
        : String(previous?.city || "").trim(),
    state:
      addressInput.state !== undefined
        ? String(addressInput.state || "").trim()
        : String(previous?.state || "").trim(),
    pinCode:
      addressInput.pinCode !== undefined
        ? String(addressInput.pinCode || "").trim()
        : String(previous?.pinCode || "").trim(),
  };
};

const normalizeAadhaar = (input = {}, previous = {}) => {
  const aadhaarInput = parseJsonIfString(input, {}) || {};
  return {
    number:
      aadhaarInput.number !== undefined
        ? String(aadhaarInput.number || "").trim()
        : String(previous?.number || "").trim(),
    frontImage:
      aadhaarInput.frontImage !== undefined
        ? String(aadhaarInput.frontImage || "").trim()
        : String(previous?.frontImage || "").trim(),
    backImage:
      aadhaarInput.backImage !== undefined
        ? String(aadhaarInput.backImage || "").trim()
        : String(previous?.backImage || "").trim(),
    consentGiven:
      aadhaarInput.consentGiven !== undefined
        ? toBoolean(aadhaarInput.consentGiven, false)
        : toBoolean(previous?.consentGiven, false),
  };
};

const normalizeServiceTypes = (input = {}, previous = {}) => {
  const serviceInput = parseJsonIfString(input, {}) || {};

  return {
    onlinePooja:
      serviceInput.onlinePooja !== undefined
        ? toBoolean(serviceInput.onlinePooja, false)
        : toBoolean(previous?.onlinePooja, false),
    homeVisit:
      serviceInput.homeVisit !== undefined
        ? toBoolean(serviceInput.homeVisit, false)
        : toBoolean(previous?.homeVisit, false),
    atTemple:
      serviceInput.atTemple !== undefined
        ? toBoolean(serviceInput.atTemple, false)
        : toBoolean(previous?.atTemple, false),
    travelForSpecialPoojas:
      serviceInput.travelForSpecialPoojas !== undefined
        ? toBoolean(serviceInput.travelForSpecialPoojas, false)
        : toBoolean(previous?.travelForSpecialPoojas, false),
    detectedLocation: {
      city:
        serviceInput.detectedLocation?.city !== undefined
          ? String(serviceInput.detectedLocation.city || "").trim()
          : String(previous?.detectedLocation?.city || "").trim(),
      state:
        serviceInput.detectedLocation?.state !== undefined
          ? String(serviceInput.detectedLocation.state || "").trim()
          : String(previous?.detectedLocation?.state || "").trim(),
    },
    serviceDistance: {
      selected:
        serviceInput.serviceDistance?.selected !== undefined
          ? String(serviceInput.serviceDistance.selected || "").trim()
          : String(previous?.serviceDistance?.selected || "").trim(),
      customKm:
        serviceInput.serviceDistance?.customKm !== undefined
          ? toNumber(serviceInput.serviceDistance.customKm, 0)
          : toNumber(previous?.serviceDistance?.customKm, 0),
    },
    outstationAvailability: {
      withinDistrict:
        serviceInput.outstationAvailability?.withinDistrict !== undefined
          ? toBoolean(serviceInput.outstationAvailability.withinDistrict, false)
          : toBoolean(previous?.outstationAvailability?.withinDistrict, false),
      withinState:
        serviceInput.outstationAvailability?.withinState !== undefined
          ? toBoolean(serviceInput.outstationAvailability.withinState, false)
          : toBoolean(previous?.outstationAvailability?.withinState, false),
      anywhereInIndia:
        serviceInput.outstationAvailability?.anywhereInIndia !== undefined
          ? toBoolean(serviceInput.outstationAvailability.anywhereInIndia, false)
          : toBoolean(previous?.outstationAvailability?.anywhereInIndia, false),
    },
  };
};

const normalizePoojaOfferings = (input) => {
  const source = parseJsonIfString(input, input);
  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const customSamagriItems = Array.isArray(entry.customSamagriItems)
        ? entry.customSamagriItems
            .map((item) => {
              if (!item || typeof item !== "object") {
                return null;
              }

              const itemName = String(item.itemName || "").trim();
              if (!itemName) {
                return null;
              }

              return {
                itemName,
                quantity: toNumber(item.quantity, 1),
                size: String(item.size || "").trim(),
              };
            })
            .filter(Boolean)
        : [];

      const name = String(entry.name || entry.title || "").trim();
      if (!name) {
        return null;
      }

      return {
        name,
        description: String(entry.description || "").trim(),
        isSelected: toBoolean(entry.isSelected, false),
        durationHours: toNumber(entry.durationHours, 2),
        travelForSpecialPooja: toBoolean(entry.travelForSpecialPooja, false),
        standardSamagri: toBoolean(entry.standardSamagri, false),
        customSamagri: toBoolean(entry.customSamagri, false),
        customSamagriItems,
      };
    })
    .filter(Boolean);
};

export const getAllPanditsForAdmin = async (req, res) => {
  try {
    const { search = "", status = "all" } = req.query;

    const filter = {};

    if (status !== "all") {
      filter.status = status;
    }

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      filter.$or = [
        { fullName: regex },
        { phone: regex },
        { "address.city": regex },
        { "address.state": regex },
        { templeAssociated: regex },
      ];
    }

    const pandits = await Pandit.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: pandits.length,
      data: pandits,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Unable to load pandits",
    });
  }
};

export const getPanditDetailsForAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pandit id",
      });
    }

    const pandit = await Pandit.findById(id).lean();

    if (!pandit) {
      return res.status(404).json({
        success: false,
        message: "Pandit not found",
      });
    }

    const bookings = await PanditBooking.find({ pandit: id })
      .populate("user", "name phone email")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: {
        pandit,
        bookings,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load pandit details",
    });
  }
};

export const createPanditByAdmin = async (req, res) => {
  try {
    const body = req.body || {};
    const fileMap = req.files || {};
    const uploadedProfileImage = fileMap.profileImageFile?.[0]
      ? await uploadFileToFirebase(fileMap.profileImageFile[0], { folder: "pandits/profile" })
      : "";
    const uploadedAadhaarFrontImage = fileMap.aadhaarFrontImageFile?.[0]
      ? await uploadFileToFirebase(fileMap.aadhaarFrontImageFile[0], { folder: "pandits/aadhaar" })
      : "";
    const uploadedAadhaarBackImage = fileMap.aadhaarBackImageFile?.[0]
      ? await uploadFileToFirebase(fileMap.aadhaarBackImageFile[0], { folder: "pandits/aadhaar" })
      : "";

    const {
      phone = "",
      fullName = "",
      profileImage = "",
      bio = "",
      ratingAverage = 4.5,
      ratingCount = 0,
      yearsOfExperience = 0,
      templeAssociated = "",
      languagesSpoken = [],
      status = "pending",
      isVerified = false,
      isPhoneVerified = false,
      isProfileComplete,
      address = {},
      aadhaar = {},
      serviceTypes = {},
      poojaOfferings = [],
    } = body;

    const finalPhone = String(phone || "").trim();
    if (!finalPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone is required",
      });
    }

    const exists = await Pandit.findOne({ phone: finalPhone });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Pandit with this phone already exists",
      });
    }

    const pandit = await Pandit.create({
      phone: finalPhone,
      fullName: String(fullName || "").trim(),
      profileImage: uploadedProfileImage || String(profileImage || "").trim(),
      bio: String(bio || "").trim(),
      ratingAverage: toNumber(ratingAverage, 4.5),
      ratingCount: toNumber(ratingCount, 0),
      yearsOfExperience: toNumber(yearsOfExperience, 0),
      templeAssociated: String(templeAssociated || "").trim(),
      languagesSpoken: normalizeLanguages(languagesSpoken),
      status: ["pending", "active", "blocked"].includes(String(status || "").trim())
        ? String(status).trim()
        : "pending",
      isVerified: toBoolean(isVerified, false),
      isPhoneVerified: toBoolean(isPhoneVerified, false),
      address: normalizeAddress(address),
      aadhaar: {
        ...normalizeAadhaar(aadhaar),
        ...(uploadedAadhaarFrontImage ? { frontImage: uploadedAadhaarFrontImage } : {}),
        ...(uploadedAadhaarBackImage ? { backImage: uploadedAadhaarBackImage } : {}),
      },
      serviceTypes: normalizeServiceTypes(serviceTypes),
      poojaOfferings: normalizePoojaOfferings(poojaOfferings),
      isProfileComplete:
        isProfileComplete !== undefined
          ? toBoolean(isProfileComplete, false)
          : Boolean(String(fullName || "").trim() && finalPhone),
    });

    return res.status(201).json({
      success: true,
      message: "Pandit created successfully",
      data: pandit,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to create pandit",
    });
  }
};

export const updatePanditByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const fileMap = req.files || {};
    const uploadedProfileImage = fileMap.profileImageFile?.[0]
      ? await uploadFileToFirebase(fileMap.profileImageFile[0], { folder: "pandits/profile" })
      : "";
    const uploadedAadhaarFrontImage = fileMap.aadhaarFrontImageFile?.[0]
      ? await uploadFileToFirebase(fileMap.aadhaarFrontImageFile[0], { folder: "pandits/aadhaar" })
      : "";
    const uploadedAadhaarBackImage = fileMap.aadhaarBackImageFile?.[0]
      ? await uploadFileToFirebase(fileMap.aadhaarBackImageFile[0], { folder: "pandits/aadhaar" })
      : "";

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pandit id",
      });
    }

    const pandit = await Pandit.findById(id);
    if (!pandit) {
      return res.status(404).json({
        success: false,
        message: "Pandit not found",
      });
    }

    const {
      phone,
      fullName,
      profileImage,
      bio,
      ratingAverage,
      ratingCount,
      yearsOfExperience,
      templeAssociated,
      languagesSpoken,
      status,
      isVerified,
      isPhoneVerified,
      isProfileComplete,
      address,
      aadhaar,
      serviceTypes,
      poojaOfferings,
    } = req.body;

    if (phone !== undefined) {
      const nextPhone = String(phone || "").trim();
      if (!nextPhone) {
        return res.status(400).json({
          success: false,
          message: "Phone cannot be empty",
        });
      }

      const phoneExists = await Pandit.findOne({
        _id: { $ne: id },
        phone: nextPhone,
      });

      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: "Pandit with this phone already exists",
        });
      }

      pandit.phone = nextPhone;
    }

    if (fullName !== undefined) pandit.fullName = String(fullName || "").trim();
    if (uploadedProfileImage) {
      pandit.profileImage = uploadedProfileImage;
    } else if (profileImage !== undefined) {
      pandit.profileImage = String(profileImage || "").trim();
    }
    if (bio !== undefined) pandit.bio = String(bio || "").trim();
    if (ratingAverage !== undefined) pandit.ratingAverage = toNumber(ratingAverage, pandit.ratingAverage || 4.5);
    if (ratingCount !== undefined) pandit.ratingCount = toNumber(ratingCount, pandit.ratingCount || 0);
    if (yearsOfExperience !== undefined) pandit.yearsOfExperience = toNumber(yearsOfExperience, 0);
    if (templeAssociated !== undefined) pandit.templeAssociated = String(templeAssociated || "").trim();

    if (languagesSpoken !== undefined) {
      pandit.languagesSpoken = normalizeLanguages(languagesSpoken);
    }

    if (status !== undefined && ["pending", "active", "blocked"].includes(String(status || "").trim())) {
      pandit.status = String(status || "").trim();
    }

    if (isVerified !== undefined) pandit.isVerified = toBoolean(isVerified, false);
    if (isPhoneVerified !== undefined) pandit.isPhoneVerified = toBoolean(isPhoneVerified, false);
    if (isProfileComplete !== undefined) pandit.isProfileComplete = toBoolean(isProfileComplete, false);

    if (address !== undefined) {
      pandit.address = normalizeAddress(address, pandit.address || {});
    }

    if (aadhaar !== undefined) {
      pandit.aadhaar = normalizeAadhaar(aadhaar, pandit.aadhaar || {});
    }

    if (uploadedAadhaarFrontImage || uploadedAadhaarBackImage) {
      pandit.aadhaar = {
        ...(pandit.aadhaar?.toObject?.() || pandit.aadhaar || {}),
        ...(uploadedAadhaarFrontImage ? { frontImage: uploadedAadhaarFrontImage } : {}),
        ...(uploadedAadhaarBackImage ? { backImage: uploadedAadhaarBackImage } : {}),
      };
    }

    if (serviceTypes !== undefined) {
      pandit.serviceTypes = normalizeServiceTypes(
        serviceTypes,
        pandit.serviceTypes?.toObject?.() || pandit.serviceTypes || {}
      );
    }

    if (poojaOfferings !== undefined) {
      pandit.poojaOfferings = normalizePoojaOfferings(poojaOfferings);
    }

    await pandit.save();

    return res.json({
      success: true,
      message: "Pandit updated successfully",
      data: pandit,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to update pandit",
    });
  }
};

export const updatePanditStatusByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pandit id",
      });
    }

    const normalizedStatus = String(status || "").trim();
    if (!["pending", "active", "blocked"].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "status must be pending, active or blocked",
      });
    }

    const pandit = await Pandit.findByIdAndUpdate(
      id,
      { status: normalizedStatus },
      { new: true }
    );

    if (!pandit) {
      return res.status(404).json({
        success: false,
        message: "Pandit not found",
      });
    }

    return res.json({
      success: true,
      message: "Pandit status updated successfully",
      data: pandit,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to update pandit status",
    });
  }
};

export const getPanditBookingsByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pandit id",
      });
    }

    const bookings = await PanditBooking.find({ pandit: id })
      .populate("user", "name phone email")
      .populate("pandit", "fullName phone status")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load pandit bookings",
    });
  }
};

export const deletePanditByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pandit id",
      });
    }

    const pandit = await Pandit.findByIdAndDelete(id);

    if (!pandit) {
      return res.status(404).json({
        success: false,
        message: "Pandit not found",
      });
    }

    return res.json({
      success: true,
      message: "Pandit deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to delete pandit",
    });
  }
};
