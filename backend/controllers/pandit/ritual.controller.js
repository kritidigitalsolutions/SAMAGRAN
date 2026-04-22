import Ritual from "../../models/ritual.model.js";
import Pandit from "../../models/pandit.model.js";

const normalizeName = (value = "") => String(value || "").trim().toLowerCase();

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
});

export const getAllRitualsForPandit = async (req, res) => {
  try {
    const { search = "" } = req.query;

    const filter = { status: "active" };

    if (String(search || "").trim()) {
      const regex = { $regex: String(search).trim(), $options: "i" };
      filter.$or = [{ title: regex }, { description: regex }];
    }

    const rituals = await Ritual.find(filter).sort({ createdAt: -1 }).lean();

    const pandit = await Pandit.findById(req.pandit._id).select("poojaOfferings").lean();
    const offerings = Array.isArray(pandit?.poojaOfferings) ? pandit.poojaOfferings : [];

    const offeringsMap = new Map(
      offerings.map((offering) => [normalizeName(offering.name), offering])
    );

    const data = rituals.map((ritual) => {
      const linkedOffering = offeringsMap.get(normalizeName(ritual.title));

      return {
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
      };
    });

    return res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load rituals",
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
      isSelected = true,
    } = req.body;

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
        ritual = await Ritual.create({
          title: finalTitle,
          description: String(description || "").trim(),
          image: String(image || "").trim(),
          durationHours: Number(durationHours) > 0 ? Number(durationHours) : 2,
          travelForSpecialPooja: Boolean(travelForSpecialPooja),
          standardSamagri: Boolean(standardSamagri),
          customSamagri: Boolean(customSamagri),
          status: "active",
        });
      }
    }

    const pandit = await Pandit.findById(req.pandit._id);
    if (!pandit) {
      return res.status(404).json({
        success: false,
        message: "Pandit not found",
      });
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
