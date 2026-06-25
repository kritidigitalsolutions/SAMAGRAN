import SubCategory from "../models/subCategory.model.js";

/**
 * GET /api/sub-categories
 * Returns active sub-categories, optionally filtered by categoryId.
 */
export const getAllSubCategoriesUser = async (req, res) => {
  try {
    const { categoryId, search = "" } = req.query;
    const filter = { status: "active" };

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      filter.$or = [{ name: regex }, { code: regex }];
    }

    const subCategories = await SubCategory.find(filter)
      .populate("categoryId", "name code")
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
