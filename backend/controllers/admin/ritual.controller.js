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

    const exists = await Ritual.findOne({
      title: { $regex: `^${title.trim()}$`, $options: "i" },
    });

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

    if (status !== "all") {
      filter.status = status;
    }

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      filter.$or = [{ title: regex }, { description: regex }];
    }

    const rituals = await Ritual.find(filter).sort({ createdAt: -1 });

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

    if (typeof title === "string" && title.trim()) {
      const duplicate = await Ritual.findOne({
        _id: { $ne: id },
        title: { $regex: `^${title.trim()}$`, $options: "i" },
      });

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

    if (status === "active" || status === "inactive") {
      ritual.status = status;
    }

    await ritual.save();

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
    const ritual = await Ritual.findByIdAndDelete(req.params.id);

    if (!ritual) {
      return res.status(404).json({
        success: false,
        message: "Ritual not found",
      });
    }

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
    const [pandits, rituals] = await Promise.all([
      Pandit.find({}, { fullName: 1, phone: 1, poojaOfferings: 1 }).lean(),
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
            customSamagriNotes: [],
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
