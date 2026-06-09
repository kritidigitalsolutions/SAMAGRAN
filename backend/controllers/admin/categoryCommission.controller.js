import CategoryCommission from "../../models/categoryCommission.model.js";
import Category from "../../models/category.model.js";
import { buildVendorFinance } from "../../utils/vendorFinance.js";

// Helper for access check
const ensureSuperAdmin = (req, res) => {
  if (req.admin?.role !== "super") {
    res.status(403).json({
      success: false,
      message: "Only super admin can manage category commissions",
    });
    return false;
  }
  return true;
};

// Create a Category Commission
export const createCategoryCommission = async (req, res) => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    const {
      categoryId,
      subCategory = "All",
      commissionType = "Percentage (%)",
      base = "Profit (Selling - Purchase)",
      partnerSharePercent = 0,
      partnerShareFlat = 0,
      superAdminSharePercent = 0,
      superAdminShareFlat = 0,
      status = "active",
    } = req.body;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Selected Category does not exist",
      });
    }

    // Check if commission already exists for this Category and SubCategory
    const existing = await CategoryCommission.findOne({ categoryId, subCategory });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Commission configuration already exists for category "${category.name}" and subcategory "${subCategory}"`,
      });
    }

    const commission = await CategoryCommission.create({
      categoryId,
      categoryName: category.name,
      subCategory,
      commissionType,
      base,
      partnerSharePercent: Number(partnerSharePercent) || 0,
      partnerShareFlat: Number(partnerShareFlat) || 0,
      superAdminSharePercent: Number(superAdminSharePercent) || 0,
      superAdminShareFlat: Number(superAdminShareFlat) || 0,
      status,
    });

    return res.status(201).json({
      success: true,
      message: "Category commission created successfully",
      data: commission,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to create category commission",
    });
  }
};

// Get All Category Commissions with filters and search
export const getAllCategoryCommissions = async (req, res) => {
  try {
    const { search = "", status = "all", subCategory = "all" } = req.query;
    const filter = {};

    if (status !== "all") {
      filter.status = status;
    }

    if (subCategory !== "all") {
      filter.subCategory = subCategory;
    }

    if (search.trim()) {
      filter.$or = [
        { categoryName: { $regex: search.trim(), $options: "i" } },
        { subCategory: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const commissions = await CategoryCommission.find(filter)
      .populate("categoryId", "name subCategory")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: commissions.length,
      data: commissions,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load category commissions",
    });
  }
};

// Get Category Commission by ID
export const getCategoryCommissionById = async (req, res) => {
  try {
    const commission = await CategoryCommission.findById(req.params.id)
      .populate("categoryId", "name subCategory");

    if (!commission) {
      return res.status(404).json({
        success: false,
        message: "Category commission rule not found",
      });
    }

    return res.json({
      success: true,
      data: commission,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load category commission details",
    });
  }
};

// Update Category Commission
export const updateCategoryCommission = async (req, res) => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    const commission = await CategoryCommission.findById(req.params.id);
    if (!commission) {
      return res.status(404).json({
        success: false,
        message: "Category commission rule not found",
      });
    }

    const {
      subCategory,
      commissionType,
      base,
      partnerSharePercent,
      partnerShareFlat,
      superAdminSharePercent,
      superAdminShareFlat,
      status,
    } = req.body;

    // Check duplicate if subCategory is changing
    if (subCategory !== undefined && subCategory !== commission.subCategory) {
      const duplicate = await CategoryCommission.findOne({
        categoryId: commission.categoryId,
        subCategory,
        _id: { $ne: commission._id },
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Commission configuration already exists for this subcategory: "${subCategory}"`,
        });
      }
      commission.subCategory = subCategory;
    }

    if (commissionType !== undefined) commission.commissionType = commissionType;
    if (base !== undefined) commission.base = base;
    if (partnerSharePercent !== undefined) commission.partnerSharePercent = Number(partnerSharePercent) || 0;
    if (partnerShareFlat !== undefined) commission.partnerShareFlat = Number(partnerShareFlat) || 0;
    if (superAdminSharePercent !== undefined) commission.superAdminSharePercent = Number(superAdminSharePercent) || 0;
    if (superAdminShareFlat !== undefined) commission.superAdminShareFlat = Number(superAdminShareFlat) || 0;
    if (status !== undefined) commission.status = status;

    await commission.save();

    return res.json({
      success: true,
      message: "Category commission updated successfully",
      data: commission,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to update category commission",
    });
  }
};

// Delete Category Commission
export const deleteCategoryCommission = async (req, res) => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    const commission = await CategoryCommission.findById(req.params.id);
    if (!commission) {
      return res.status(404).json({
        success: false,
        message: "Category commission rule not found",
      });
    }

    await CategoryCommission.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: "Category commission deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to delete category commission",
    });
  }
};

// Get Category Commission Stats
export const getCategoryCommissionStats = async (req, res) => {
  try {
    // 1. Total active categories count
    const totalCategories = await Category.countDocuments({ status: "active", vendorId: null });

    // 2. Total active sub-categories count
    const uniqueSubcategories = await Category.distinct("subCategory", { status: "active", vendorId: null });
    const totalSubCategories = uniqueSubcategories.filter(Boolean).length;

    // 3. Finance stats (Partner payout and Samagran platform shares)
    const finance = await buildVendorFinance();

    // 4. Avg. Partner Share (for Percentage type commissions)
    const activeCommissions = await CategoryCommission.find({ status: "active" });
    const percentageCommissions = activeCommissions.filter(c => c.commissionType === "Percentage (%)");
    
    let avgPartnerShare = 60.0; // Fallback default matching mock UI
    if (percentageCommissions.length > 0) {
      const totalShare = percentageCommissions.reduce((sum, c) => sum + (c.partnerSharePercent || 0), 0);
      avgPartnerShare = totalShare / percentageCommissions.length;
    }

    return res.json({
      success: true,
      data: {
        totalCategories,
        totalSubCategories,
        totalPartnerPayout: finance.vendorNetEarning,
        totalSamagranAmount: finance.superAdminCommission,
        avgPartnerShare,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load category commission statistics",
    });
  }
};
