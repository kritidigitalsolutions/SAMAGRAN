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

    const hasPagination = (req.query.page !== undefined || req.query.limit !== undefined) &&
      req.query.all !== "true" &&
      req.query.pagination !== "false";

    let subCategories;
    let totalSubCategories;
    let pageNum = 1;
    let limitNum = 20;

    if (hasPagination) {
      pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
      limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
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
      limitNum = totalSubCategories;
    }

    const totalPages = hasPagination ? Math.ceil(totalSubCategories / limitNum) : 1;

    return res.json({
      success: true,
      city: city || "all",
      count: subCategories.length,
      pagination: {
        totalSubCategories,
        totalPages,
        currentPage: hasPagination ? pageNum : 1,
        limit: limitNum,
        hasNextPage: hasPagination ? pageNum < totalPages : false,
        hasPrevPage: hasPagination ? pageNum > 1 : false,
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
