import Ritual from "../../models/ritual.model.js";
import Pandit from "../../models/pandit.model.js";
import { uploadFileToFirebase } from "../../utils/firebaseUpload.js";

const normalizeName = (value = "") => String(value || "").trim().toLowerCase();

const sanitizeCustomSamagriNotes = (notes = []) => {
  if (!Array.isArray(notes)) return [];

  return notes.map((note) => String(note || "").trim()).filter(Boolean);
};

const sanitizeCustomSamagriItems = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      ...(item._id ? { _id: item._id } : {}),
      itemName: String(item.itemName || item.name || "").trim(),
      quantity: Math.max(1, Number(item.quantity || 1)),
      size: String(item.size || "").trim(),
      approvalStatus: ["approved", "rejected"].includes(String(item.approvalStatus || "").trim())
        ? String(item.approvalStatus).trim()
        : "pending",
      reviewedAt: item.reviewedAt || null,
      reviewedBy: String(item.reviewedBy || "").trim(),
    }))
    .filter((item) => item.itemName);
};

export const createRitual = async (req, res) => {
  try {
    const {
      title = "",
      description = "",
      image = "",
      durationHours = 2,
      travelForSpecialPooja = false,
      standardSamagri = false,
      customSamagri = false,
      status = "active",
    } = req.body;

    if (!title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Ritual title is required",
      });
    }

    const existingFilter = { title: { $regex: `^${title.trim()}$`, $options: "i" } };
    if (req.admin.role === "vendor") {
      existingFilter.vendorId = req.vendor._id;
    } else {
      existingFilter.vendorId = null;
    }

    const exists = await Ritual.findOne(existingFilter);

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Ritual already exists",
      });
    }

    const uploadedImage = req.file
      ? await uploadFileToFirebase(req.file, { folder: "rituals" })
      : "";

    const ritual = await Ritual.create({
      vendorId: req.admin.role === "vendor" ? req.vendor._id : null,
      title: title.trim(),
      description: String(description || "").trim(),
      image: uploadedImage || String(image || "").trim(),
      durationHours: Number(durationHours) > 0 ? Number(durationHours) : 2,
      travelForSpecialPooja: Boolean(travelForSpecialPooja),
      standardSamagri: Boolean(standardSamagri),
      customSamagri: Boolean(customSamagri),
      status: status === "inactive" ? "inactive" : "active",
    });

    return res.status(201).json({
      success: true,
      message: "Ritual created",
      data: ritual,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to create ritual",
    });
  }
};

export const getAllRitualsForAdmin = async (req, res) => {
  try {
    const { search = "", status = "all" } = req.query;

    const filter = {};

    if (status === "pending") {
      filter.status = "pending";
    } else if (status === "approved") {
      filter.status = { $in: ["active", "inactive"] };
    } else if (status !== "all") {
      filter.status = status;
    }

    const escapeRegex = (val) => String(val || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const vendorCity = String(req.vendor?.address?.city || "").trim();

    const vendorFilter = req.admin.role === "vendor" 
      ? { 
          $or: [
            { vendorId: req.vendor._id },
            { vendorId: null, panditId: null },
            { vendorId: null, panditId: { $exists: false } },
            ...(vendorCity 
              ? [
                  { 
                    vendorId: null, 
                    panditId: { $ne: null, $exists: true }, 
                    city: { $regex: `^${escapeRegex(vendorCity)}$`, $options: "i" } 
                  }
                ] 
              : [])
          ] 
        } 
      : {};

    const searchFilter = search.trim() 
      ? { $or: [{ title: { $regex: search.trim(), $options: "i" } }, { description: { $regex: search.trim(), $options: "i" } }] } 
      : {};

    if (Object.keys(vendorFilter).length > 0 && Object.keys(searchFilter).length > 0) {
      filter.$and = [vendorFilter, searchFilter];
    } else if (Object.keys(vendorFilter).length > 0) {
      Object.assign(filter, vendorFilter);
    } else if (Object.keys(searchFilter).length > 0) {
      Object.assign(filter, searchFilter);
    }

    const rituals = await Ritual.find(filter)
      .populate("panditId", "fullName phone")
      .populate("vendorId", "name businessName email phone address")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: rituals.length,
      data: rituals,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load rituals",
    });
  }
};

export const updateRitual = async (req, res) => {
  try {
        const uploadedImage = req.file
          ? await uploadFileToFirebase(req.file, { folder: "rituals" })
          : "";

    const { id } = req.params;
    const {
      title,
      description,
      image,
      durationHours,
      travelForSpecialPooja,
      standardSamagri,
      customSamagri,
      status,
    } = req.body;

    const ritual = await Ritual.findById(id);
    if (!ritual) {
      return res.status(404).json({
        success: false,
        message: "Ritual not found",
      });
    }

    if (req.admin.role === "vendor" && ritual.vendorId && ritual.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const oldTitle = ritual.title;

    if (typeof title === "string" && title.trim()) {
      const existingFilter = {
        _id: { $ne: id },
        title: { $regex: `^${title.trim()}$`, $options: "i" },
      };
      if (req.admin.role === "vendor") {
        existingFilter.vendorId = req.vendor._id;
      } else {
        existingFilter.vendorId = null;
      }

      const duplicate = await Ritual.findOne(existingFilter);

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Ritual title already in use",
        });
      }

      ritual.title = title.trim();
    }

    if (typeof description === "string") {
      ritual.description = description.trim();
    }

    if (uploadedImage) {
      ritual.image = uploadedImage;
    } else if (typeof image === "string") {
      ritual.image = image.trim();
    }

    if (durationHours !== undefined) {
      const parsedDuration = Number(durationHours);
      if (Number.isFinite(parsedDuration) && parsedDuration >= 0) {
        ritual.durationHours = parsedDuration;
      }
    }

    if (travelForSpecialPooja !== undefined) {
      ritual.travelForSpecialPooja = Boolean(travelForSpecialPooja);
    }

    if (standardSamagri !== undefined) {
      ritual.standardSamagri = Boolean(standardSamagri);
    }

    if (customSamagri !== undefined) {
      ritual.customSamagri = Boolean(customSamagri);
    }

    if (status === "active" || status === "inactive" || status === "pending") {
      if (status === "active" && ritual.status === "pending") {
        ritual.panditId = null; // Auto-globalize on approval
      }
      ritual.status = status;
    }

    await ritual.save();

    if (typeof title === "string" && title.trim() && normalizeName(oldTitle) !== normalizeName(title.trim())) {
      const newTitle = title.trim();
      await Pandit.updateMany(
        { "poojaOfferings.name": oldTitle },
        { $set: { "poojaOfferings.$[elem].name": newTitle } },
        { arrayFilters: [{ "elem.name": oldTitle }] }
      );
    }

    return res.json({
      success: true,
      message: "Ritual updated",
      data: ritual,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to update ritual",
    });
  }
};

