import FestivalKit from "../models/festivalKit.model.js";
import {
  resolveCity,
  buildVendorCityFilter,
  sendCityRequired,
} from "../utils/locationFilter.js";

const CUSTOMIZE_KIT_TYPES = ["Customize", "default"];

export const getDefaultKitsForUsers = async (req, res) => {
  try {
    // ── City filtering ──────────────────────────────────────────────────
    const city = resolveCity(req);
    if (!city) return sendCityRequired(res);

    const vendorFilter = await buildVendorCityFilter(city, req);

    const { search = "" } = req.query;

    const filter = {
      status: "active",
      kitType: { $in: CUSTOMIZE_KIT_TYPES },
      ...vendorFilter,
    };

    if (search.trim()) {
      filter.name = { $regex: search.trim(), $options: "i" };
    }

    const kits = await FestivalKit.find(filter)
      // .populate("items.product", "title pricing media category")
      .populate("items.product", "title pricing media")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      city,
      count: kits.length,
      data: kits,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getDefaultKitByIdForUsers = async (req, res) => {
  try {
    // ── City filtering ──────────────────────────────────────────────────
    const city = resolveCity(req);
    if (!city) return sendCityRequired(res);

    const vendorFilter = await buildVendorCityFilter(city, req);

    const kitFilter = {
      _id: req.params.id,
      status: "active",
      kitType: { $in: CUSTOMIZE_KIT_TYPES },
      ...vendorFilter,
    };

    const kit = await FestivalKit.findOne(kitFilter)
      // .populate("items.product", "title pricing media stock status category");
      .populate("items.product", "title pricing media stock status");

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: "Customize kit not found",
      });
    }

    res.json({
      success: true,
      data: kit,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};



