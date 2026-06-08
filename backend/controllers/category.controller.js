import Category from "../models/category.model.js";
import Item from "../models/product.model.js";
import {
  resolveCity,
  buildVendorCityFilter,
  sendCityRequired,
} from "../utils/locationFilter.js";
import { uploadFileToFirebase } from "../utils/firebaseUpload.js";

const normalizeName = (value = "") => String(value || "").trim();
const normalizeCode = (value = "") => String(value || "").trim();

// ─── User-facing: city-filtered ───────────────────────────────────────────────

/**
 * GET /api/category
 * Returns only categories that have ≥1 active product available in the
 * user's selected city. Guest users must supply ?city=.
 */
export const getAllCategoriesUser = async (req, res) => {
  try {
    const city = resolveCity(req);
    const { search = "" } = req.query;

    let categories;

    if (city) {
      // City provided: filter to categories with products in this city
      const vendorFilter = await buildVendorCityFilter(city);
      const cityProducts = await Item.find(
        { status: "active", ...vendorFilter },
        { categoryId: 1 }
      ).lean();

      const categoryIdSet = new Set(
        cityProducts
          .map((p) => p.categoryId?.toString())
          .filter(Boolean)
      );

      if (categoryIdSet.size === 0) {
        categories = [];
      } else {
        const filter = {
          status: "active",
          _id: { $in: [...categoryIdSet] },
        };

        if (search.trim()) {
          const regex = { $regex: search.trim(), $options: "i" };
          filter.$or = [{ name: regex }, { code: regex }];
        }

        categories = await Category.find(filter).sort({ createdAt: -1 });
      }
    } else {
      // No city: return all active categories
      const filter = { status: "active" };

      if (search.trim()) {
        const regex = { $regex: search.trim(), $options: "i" };
        filter.$or = [{ name: regex }, { code: regex }];
      }

      categories = await Category.find(filter).sort({ createdAt: -1 });
    }

    return res.json({
      success: true,
      ...(city ? { city } : {}),
      count: categories.length,
      data: categories,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load categories",
    });
  }
};

// ─── Shared (used by admin route and user getCategoryById) ───────────────────

export const getAllCategories = async (req, res) => {
  try {
    const { search = "", status = "all" } = req.query;
    const filter = {};

    if (status !== "all") {
      filter.status = status;
    }

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      filter.$or = [{ name: regex }, { code: regex }];
    }

    const categories = await Category.find(filter)
      .populate("subCategory", "name code")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load categories",
    });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate(
      "subCategory",
      "name code"
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.json({
      success: true,
      data: category,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load category",
    });
  }
};
