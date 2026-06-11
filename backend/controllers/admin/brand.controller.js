import Brand from "../../models/brand.model.js";
import { uploadFileToFirebase } from "../../utils/firebaseUpload.js";

const normalizeName = (value = "") => String(value || "").trim();
const normalizeCode = (value = "") => String(value || "").trim();

export const createBrand = async (req, res) => {
  try {
    const name = normalizeName(req.body?.name);
    const description = normalizeName(req.body?.description);
    const status = req.body?.status === "inactive" ? "inactive" : "active";
    const subBrand = normalizeName(req.body?.subBrand);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Brand name is required",
      });
    }

    // Duplicate check: same name + same subBrand (case-insensitive) is not allowed
    const existingFilter = {
      name: { $regex: `^${name}$`, $options: "i" },
      subBrand: { $regex: `^${subBrand}$`, $options: "i" },
    };
    if (req.admin.role === "vendor") {
      existingFilter.vendorId = req.vendor._id;
    } else {
      existingFilter.vendorId = null;
    }

    const existing = await Brand.findOne(existingFilter);

    if (existing) {
      return res.status(400).json({
        success: false,
        message: subBrand
          ? `Brand "${name}" with sub-brand "${subBrand}" already exists`
          : `Brand "${name}" (without sub-brand) already exists`,
      });
    }

    const uploadedImage = req.file
      ? await uploadFileToFirebase(req.file, { folder: "brands" })
      : "";

    // code is intentionally omitted — pre-save hook auto-generates it
    const brand = await Brand.create({
      vendorId: req.admin.role === "vendor" ? req.vendor._id : null,
      name,
      description,
      image: uploadedImage || normalizeName(req.body?.image),
      subBrand,
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

    const vendorFilter = req.admin.role === "vendor" 
      ? { $or: [{ vendorId: req.vendor._id }, { vendorId: null }] } 
      : {};

    const searchFilter = search.trim() 
      ? { $or: [{ name: { $regex: search.trim(), $options: "i" } }, { code: { $regex: search.trim(), $options: "i" } }] } 
      : {};

    if (Object.keys(vendorFilter).length > 0 && Object.keys(searchFilter).length > 0) {
      filter.$and = [vendorFilter, searchFilter];
    } else if (Object.keys(vendorFilter).length > 0) {
      Object.assign(filter, vendorFilter);
    } else if (Object.keys(searchFilter).length > 0) {
      Object.assign(filter, searchFilter);
    }

    const brands = await Brand.find(filter).sort({ createdAt: -1 });

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
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    if (req.admin.role === "vendor" && brand.vendorId && brand.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
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

    if (req.admin.role === "vendor" && brand.vendorId && brand.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const name = normalizeName(req.body?.name);
    const description = normalizeName(req.body?.description);
    const status = req.body?.status;
    const subBrand = normalizeName(req.body?.subBrand);

    // Resolve final values for duplicate check
    const finalName = name || brand.name;
    const finalSubBrand = subBrand !== undefined ? subBrand : (brand.subBrand || "");

    // Duplicate check: same name + same subBrand combo (case-insensitive), excluding self
    const existingFilter = {
      _id: { $ne: brand._id },
      name: { $regex: `^${finalName}$`, $options: "i" },
      subBrand: { $regex: `^${finalSubBrand}$`, $options: "i" },
    };
    if (req.admin.role === "vendor") {
      existingFilter.vendorId = req.vendor._id;
    } else {
      existingFilter.vendorId = null;
    }

    const duplicate = await Brand.findOne(existingFilter);

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: finalSubBrand
          ? `Brand "${finalName}" with sub-brand "${finalSubBrand}" already exists`
          : `Brand "${finalName}" (without sub-brand) already exists`,
      });
    }

    if (name) {
      brand.name = name;
    }

    if (description !== undefined) {
      brand.description = description;
    }

    if (subBrand !== undefined) {
      brand.subBrand = subBrand;
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
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    if (req.admin.role === "vendor" && (!brand.vendorId || brand.vendorId.toString() !== req.vendor._id.toString())) {
      return res.status(403).json({
        success: false,
        message: "Access denied (Cannot delete global or other vendor's brand)",
      });
    }

    await Brand.findByIdAndDelete(req.params.id);

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
