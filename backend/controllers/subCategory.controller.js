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

    const vendorFilter = city ? await buildVendorCityFilter(city, req) : {};

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

    const isUnlimited = req.query.all === "true" || req.query.pagination === "false";
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    let subCategories;
    let totalSubCategories;

    if (!isUnlimited) {
      const skip = (pageNum - 1) * limitNum;
      [totalSubCategories, subCategories] = await Promise.all([
        SubCategory.countDocuments(filter),
        SubCategory.find(filter)
          .select("name code image categoryId status")
          .populate("categoryId", "name code")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
      ]);
    } else {
      subCategories = await SubCategory.find(filter)
        .select("name code image categoryId status")
        .populate("categoryId", "name code")
        .sort({ createdAt: -1 })
        .lean();
      totalSubCategories = subCategories.length;
    }

    const totalPages = isUnlimited ? 1 : Math.ceil(totalSubCategories / limitNum);

    return res.json({
      success: true,
      city: city || "all",
      count: subCategories.length,
      pagination: {
        totalSubCategories,
        totalPages,
        currentPage: isUnlimited ? 1 : pageNum,
        limit: isUnlimited ? totalSubCategories : limitNum,
        hasNextPage: isUnlimited ? false : pageNum < totalPages,
        hasPrevPage: isUnlimited ? false : pageNum > 1,
      },
      data: subCategories,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load sub-categories",
    });
  }
};
