import Brand from "../../models/brand.model.js";
import { uploadFileToFirebase } from "../../utils/firebaseUpload.js";

const normalizeName = (value = "") => String(value || "").trim();
const normalizeCode = (value = "") => String(value || "").trim();

export const createBrand = async (req, res) => {
  try {
    const name = normalizeName(req.body?.name);
    const code = normalizeCode(req.body?.code);
    const description = normalizeName(req.body?.description);
    const status = req.body?.status === "inactive" ? "inactive" : "active";
    const parentBrand = req.body?.parentBrand || null;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Brand name is required",
      });
    }

    const existing = await Brand.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Brand already exists",
      });
    }

    if (parentBrand) {
      const parent = await Brand.findById(parentBrand);
      if (!parent) {
        return res.status(400).json({
          success: false,
          message: "Parent brand not found",
        });
      }
    }

    const uploadedImage = req.file
      ? await uploadFileToFirebase(req.file, { folder: "brands" })
      : "";

    const brand = await Brand.create({
      name,
      code,
      description,
      image: uploadedImage || normalizeName(req.body?.image),
      parentBrand: parentBrand || null,
      status,
    });

    return res.status(201).json({
      success: true,
      message: "Brand created",
      data: brand,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to create brand",
    });
  }
};

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

export const updateBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    const name = normalizeName(req.body?.name);
    const code = normalizeCode(req.body?.code);
    const description = normalizeName(req.body?.description);
    const status = req.body?.status;
    const parentBrand = req.body?.parentBrand;

    if (name) {
      const duplicate = await Brand.findOne({
        _id: { $ne: brand._id },
        name: { $regex: `^${name}$`, $options: "i" },
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Brand name already in use",
        });
      }

      brand.name = name;
    }

    if (code !== undefined) {
      brand.code = code;
    }

    if (description !== undefined) {
      brand.description = description;
    }

    if (parentBrand !== undefined) {
      if (parentBrand) {
        const parent = await Brand.findById(parentBrand);
        if (!parent) {
          return res.status(400).json({
            success: false,
            message: "Parent brand not found",
          });
        }
        brand.parentBrand = parentBrand;
      } else {
        brand.parentBrand = null;
      }
    }

    if (status === "active" || status === "inactive") {
      brand.status = status;
    }

    const uploadedImage = req.file
      ? await uploadFileToFirebase(req.file, { folder: "brands" })
      : "";

    if (uploadedImage) {
      brand.image = uploadedImage;
    } else if (req.body?.image !== undefined) {
      brand.image = normalizeName(req.body?.image);
    }

    await brand.save();

    return res.json({
      success: true,
      message: "Brand updated",
      data: brand,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to update brand",
    });
  }
};

export const deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findByIdAndDelete(req.params.id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    return res.json({
      success: true,
      message: "Brand deleted",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to delete brand",
    });
  }
};
