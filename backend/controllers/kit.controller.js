import FestivalKit from "../models/festivalKit.model.js";
import {
  resolveCity,
  buildVendorCityFilter,
  sendCityRequired,
} from "../utils/locationFilter.js";

export const getAllKitsForUsers = async (req, res) => {
  try {
    // ── City filtering ──────────────────────────────────────────────────
    const city = resolveCity(req);
    if (!city) return sendCityRequired(res);

    const vendorFilter = await buildVendorCityFilter(city, req);

    const { search = "", festivalType } = req.query;
    const searchText = search.trim();

    const filter = {
      status: "active",
      ...vendorFilter,
    };

    if (searchText) {
      filter.name = { $regex: searchText, $options: "i" };
    }

    if (festivalType && festivalType !== "All") {
      filter.festivalType = festivalType;
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
          .populate("items.product", "title slug pricing media")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
      ]);
    } else {
      kits = await FestivalKit.find(filter)
        .populate("items.product", "title slug pricing media")
        .sort({ createdAt: -1 })
        .lean();
      totalKits = kits.length;
      limitNum = totalKits;
    }

    const totalPages = hasPagination ? Math.ceil(totalKits / limitNum) : 1;

    res.status(200).json({
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
