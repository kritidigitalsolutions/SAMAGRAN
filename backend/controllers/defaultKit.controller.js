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

    const isUnlimited = req.query.all === "true" || req.query.pagination === "false";
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    let kits;
    let totalKits;

    if (!isUnlimited) {
      const skip = (pageNum - 1) * limitNum;
      [totalKits, kits] = await Promise.all([
        FestivalKit.countDocuments(filter),
        FestivalKit.find(filter)
          .populate("items.product", "title pricing media")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
      ]);
    } else {
      kits = await FestivalKit.find(filter)
        .populate("items.product", "title pricing media")
        .sort({ createdAt: -1 })
        .lean();
      totalKits = kits.length;
    }

    const totalPages = isUnlimited ? 1 : Math.ceil(totalKits / limitNum);

    res.json({
      success: true,
      city,
      count: kits.length,
      pagination: {
        totalKits,
        totalPages,
        currentPage: isUnlimited ? 1 : pageNum,
        limit: isUnlimited ? totalKits : limitNum,
        hasNextPage: isUnlimited ? false : pageNum < totalPages,
        hasPrevPage: isUnlimited ? false : pageNum > 1,
      },
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



