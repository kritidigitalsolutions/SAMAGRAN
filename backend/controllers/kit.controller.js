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

    const vendorFilter = await buildVendorCityFilter(city);

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

    const kits = await FestivalKit.find(filter)
      .populate("items.product", "title slug pricing media category")
      .sort({ createdAt: -1 });

    res.status(200).json({
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
