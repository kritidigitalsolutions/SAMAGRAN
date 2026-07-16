import SubCategory from "../../models/subCategory.model.js";
import Category from "../../models/category.model.js";
import { uploadFileToFirebase } from "../../utils/firebaseUpload.js";

const normalizeName = (value = "") => String(value || "").trim();

const vendorPopulateSelect = "name businessName email phone address";
const subCategoryPopulate = [
  { path: "vendorId", select: vendorPopulateSelect },
  {
    path: "categoryId",
    select: "name code vendorId",
    populate: { path: "vendorId", select: vendorPopulateSelect },
  },
];

const resolveSubCategoryVendorId = (category) => category?.vendorId || null;

const ensureCanManageSubCategories = (req, res) => {
  if (req.admin?.role === "super") {
    return true;
  }
  res.status(403).json({
    success: false,
    message: "Only super admin can manage sub-categories",
  });
  return false;
};

export const createSubCategory = async (req, res) => {
  try {
    if (!ensureCanManageSubCategories(req, res)) return;

    const name = normalizeName(req.body?.name);
    const description = normalizeName(req.body?.description);
    const categoryId = req.body?.categoryId;
    const status = req.body?.status === "inactive" ? "inactive" : "active";

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Sub-category name is required",
      });
    }

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    // Verify parent category exists
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Parent Category not found",
      });
    }

    // Ownership check: vendor can only link to their own categories
    if (req.admin.role === "vendor") {
      if (!categoryExists.vendorId || categoryExists.vendorId.toString() !== req.vendor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to add sub-categories to this category",
        });
      }
    }

    // Duplicate check: same name under same parent category (case-insensitive) is not allowed
    const existing = await SubCategory.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
      categoryId,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Sub-category "${name}" already exists under this category`,
      });
    }

    const uploadedImage = req.file
      ? await uploadFileToFirebase(req.file, { folder: "subcategories" })
      : "";

    // code is auto-generated in pre-save hook
    const subCategory = await SubCategory.create({
      vendorId: resolveSubCategoryVendorId(categoryExists),
      categoryId,
      name,
      description,
      image: uploadedImage || normalizeName(req.body?.image),
      status,
    });

    await subCategory.populate(subCategoryPopulate);

    return res.status(201).json({
      success: true,
      message: "Sub-category created",
      data: subCategory,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to create sub-category",
    });
  }
};

export const getAllSubCategories = async (req, res) => {
  try {
    const { search = "", status = "all", categoryId } = req.query;
    const filter = {};

    if (status !== "all") {
      filter.status = status;
    }

    if (categoryId) {
      if (req.admin.role === "vendor") {
        const accessibleCategories = await Category.find({
          $or: [{ vendorId: req.vendor._id }, { vendorId: null }],
        }).select("_id");
        const categoryIds = accessibleCategories.map((c) => c._id.toString());
        if (!categoryIds.includes(categoryId.toString())) {
          return res.status(403).json({
            success: false,
            message: "Access denied to this category's sub-categories",
          });
        }
      }
      filter.categoryId = categoryId;
    } else if (req.admin.role === "vendor") {
      const accessibleCategories = await Category.find({
        $or: [{ vendorId: req.vendor._id }, { vendorId: null }],
      }).select("_id");
      const categoryIds = accessibleCategories.map((c) => c._id);
      filter.categoryId = { $in: categoryIds };
    }

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      filter.$or = [
        { name: regex },
        { code: regex }
      ];
    }

    const subCategories = await SubCategory.find(filter)
      .populate(subCategoryPopulate)
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: subCategories.length,
      data: subCategories,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load sub-categories",
    });
  }
};

export const getSubCategoryById = async (req, res) => {
  try {
    const subCategory = await SubCategory.findById(req.params.id).populate(subCategoryPopulate);

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Sub-category not found",
      });
    }

    if (req.admin.role === "vendor") {
      const parentCategory = subCategory.categoryId;
      if (parentCategory && parentCategory.vendorId && parentCategory.vendorId.toString() !== req.vendor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    return res.json({
      success: true,
      data: subCategory,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load sub-category",
    });
  }
};

export const updateSubCategory = async (req, res) => {
  try {
    if (!ensureCanManageSubCategories(req, res)) return;

    const subCategory = await SubCategory.findById(req.params.id);

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Sub-category not found",
      });
    }

    const name = normalizeName(req.body?.name);
    const description = normalizeName(req.body?.description);
    const categoryId = req.body?.categoryId;
    const status = req.body?.status;

    const finalName = name || subCategory.name;
    const finalCategoryId = categoryId || subCategory.categoryId;

    if (req.admin.role === "vendor") {
      const parentCategory = await Category.findById(subCategory.categoryId);
      if (parentCategory && parentCategory.vendorId && parentCategory.vendorId.toString() !== req.vendor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to manage this sub-category",
        });
      }
      if (parentCategory && !parentCategory.vendorId) {
        return res.status(403).json({
          success: false,
          message: "You cannot modify global sub-categories",
        });
      }
    }

    // Verify parent category exists if it is being updated
    if (categoryId) {
      const categoryExists = await Category.findById(categoryId);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: "Parent Category not found",
        });
      }
      if (req.admin.role === "vendor") {
        if (!categoryExists.vendorId || categoryExists.vendorId.toString() !== req.vendor._id.toString()) {
          return res.status(403).json({
            success: false,
            message: "You do not have permission to move sub-categories to this category",
          });
        }
      }
    }

    // Duplicate check: exclude self
    const duplicate = await SubCategory.findOne({
      _id: { $ne: subCategory._id },
      name: { $regex: `^${finalName}$`, $options: "i" },
      categoryId: finalCategoryId,
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Sub-category "${finalName}" already exists under this category`,
      });
    }

    if (name) {
      subCategory.name = name;
    }

    if (description !== undefined) {
      subCategory.description = description;
    }

    if (categoryId) {
      const nextCategory = await Category.findById(categoryId).select("vendorId");
      subCategory.categoryId = categoryId;
      subCategory.vendorId = resolveSubCategoryVendorId(nextCategory);
    }

    if (status === "active" || status === "inactive") {
      subCategory.status = status;
    }

    const uploadedImage = req.file
      ? await uploadFileToFirebase(req.file, { folder: "subcategories" })
      : "";

    if (uploadedImage) {
      subCategory.image = uploadedImage;
    } else if (req.body?.image !== undefined) {
      subCategory.image = normalizeName(req.body?.image);
    }

    await subCategory.save();
    await subCategory.populate(subCategoryPopulate);

    return res.json({
      success: true,
      message: "Sub-category updated",
      data: subCategory,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to update sub-category",
    });
  }
};

export const deleteSubCategory = async (req, res) => {
  try {
    if (!ensureCanManageSubCategories(req, res)) return;

    const subCategory = await SubCategory.findById(req.params.id);

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Sub-category not found",
      });
    }

    if (req.admin.role === "vendor") {
      const parentCategory = await Category.findById(subCategory.categoryId);
      if (parentCategory && parentCategory.vendorId && parentCategory.vendorId.toString() !== req.vendor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to manage this sub-category",
        });
      }
      if (parentCategory && !parentCategory.vendorId) {
        return res.status(403).json({
          success: false,
          message: "You cannot delete global sub-categories",
        });
      }
    }

    await SubCategory.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: "Sub-category deleted",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to delete sub-category",
    });
  }
};


