import Ritual from "../../models/ritual.model.js";
import Pandit from "../../models/pandit.model.js";
import mongoose from "mongoose";
import { notifyAdmins } from "../../utils/notification.service.js";
import {
  resolveCity,
  getRitualTitlesAvailableInCity,
  sendCityRequired,
  getVendorIdsByCity,
} from "../../utils/locationFilter.js";

const normalizeName = (value = "") => String(value || "").trim().toLowerCase();

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

const mergeCustomSamagriNotes = (existing = [], incoming = []) => {
  const result = [];
  const seen = new Set();

  const addNote = (note) => {
    const normalized = normalizeName(note);
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    result.push(note);
  };

  sanitizeCustomSamagriNotes(existing).forEach(addNote);
  sanitizeCustomSamagriNotes(incoming).forEach(addNote);

  return result;
};

const toCustomSamagriItem = (item = {}) => ({
  ...(item._id ? { _id: item._id } : {}),
  itemName: String(item.itemName || item.name || "").trim(),
  quantity: Math.max(1, Number(item.quantity || 1)),
  size: String(item.size || "").trim(),
  approvalStatus: ["approved", "rejected"].includes(String(item.approvalStatus || "").trim())
    ? String(item.approvalStatus).trim()
    : "pending",
  reviewedAt: item.reviewedAt || null,
  reviewedBy: String(item.reviewedBy || "").trim(),
});

const sanitizeCustomSamagriItems = (items = []) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map(toCustomSamagriItem)
    .filter((item) => item.itemName);
};

const createPendingCustomSamagriItem = (item = {}) => ({
  ...toCustomSamagriItem(item),
  approvalStatus: "pending",
  reviewedAt: null,
  reviewedBy: "",
});

const createAutoApprovedCustomSamagriItem = (item = {}, reviewer = "") => ({
  ...toCustomSamagriItem(item),
  approvalStatus: "approved",
  reviewedAt: new Date(),
  reviewedBy: String(reviewer || ""),
});

const toOfferingFromRitual = ({ ritual, existingOffering = null }) => ({
  name: ritual.title,
  isSelected: existingOffering ? Boolean(existingOffering.isSelected) : true,
  durationHours: Number(existingOffering?.durationHours || ritual.durationHours || 2),
  travelForSpecialPooja: existingOffering
    ? Boolean(existingOffering.travelForSpecialPooja)
    : Boolean(ritual.travelForSpecialPooja),
  standardSamagri: existingOffering
    ? Boolean(existingOffering.standardSamagri)
    : Boolean(ritual.standardSamagri),
  customSamagri: existingOffering
    ? Boolean(existingOffering.customSamagri)
    : Boolean(ritual.customSamagri),
  customSamagriNotes: sanitizeCustomSamagriNotes(existingOffering?.customSamagriNotes || []),
  customSamagriItems: sanitizeCustomSamagriItems(existingOffering?.customSamagriItems || []),
});

const buildRitualPayload = ({ ritual, linkedOffering }) => ({
  ...ritual,
  isSelected: Boolean(linkedOffering?.isSelected),
  durationHours: Number(linkedOffering?.durationHours || ritual.durationHours || 2),
  travelForSpecialPooja: linkedOffering
    ? Boolean(linkedOffering.travelForSpecialPooja)
    : Boolean(ritual.travelForSpecialPooja),
  standardSamagri: linkedOffering
    ? Boolean(linkedOffering.standardSamagri)
    : Boolean(ritual.standardSamagri),
  customSamagri: linkedOffering
    ? Boolean(linkedOffering.customSamagri)
    : Boolean(ritual.customSamagri),
  customSamagriNotes: sanitizeCustomSamagriNotes(linkedOffering?.customSamagriNotes || []),
  customSamagriItems: sanitizeCustomSamagriItems(linkedOffering?.customSamagriItems || []),
});

const getRitualAndPanditOfferingContext = async ({ panditId, ritualId }) => {
  if (!mongoose.Types.ObjectId.isValid(ritualId)) {
    throw new Error("Invalid ritual id");
  }

  const ritual = await Ritual.findOne({ _id: ritualId, status: "active" }).lean();
  if (!ritual) {
    throw new Error("Ritual not found");
  }

  const pandit = await Pandit.findById(panditId);
  if (!pandit) {
    throw new Error("Pandit not found");
  }

  if (!Array.isArray(pandit.poojaOfferings)) {
    pandit.poojaOfferings = [];
  }

  const offeringIndex = pandit.poojaOfferings.findIndex(
    (offering) => normalizeName(offering.name) === normalizeName(ritual.title)
  );

  return {
    ritual,
    pandit,
    offeringIndex,
  };
};

// export const getAllRitualsForPandit = async (req, res) => {
//   try {
//     const { search = "" } = req.query;

