import SubCategory from "../models/subCategory.model.js";
import Item from "../models/product.model.js";
import {
  resolveCity,
  buildVendorCityFilter,
  sendCityRequired,
} from "../utils/locationFilter.js";

/**
 * GET /api/sub-categories
 * Returns active sub-categories that have products available in the selected city.
 */
export const getAllSubCategoriesUser = async (req, res) => {
  try {
    const city = resolveCity(req);
    const { categoryId, search = "" } = req.query;

    if (!city) {
      return sendCityRequired(res);
    }

    const vendorFilter = await buildVendorCityFilter(city);

    const filter = {
      status: "active",
      ...vendorFilter,
    };

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      filter.$or = [{ name: regex }, { code: regex }];
    }

    const subCategories = await SubCategory.find(filter)
      .populate("vendorId", "name businessName email phone address")
      .populate({
        path: "categoryId",
        select: "name code vendorId",
        populate: { path: "vendorId", select: "name businessName email phone address" },
      })
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      city,
      count: subCategories.length,
      data: subCategories,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load sub-categories",
    });
  }
};
