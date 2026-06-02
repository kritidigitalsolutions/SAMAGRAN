import Brand from "../models/brand.model.js";
import { uploadFileToFirebase } from "../utils/firebaseUpload.js";

const normalizeName = (value = "") => String(value || "").trim();
const normalizeCode = (value = "") => String(value || "").trim();


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
      .populate("parentBrand", "name code")
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
