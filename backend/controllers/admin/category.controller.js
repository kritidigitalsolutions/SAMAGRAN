import Category from "../../models/category.model.js";
import { uploadFileToFirebase } from "../../utils/firebaseUpload.js";

const normalizeName = (value = "") => String(value || "").trim();
const normalizeCode = (value = "") => String(value || "").trim();
const parseCommissionPercent = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 0), 100);
};

const ensureSuperAdmin = (req, res) => {
  if (req.admin?.role !== "super") {
    res.status(403).json({
      success: false,
      message: "Only super admin can manage categories",
    });
    return false;
  }
  return true;
};

export const createCategory = async (req, res) => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    const name = normalizeName(req.body?.name);
    const code = normalizeCode(req.body?.code);
    const description = normalizeName(req.body?.description);
    const status = req.body?.status === "inactive" ? "inactive" : "active";
    const subCategory = normalizeName(req.body?.subCategory);
    const superAdminCommissionPercent = parseCommissionPercent(
      req.body?.superAdminCommissionPercent,
      0
    );

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const existingFilter = { name: { $regex: `^${name}$`, $options: "i" }, vendorId: null };

    const existing = await Category.findOne(existingFilter);

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    const uploadedImage = req.file
      ? await uploadFileToFirebase(req.file, { folder: "categories" })
      : "";

    const category = await Category.create({
      vendorId: null,
      name,
      code,
      description,
      image: uploadedImage || normalizeName(req.body?.image),
      subCategory,
      superAdminCommissionPercent,
      status,
    });

    return res.status(201).json({
      success: true,
      message: "Category created",
      data: category,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to create category",
    });
  }
};

export const getAllCategories = async (req, res) => {
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

    const categories = await Category.find(filter).sort({ createdAt: -1 });

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
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (req.admin.role === "vendor" && category.vendorId && category.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
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

export const updateCategory = async (req, res) => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const name = normalizeName(req.body?.name);
    const code = normalizeCode(req.body?.code);
    const description = normalizeName(req.body?.description);
    const status = req.body?.status;
    const subCategory = normalizeName(req.body?.subCategory);
    const hasCommission = req.body?.superAdminCommissionPercent !== undefined;

    if (name) {
      const existingFilter = {
        _id: { $ne: category._id },
        name: { $regex: `^${name}$`, $options: "i" },
      };
      existingFilter.vendorId = null;

      const duplicate = await Category.findOne(existingFilter);

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Category name already in use",
        });
      }

      category.name = name;
    }

    if (code !== undefined) {
      category.code = code;
    }

    if (description !== undefined) {
      category.description = description;
    }

    if (subCategory !== undefined) {
      category.subCategory = subCategory;
    }

    if (hasCommission) {
      category.superAdminCommissionPercent = parseCommissionPercent(
        req.body?.superAdminCommissionPercent,
        category.superAdminCommissionPercent || 0
      );
    }

    if (status === "active" || status === "inactive") {
      category.status = status;
    }

    const uploadedImage = req.file
      ? await uploadFileToFirebase(req.file, { folder: "categories" })
      : "";

    if (uploadedImage) {
      category.image = uploadedImage;
    } else if (req.body?.image !== undefined) {
      category.image = normalizeName(req.body?.image);
    }

    await category.save();

    return res.json({
      success: true,
      message: "Category updated",
      data: category,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to update category",
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: "Category deleted",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to delete category",
    });
  }
};
