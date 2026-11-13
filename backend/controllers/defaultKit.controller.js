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

    const hasPagination = (req.query.page !== undefined || req.query.limit !== undefined) &&
      req.query.all !== "true" &&
      req.query.pagination !== "false";

    let kits;
    let totalKits;
    let pageNum = 1;
    let limitNum = 20;

    if (hasPagination) {
      pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
      limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
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
      limitNum = totalKits;
    }

    const totalPages = hasPagination ? Math.ceil(totalKits / limitNum) : 1;

    res.json({
      success: true,
      city,
      count: kits.length,
      pagination: {
        totalKits,
        totalPages,
        currentPage: hasPagination ? pageNum : 1,
        limit: limitNum,
        hasNextPage: hasPagination ? pageNum < totalPages : false,
        hasPrevPage: hasPagination ? pageNum > 1 : false,
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



