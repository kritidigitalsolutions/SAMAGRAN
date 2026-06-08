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

    let brands;

    if (city) {
      // City provided: filter to brands with products in this city
      const vendorFilter = await buildVendorCityFilter(city);
      const cityProducts = await Item.find(
        { status: "active", ...vendorFilter },
        { brandId: 1 }
      ).lean();

      const brandIdSet = new Set(
        cityProducts
          .map((p) => p.brandId?.toString())
          .filter(Boolean)
      );

      if (brandIdSet.size === 0) {
        brands = [];
      } else {
        const filter = {
          status: "active",
          _id: { $in: [...brandIdSet] },
        };

        if (search.trim()) {
          const regex = { $regex: search.trim(), $options: "i" };
          filter.$or = [{ name: regex }, { code: regex }];
        }

        brands = await Brand.find(filter).sort({ createdAt: -1 });
      }
    } else {
      // No city: return all active brands
      const filter = { status: "active" };

      if (search.trim()) {
        const regex = { $regex: search.trim(), $options: "i" };
        filter.$or = [{ name: regex }, { code: regex }];
      }

      brands = await Brand.find(filter).sort({ createdAt: -1 });
    }

    return res.json({
      success: true,
      ...(city ? { city } : {}),
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
