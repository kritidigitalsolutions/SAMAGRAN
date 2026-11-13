import Brand from "../models/brand.model.js";
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
 * GET /api/brands
 * Returns only brands that have ≥1 active product available in the
 * user's selected city. Guest users must supply ?city=.
 */
export const getAllBrandsUser = async (req, res) => {
  try {
    const city = resolveCity(req);
    const { search = "" } = req.query;

    if (!city) {
      return sendCityRequired(res);
    }

    const vendorFilter = await buildVendorCityFilter(city, req);

    const filter = {
      status: "active",
      ...vendorFilter,
    };

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      filter.$or = [{ name: regex }, { code: regex }];
    }

    const isUnlimited = req.query.all === "true" || req.query.pagination === "false";
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    let brands;
    let totalBrands;

    if (!isUnlimited) {
      const skip = (pageNum - 1) * limitNum;
      [totalBrands, brands] = await Promise.all([
        Brand.countDocuments(filter),
        Brand.find(filter)
          .populate("vendorId", "name businessName email phone address")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
      ]);
    } else {
      brands = await Brand.find(filter)
        .populate("vendorId", "name businessName email phone address")
        .sort({ createdAt: -1 })
        .lean();
      totalBrands = brands.length;
    }

    const totalPages = isUnlimited ? 1 : Math.ceil(totalBrands / limitNum);

    return res.json({
      success: true,
      city,
      count: brands.length,
      pagination: {
        totalBrands,
        totalPages,
        currentPage: isUnlimited ? 1 : pageNum,
        limit: isUnlimited ? totalBrands : limitNum,
        hasNextPage: isUnlimited ? false : pageNum < totalPages,
        hasPrevPage: isUnlimited ? false : pageNum > 1,
      },
      data: brands,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load brands",
    });
  }
};

// ─── Shared ───────────────────────────────────────────────────────────

export const getAllBrands = async (req, res) => {
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

    const brands = await Brand.find(filter)
      .populate("subBrand", "name code")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: brands.length,
      data: brands,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load brands",
    });
  }
};

export const getBrandById = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id).populate(
      "parentBrand",
      "name code"
    );

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    return res.json({
      success: true,
      data: brand,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load brand",
    });
  }
};