//     const filter = { status: "active" };

//     if (String(search || "").trim()) {
//       const regex = { $regex: String(search).trim(), $options: "i" };
//       filter.$or = [{ title: regex }, { description: regex }];
//     }

//     const rituals = await Ritual.find(filter).sort({ createdAt: -1 }).lean();

//     const pandit = await Pandit.findById(req.pandit._id).select("poojaOfferings").lean();
//     const offerings = Array.isArray(pandit?.poojaOfferings) ? pandit.poojaOfferings : [];

//     const offeringsMap = new Map(
//       offerings.map((offering) => [normalizeName(offering.name), offering])
//     );

//     const data = rituals.map((ritual) => {
//       const linkedOffering = offeringsMap.get(normalizeName(ritual.title));

//       return buildRitualPayload({ ritual, linkedOffering });
//     });

//     return res.json({
//       success: true,
//       count: data.length,
//       data,
//     });
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message || "Unable to load rituals",
//     });
//   }
// };
export const getRitualsForBooking = async (req, res) => {
  try {
    const city = resolveCity(req);

    let rituals;

    if (city) {
      const escapeRegex = (val) => String(val || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const cityRegex = { $regex: `^${escapeRegex(city.trim())}$`, $options: "i" };

      // Get vendor IDs active in this city (or global ones)
      const vendorIds = await getVendorIdsByCity(city) || [];

      // Return rituals that are:
      // 1. Global (no vendor, no pandit)
      // 2. Pandit-created custom rituals for this city
      // 3. Vendor-created rituals for this city (vendor's city matches)
      rituals = await Ritual.find({
        status: "active",
        $or: [
          // A. Global admin-created rituals
          { vendorId: null, panditId: null },
          { vendorId: { $exists: false }, panditId: { $exists: false } },
          
          // B. Pandit-created custom rituals matching the city
          {
            vendorId: null,
            panditId: { $ne: null, $exists: true },
            city: cityRegex,
          },

          // C. Vendor-created rituals matching the city
          {
            vendorId: { $in: vendorIds },
          },
        ],
      })
        .sort({ createdAt: -1 })
        .lean();
    } else {
      // ── No city: return all active rituals
      rituals = await Ritual.find({ status: "active" })
        .sort({ createdAt: -1 })
        .lean();
    }

    const data = rituals.map((ritual) => ({
      _id: ritual._id,
      title: ritual.title,
      name: ritual.title,
      description: ritual.description || "",
      image: ritual.image || "",
      durationHours: Number(ritual.durationHours || 2),
      travelForSpecialPooja: Boolean(ritual.travelForSpecialPooja),
      standardSamagri: Boolean(ritual.standardSamagri),
      customSamagri: Boolean(ritual.customSamagri),
    }));

    res.json({
      success: true,
      ...(city ? { city } : {}),
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
export const getMyRitualsForPandit = async (req, res) => {
  try {
    const rituals = await Ritual.find({ status: "active" }).sort({ createdAt: -1 }).lean();
    const pandit = await Pandit.findById(req.pandit._id).select("poojaOfferings").lean();

    const offerings = Array.isArray(pandit?.poojaOfferings) ? pandit.poojaOfferings : [];
    const offeringsMap = new Map(
      offerings.map((offering) => [normalizeName(offering.name), offering])
    );

    const selectedRituals = rituals
      .map((ritual) => ({
        ritual,
        linkedOffering: offeringsMap.get(normalizeName(ritual.title)),
      }))
      .filter(({ linkedOffering }) => Boolean(linkedOffering?.isSelected))
      .map(({ ritual, linkedOffering }) => buildRitualPayload({ ritual, linkedOffering }));

    return res.json({
      success: true,
      count: selectedRituals.length,
      data: selectedRituals,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load my rituals",
    });
  }
};

export const addRitualForPandit = async (req, res) => {
  try {
    const {
      ritualId,
      title = "",
      description = "",
      image = "",
      durationHours = 2,
      travelForSpecialPooja = false,
      standardSamagri = false,
      customSamagri = false,
      customSamagriItems = [],
      customSamagriNotes = [],
      isSelected = true,
    } = req.body;

    let pandit = null;
    if (req.pandit?._id) {
      pandit = await Pandit.findById(req.pandit._id);
    } else {
      const resolvedPanditId = req.body.panditId || req.query.panditId;
      const resolvedPhone = req.body.phone || req.query.phone;
      if (resolvedPanditId) {
        pandit = await Pandit.findById(resolvedPanditId);
      } else if (resolvedPhone) {
        pandit = await Pandit.findOne({ phone: String(resolvedPhone).trim() });
      }
    }

    if (!pandit) {
      return res.status(404).json({
        success: false,
        message: "Pandit not found",
      });
    }

    let ritual = null;

    if (ritualId) {
      ritual = await Ritual.findOne({ _id: ritualId, status: "active" });
      if (!ritual) {
        return res.status(404).json({
          success: false,
          message: "Ritual not found",
        });
      }
    } else {
      const finalTitle = String(title || "").trim();
      if (!finalTitle) {
        return res.status(400).json({
          success: false,
          message: "ritualId or title is required",
        });
      }

      ritual = await Ritual.findOne({
        title: { $regex: `^${finalTitle}$`, $options: "i" },
      });

      if (!ritual) {
        const panditCity = String(pandit.address?.city || pandit.serviceTypes?.detectedLocation?.city || "").trim();
        ritual = await Ritual.create({
          title: finalTitle,
          description: String(description || "").trim(),
          image: String(image || "").trim(),
          durationHours: Number(durationHours) > 0 ? Number(durationHours) : 2,
          travelForSpecialPooja: Boolean(travelForSpecialPooja),
          standardSamagri: Boolean(standardSamagri),
          customSamagri: Boolean(customSamagri),
          status: "active",
          panditId: pandit._id,
          city: panditCity,
        });
      }
    }

    if (!Array.isArray(pandit.poojaOfferings)) {
      pandit.poojaOfferings = [];
    }

    const ritualNameKey = normalizeName(ritual.title);
    const existingIndex = pandit.poojaOfferings.findIndex(
      (offering) => normalizeName(offering.name) === ritualNameKey
    );

    const newOffering = {
      ...toOfferingFromRitual({
        ritual,
        existingOffering:
          existingIndex >= 0 ? pandit.poojaOfferings[existingIndex] : null,
      }),
      isSelected: Boolean(isSelected),
      durationHours: Number(durationHours) > 0
        ? Number(durationHours)
        : Number(
          (existingIndex >= 0 && pandit.poojaOfferings[existingIndex]?.durationHours) ||
          ritual.durationHours ||
          2
        ),
      travelForSpecialPooja:
        travelForSpecialPooja !== undefined
          ? Boolean(travelForSpecialPooja)
          : Boolean(
            (existingIndex >= 0 &&
              pandit.poojaOfferings[existingIndex]?.travelForSpecialPooja) ||
            ritual.travelForSpecialPooja
          ),
      standardSamagri:
        standardSamagri !== undefined
          ? Boolean(standardSamagri)
          : Boolean(
            (existingIndex >= 0 && pandit.poojaOfferings[existingIndex]?.standardSamagri) ||
            ritual.standardSamagri
          ),
      customSamagri:
        customSamagri !== undefined
          ? Boolean(customSamagri)
          : Boolean(
            (existingIndex >= 0 && pandit.poojaOfferings[existingIndex]?.customSamagri) ||
            ritual.customSamagri
          ),
      customSamagriNotes:
        customSamagriNotes !== undefined
          ? sanitizeCustomSamagriNotes(normalizeNotesInput(customSamagriNotes))
          : sanitizeCustomSamagriNotes(
            (existingIndex >= 0 && pandit.poojaOfferings[existingIndex]?.customSamagriNotes) ||
            []
          ),
      customSamagriItems:
        customSamagriItems !== undefined
          ? sanitizeCustomSamagriItems(customSamagriItems)
          : sanitizeCustomSamagriItems(
            (existingIndex >= 0 && pandit.poojaOfferings[existingIndex]?.customSamagriItems) ||
            []
          ),
    };

    if (existingIndex >= 0) {
      pandit.poojaOfferings[existingIndex] = newOffering;
    } else {
      pandit.poojaOfferings.push(newOffering);
    }

    await pandit.save();

    return res.status(201).json({
      success: true,
      message: "Ritual added for pandit",
      data: {
        ritual,
        offering: newOffering,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to add ritual",
    });
  }
};

export const addCustomSamagriToPanditRitual = async (req, res) => {
  try {
    const { ritualId } = req.params;
    const {
      itemName,
      quantity = 1,
      size = "",
      customSamagriNotes,
      customSamagriNote = "",
    } = req.body || {};

    const finalItemName = String(itemName || "").trim();
    if (!finalItemName) {
      return res.status(400).json({
        success: false,
        message: "itemName is required",
      });
    }

    const { pandit, offeringIndex, ritual } = await getRitualAndPanditOfferingContext({
      panditId: req.pandit._id,
      ritualId,
    });

    const baseOffering = {
      ...toOfferingFromRitual({
        ritual,
        existingOffering: offeringIndex >= 0 ? pandit.poojaOfferings[offeringIndex] : null,
      }),
      isSelected: true,
      customSamagri: true,
    };

    const items = sanitizeCustomSamagriItems(baseOffering.customSamagriItems || []);
    const incomingNotes = sanitizeCustomSamagriNotes(
      normalizeNotesInput(customSamagriNotes).concat(customSamagriNote)
    );
    const normalizedName = normalizeName(finalItemName);
    const existingItemIndex = items.findIndex((item) => normalizeName(item.itemName) === normalizedName);

    const incomingItem = createAutoApprovedCustomSamagriItem({
      itemName: finalItemName,
      quantity: Math.max(1, Number(quantity || 1)),
      size: String(size || "").trim(),
    });

    if (existingItemIndex >= 0) {
      items[existingItemIndex] = {
        ...items[existingItemIndex],
        ...incomingItem,
      };
    } else {
      items.push(incomingItem);
    }

    baseOffering.customSamagriItems = items;
    if (incomingNotes.length > 0) {
      baseOffering.customSamagriNotes = mergeCustomSamagriNotes(
        baseOffering.customSamagriNotes || [],
        incomingNotes
      );
    }

    if (offeringIndex >= 0) {
      pandit.poojaOfferings[offeringIndex] = baseOffering;
    } else {
      pandit.poojaOfferings.push(baseOffering);
    }

    await pandit.save();

    void notifyAdmins({
      title: "Custom samagri added",
      body: `${req.pandit?.fullName || req.pandit?.phone || "A pandit"} added custom samagri for ${ritual.title}`,
      data: {
        eventType: "pandit.custom_samagri.created",
        panditId: String(req.pandit._id),
        ritualId: String(ritual._id),
        ritualName: ritual.title,
        itemName: finalItemName,
      },
    }).catch((error) => console.error("CUSTOM SAMAGRI NOTIFICATION ERROR:", error.message));

    return res.status(201).json({
      success: true,
      message: "Custom samagri added successfully",
      data: {
        ritualId: ritual._id,
        ritualName: ritual.title,
        customSamagriNotes: baseOffering.customSamagriNotes || [],
        customSamagriItems: baseOffering.customSamagriItems,
      },
    });
  } catch (err) {
    const message = err.message || "Unable to add custom samagri";
    const statusCode = message === "Invalid ritual id" ? 400 : message === "Ritual not found" ? 404 : 500;
    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

export const getCustomSamagriToPanditRitual = async (req, res) => {
  try {
    const { ritualId } = req.params;

    const { pandit, offeringIndex, ritual } = await getRitualAndPanditOfferingContext({
      panditId: req.pandit._id,
      ritualId,
    });

    const currentOffering = offeringIndex >= 0 ? pandit.poojaOfferings[offeringIndex] : null;
    const customSamagriItems = sanitizeCustomSamagriItems(currentOffering?.customSamagriItems || []);
    const customSamagriNotes = sanitizeCustomSamagriNotes(currentOffering?.customSamagriNotes || []);

    return res.json({
      success: true,
      data: {
        ritualId: ritual._id,
        ritualName: ritual.title,
        customSamagri: Boolean(currentOffering?.customSamagri || ritual.customSamagri),
        customSamagriNotes,
        customSamagriItems,
      },
    });
  } catch (err) {
    const message = err.message || "Unable to load custom samagri";
    const statusCode = message === "Invalid ritual id" ? 400 : message === "Ritual not found" ? 404 : 500;
    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};


export const removeCustomSamagriFromPanditRitual = async (req, res) => {
  try {
    const { ritualId, itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid custom samagri item id",
      });
    }

    const { pandit, offeringIndex, ritual } = await getRitualAndPanditOfferingContext({
      panditId: req.pandit._id,
      ritualId,
    });

    if (offeringIndex < 0) {
      return res.status(404).json({
        success: false,
        message: "Ritual offering not found for pandit",
      });
    }

    const offering = {
      ...pandit.poojaOfferings[offeringIndex].toObject(),
    };

    const currentItems = sanitizeCustomSamagriItems(offering.customSamagriItems || []);
    const filteredItems = currentItems.filter(
      (item) => String(item._id) !== String(itemId)
    );

    if (filteredItems.length === currentItems.length) {
      return res.status(404).json({
        success: false,
        message: "Custom samagri item not found",
      });
    }

    offering.customSamagriItems = filteredItems;
    offering.customSamagri = filteredItems.length > 0 ? true : Boolean(offering.customSamagri);
    pandit.poojaOfferings[offeringIndex] = offering;

    await pandit.save();

    return res.json({
      success: true,
      message: "Custom samagri removed successfully",
      data: {
        ritualId: ritual._id,
        ritualName: ritual.title,
        customSamagriItems: filteredItems,
      },
    });
  } catch (err) {
    const message = err.message || "Unable to remove custom samagri";
    const statusCode = message === "Invalid ritual id" ? 400 : message === "Ritual not found" ? 404 : 500;
    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};
