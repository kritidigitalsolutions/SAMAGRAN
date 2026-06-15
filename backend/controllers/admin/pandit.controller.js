import Pandit from "../../models/pandit.model.js";
import mongoose from "mongoose";
import PanditBooking from "../../models/panditBooking.model.js";
import { notifyAdmins } from "../../utils/notification.service.js";
import { toTitleCase, normalizeCityList } from "../../utils/cityNormalizer.js";

export const getAllPanditsForAdmin = async (req, res) => {
  try {
    const { search = "", status = "all", city = "", pinCode = "" } = req.query;

    const filter = {};

    if (status !== "all") {
      filter.status = status;
    }

    const vendorFilter = req.admin.role === "vendor"
      ? {
          $or: [
            { vendorId: req.vendor._id },
            { vendorId: null },
            { vendorId: { $exists: false } },
          ],
        }
      : {};

    const searchFilter = search.trim() 
      ? { $or: [
          { fullName: { $regex: search.trim(), $options: "i" } },
          { phone: { $regex: search.trim(), $options: "i" } },
          { "address.city": { $regex: search.trim(), $options: "i" } },
          { "address.state": { $regex: search.trim(), $options: "i" } },
          { templeAssociated: { $regex: search.trim(), $options: "i" } }
        ] } 
      : {};

    const cityFilter = String(city || "").trim()
      ? { "address.city": { $regex: `^${String(city).trim()}$`, $options: "i" } }
      : {};

    const pinCodeFilter = String(pinCode || "").trim()
      ? { "address.pinCode": { $regex: `^${String(pinCode).trim()}$`, $options: "i" } }
      : {};

    const allFilters = [vendorFilter, searchFilter, cityFilter, pinCodeFilter].filter(
      (f) => Object.keys(f).length > 0
    );

    if (allFilters.length > 0) {
      filter.$and = allFilters;
    }

    const distinctFilter = req.admin.role === "vendor"
      ? {
          $or: [
            { vendorId: req.vendor._id },
            { vendorId: null },
            { vendorId: { $exists: false } },
          ],
        }
      : {};

    const [pandits, rawCities, rawPinCodes] = await Promise.all([
      Pandit.find(filter).sort({ createdAt: -1 }),
      Pandit.distinct("address.city", distinctFilter),
      Pandit.distinct("address.pinCode", distinctFilter)
    ]);

    const cities = normalizeCityList(rawCities);
    const pinCodes = rawPinCodes.filter(Boolean).sort();

    res.json({
      success: true,
      count: pandits.length,
      data: pandits,
      cities: cities.filter(Boolean),
      pinCodes: pinCodes.filter(Boolean),
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

    if (req.admin.role === "vendor" && pandit.vendorId && pandit.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
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
    const {
      phone = "",
      fullName = "",
      profileImage = "",
      bio = "",
      yearsOfExperience = 0,
      templeAssociated = "",
      languagesSpoken = [],
      status = "pending",
      isVerified = false,
      isPhoneVerified = false,
      address = {},
      serviceTypes = {},
      poojaOfferings = [],
    } = req.body;

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
      vendorId: req.admin.role === "vendor" ? req.vendor._id : null,
      phone: finalPhone,
      fullName: String(fullName || "").trim(),
      profileImage: String(profileImage || "").trim(),
      bio: String(bio || "").trim(),
      yearsOfExperience: Number(yearsOfExperience || 0),
      templeAssociated: String(templeAssociated || "").trim(),
      languagesSpoken: Array.isArray(languagesSpoken)
        ? languagesSpoken.map((entry) => String(entry || "").trim()).filter(Boolean)
        : String(languagesSpoken || "")
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean),
      status: ["pending", "active", "blocked"].includes(String(status || "").trim())
        ? String(status).trim()
        : "pending",
      isVerified: Boolean(isVerified),
      isPhoneVerified: Boolean(isPhoneVerified),
      address: {
        line1: String(address?.line1 || "").trim(),
        line2: String(address?.line2 || "").trim(),
        city: toTitleCase(address?.city),
        state: String(address?.state || "").trim(),
        pinCode: String(address?.pinCode || "").trim(),
      },
      serviceTypes: serviceTypes || {},
      poojaOfferings: Array.isArray(poojaOfferings) ? poojaOfferings : [],
      isProfileComplete: Boolean(fullName && finalPhone),
    });

    void notifyAdmins({
      title: "Pandit account created",
      body: `${pandit.fullName || pandit.phone || "A pandit"} was created by admin`,
      data: {
        eventType: "pandit.created.admin",
        panditId: String(pandit._id),
        phone: pandit.phone,
      },
    }).catch((error) => console.error("ADMIN PANDIT NOTIFICATION ERROR:", error.message));

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

    if (req.admin.role === "vendor" && pandit.vendorId && pandit.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const {
      phone,
      fullName,
      profileImage,
      bio,
      yearsOfExperience,
      templeAssociated,
      languagesSpoken,
      status,
      isVerified,
      isPhoneVerified,
      isProfileComplete,
      address,
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
    if (profileImage !== undefined) pandit.profileImage = String(profileImage || "").trim();
    if (bio !== undefined) pandit.bio = String(bio || "").trim();
    if (yearsOfExperience !== undefined) pandit.yearsOfExperience = Number(yearsOfExperience || 0);
    if (templeAssociated !== undefined) pandit.templeAssociated = String(templeAssociated || "").trim();

    if (languagesSpoken !== undefined) {
      pandit.languagesSpoken = Array.isArray(languagesSpoken)
        ? languagesSpoken.map((entry) => String(entry || "").trim()).filter(Boolean)
        : String(languagesSpoken || "")
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean);
    }

    if (status !== undefined && ["pending", "active", "blocked"].includes(String(status || "").trim())) {
      pandit.status = String(status || "").trim();
    }

    if (isVerified !== undefined) pandit.isVerified = Boolean(isVerified);
    if (isPhoneVerified !== undefined) pandit.isPhoneVerified = Boolean(isPhoneVerified);
    if (isProfileComplete !== undefined) pandit.isProfileComplete = Boolean(isProfileComplete);

    if (address && typeof address === "object") {
      const prevAddress = pandit.address || {};
      pandit.address = {
        line1: address.line1 !== undefined ? String(address.line1 || "").trim() : prevAddress.line1 || "",
        line2: address.line2 !== undefined ? String(address.line2 || "").trim() : prevAddress.line2 || "",
        city: address.city !== undefined ? toTitleCase(address.city) : prevAddress.city || "",
        state: address.state !== undefined ? String(address.state || "").trim() : prevAddress.state || "",
        pinCode: address.pinCode !== undefined ? String(address.pinCode || "").trim() : prevAddress.pinCode || "",
      };
    }

    if (serviceTypes && typeof serviceTypes === "object") {
      pandit.serviceTypes = {
        ...pandit.serviceTypes?.toObject?.(),
        ...pandit.serviceTypes,
        ...serviceTypes,
      };
    }

    if (Array.isArray(poojaOfferings)) {
      pandit.poojaOfferings = poojaOfferings;
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

    const panditObj = await Pandit.findById(id);
    if (!panditObj) {
      return res.status(404).json({
        success: false,
        message: "Pandit not found",
      });
    }

    if (req.admin.role === "vendor" && panditObj.vendorId && panditObj.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    panditObj.status = normalizedStatus;
    const pandit = await panditObj.save();

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

    const panditObj = await Pandit.findById(id);
    if (!panditObj) {
      return res.status(404).json({ success: false, message: "Pandit not found" });
    }
    if (req.admin.role === "vendor" && panditObj.vendorId && panditObj.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
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

    const pandit = await Pandit.findById(id);

    if (!pandit) {
      return res.status(404).json({
        success: false,
        message: "Pandit not found",
      });
    }

    if (req.admin.role === "vendor" && (!pandit.vendorId || pandit.vendorId.toString() !== req.vendor._id.toString())) {
      return res.status(403).json({
        success: false,
        message: "Access denied (Cannot delete global or other vendor's pandit)",
      });
    }

    await Pandit.findByIdAndDelete(id);

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