export const deleteRitual = async (req, res) => {
  try {
    const ritual = await Ritual.findById(req.params.id);

    if (!ritual) {
      return res.status(404).json({
        success: false,
        message: "Ritual not found",
      });
    }

    if (req.admin.role === "vendor" && (!ritual.vendorId || ritual.vendorId.toString() !== req.vendor._id.toString())) {
      return res.status(403).json({
        success: false,
        message: "Access denied (Cannot delete global or other vendor's ritual)",
      });
    }

    await Ritual.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: "Ritual deleted",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to delete ritual",
    });
  }
};

export const getPendingCustomSamagriItems = async (req, res) => {
  try {
    const escapeRegex = (val) => String(val || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const panditFilter = {};

    if (req.admin.role === "vendor") {
      const vendorCity = String(req.vendor?.address?.city || "").trim();
      if (vendorCity) {
        const cityRegex = { $regex: `^${escapeRegex(vendorCity)}$`, $options: "i" };
        panditFilter.$or = [
          { "address.city": cityRegex },
          { "serviceTypes.detectedLocation.city": cityRegex },
        ];
      } else {
        panditFilter._id = null;
      }
    }

    const [pandits, rituals] = await Promise.all([
      Pandit.find(panditFilter, { fullName: 1, phone: 1, poojaOfferings: 1 }).lean(),
      Ritual.find({}, { title: 1 }).lean(),
    ]);

    const ritualMap = new Map(
      rituals.map((ritual) => [normalizeName(ritual.title), ritual._id])
    );

    const data = [];

    pandits.forEach((pandit) => {
      const offerings = Array.isArray(pandit.poojaOfferings) ? pandit.poojaOfferings : [];

      offerings.forEach((offering) => {
        const pendingItems = sanitizeCustomSamagriItems(offering.customSamagriItems || []).filter(
          (item) => item.approvalStatus === "pending"
        );

        if (pendingItems.length > 0) {
          data.push({
            panditId: pandit._id,
            panditName: pandit.fullName || "",
            panditPhone: pandit.phone || "",
            ritualId: ritualMap.get(normalizeName(offering.name)) || null,
            ritualName: offering.name || "",
            customSamagriNotes: offering.customSamagriNotes || [],
            customSamagriItems: pendingItems,
          });
        }
      });
    });

    return res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load pending custom samagri",
    });
  }
};

export const reviewCustomSamagriItem = async (req, res) => {
  try {
    const { panditId, ritualId, itemId } = req.params;
    const { approvalStatus = "approved" } = req.body || {};

    const normalizedApprovalStatus = ["approved", "rejected"].includes(String(approvalStatus || "").trim())
      ? String(approvalStatus).trim()
      : null;

    if (!normalizedApprovalStatus) {
      return res.status(400).json({
        success: false,
        message: "approvalStatus must be approved or rejected",
      });
    }

    const pandit = await Pandit.findById(panditId);
    if (!pandit) {
      return res.status(404).json({
        success: false,
        message: "Pandit not found",
      });
    }

    const ritual = await Ritual.findById(ritualId).lean();
    if (!ritual) {
      return res.status(404).json({
        success: false,
        message: "Ritual not found",
      });
    }

    if (!Array.isArray(pandit.poojaOfferings)) {
      pandit.poojaOfferings = [];
    }

    const offeringIndex = pandit.poojaOfferings.findIndex(
      (offering) => normalizeName(offering.name) === normalizeName(ritual.title)
    );

    if (offeringIndex < 0) {
      return res.status(404).json({
        success: false,
        message: "Ritual offering not found for pandit",
      });
    }

    const offering = pandit.poojaOfferings[offeringIndex].toObject();
    const items = sanitizeCustomSamagriItems(offering.customSamagriItems || []);
    const itemIndex = items.findIndex((item) => String(item._id) === String(itemId));

    if (itemIndex < 0) {
      return res.status(404).json({
        success: false,
        message: "Custom samagri item not found",
      });
    }

    items[itemIndex] = {
      ...items[itemIndex],
      approvalStatus: normalizedApprovalStatus,
      reviewedAt: new Date(),
      reviewedBy: req.admin?.name || req.admin?.email || "Admin",
    };

    offering.customSamagriItems = items;
    pandit.poojaOfferings[offeringIndex] = offering;
    await pandit.save();

    return res.json({
      success: true,
      message: `Custom samagri ${normalizedApprovalStatus}`,
      data: {
        panditId,
        ritualId,
        item: items[itemIndex],
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to review custom samagri item",
    });
  }
};
