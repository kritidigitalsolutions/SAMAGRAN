import Category from "../../models/category.model.js";
import { uploadFileToFirebase } from "../../utils/firebaseUpload.js";

const normalizeName = (value = "") => String(value || "").trim();
const normalizeCode = (value = "") => String(value || "").trim();

export const createCategory = async (req, res) => {
  try {
    const name = normalizeName(req.body?.name);
    const code = normalizeCode(req.body?.code);
    const description = normalizeName(req.body?.description);
    const status = req.body?.status === "inactive" ? "inactive" : "active";
    const parentCategory = req.body?.parentCategory || null;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const existing = await Category.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    if (parentCategory) {
      const parent = await Category.findById(parentCategory);
      if (!parent) {
        return res.status(400).json({
          success: false,
          message: "Parent category not found",
        });
      }
    }

    const uploadedImage = req.file
      ? await uploadFileToFirebase(req.file, { folder: "categories" })
      : "";

    const category = await Category.create({
      name,
      code,
      description,
      image: uploadedImage || normalizeName(req.body?.image),
      parentCategory: parentCategory || null,
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

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      filter.$or = [{ name: regex }, { code: regex }];
    }

    const categories = await Category.find(filter)
      .populate("parentCategory", "name code")
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
      "parentCategory",
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

export const updateCategory = async (req, res) => {
  try {
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
    const parentCategory = req.body?.parentCategory;

    if (name) {
      const duplicate = await Category.findOne({
        _id: { $ne: category._id },
        name: { $regex: `^${name}$`, $options: "i" },
      });

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

    if (parentCategory !== undefined) {
      if (parentCategory) {
        const parent = await Category.findById(parentCategory);
        if (!parent) {
          return res.status(400).json({
            success: false,
            message: "Parent category not found",
          });
        }
        category.parentCategory = parentCategory;
      } else {
        category.parentCategory = null;
      }
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
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

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
