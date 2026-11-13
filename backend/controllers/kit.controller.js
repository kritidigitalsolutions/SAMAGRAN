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
    }

    const totalPages = isUnlimited ? 1 : Math.ceil(totalKits / limitNum);

    res.status(200).json({
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
