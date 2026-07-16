import mongoose from "mongoose";
import Item from "../models/product.model.js";
import ProductReview from "../models/productReview.model.js";
import {
  resolveCity,
  resolvePincode,
  buildVendorCityFilter,
  sendCityRequired,
} from "../utils/locationFilter.js";

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const updateProductRatingStats = async (productId) => {
  const ratings = await ProductReview.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
        average: { $avg: "$rating" },
      },
    },
  ]);

  const counts = {
    rating1: 0,
    rating2: 0,
    rating3: 0,
    rating4: 0,
    rating5: 0,
  };

  let totalReviews = 0;
  let averageSum = 0;

  ratings.forEach((row) => {
    const ratingValue = Number(row._id);
    if (ratingValue >= 1 && ratingValue <= 5) {
      const key = `rating${ratingValue}`;
      const count = Number(row.count || 0);
      counts[key] = count;
      totalReviews += count;
      averageSum += ratingValue * count;
    }
  });

  const nextAverage = totalReviews ? averageSum / totalReviews : 0;

  await Item.findByIdAndUpdate(productId, {
    "ratings.average": Number(nextAverage.toFixed(2)),
    "ratings.totalReviews": totalReviews,
    "ratings.counts": counts,
  });

  return {
    average: Number(nextAverage.toFixed(2)),
    totalReviews,
    counts,
  };
};

const buildRatingSummary = async (productId) => {
  const ratings = await ProductReview.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
  ]);

  const counts = {
    rating1: 0,
    rating2: 0,
    rating3: 0,
    rating4: 0,
    rating5: 0,
  };

  let totalReviews = 0;
  let averageSum = 0;

  ratings.forEach((row) => {
    const ratingValue = Number(row._id);
    if (ratingValue >= 1 && ratingValue <= 5) {
      const key = `rating${ratingValue}`;
      const count = Number(row.count || 0);
      counts[key] = count;
      totalReviews += count;
      averageSum += ratingValue * count;
    }
  });

  const average = totalReviews ? averageSum / totalReviews : 0;

  return {
    average: Number(average.toFixed(2)),
    totalReviews,
    counts,
  };
};

// Get all products (User)
export const getProductsUser = async (req, res) => {
  try {
    // ── 1. Resolve city and pincode ──────────────────────────────────────────
    const city = resolveCity(req);
    const pincode = resolvePincode(req);

    if (!city && !pincode) {
      return sendCityRequired(res);
    }

    // ── 2. Auto-persist city for authenticated users when ?city= is provided ─
    const queryCity = String(req.query?.city || "").trim();
    if (queryCity && req.user && String(req.user.selectedCity || "") !== queryCity) {
      // Fire-and-forget — do not await; this should not block the response
      req.user.constructor
        .findByIdAndUpdate(req.user._id, { selectedCity: queryCity })
        .catch((err) => console.error("Failed to persist selectedCity:", err.message));
    }

    // ── 3. Build base query with city-aware vendor filter ────────────────────
    const vendorFilter = await buildVendorCityFilter(city, req);

    let query = { status: "active", ...vendorFilter };

    const { categoryId, subCategoryId, brandId, search, isRecommended, isMostPoojaEssentials, isMostUsed, isEveryDayRitual, isRitualItems } = req.query;

    if (categoryId) {
      query.categoryId = categoryId;
    }
    if (subCategoryId) {
      query.subCategoryId = subCategoryId;
    }
    if (brandId) {
      query.brandId = brandId;
    }
    if (search && String(search).trim()) {
      const searchRegex = new RegExp(escapeRegex(String(search).trim()), "i");
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
      ];
    }
    if (isRecommended === "true" || isRecommended === true) {
      query["flags.isRecommended"] = true;
    }
    if (isMostPoojaEssentials === "true" || isMostPoojaEssentials === true) {
      query["flags.isMostPoojaEssentials"] = true;
    }
    if (isMostUsed === "true" || isMostUsed === true) {
      query["flags.isMostUsed"] = true;
    }
    if (isEveryDayRitual === "true" || isEveryDayRitual === true) {
      query["flags.isEveryDayRitual"] = true;
    }
    if (isRitualItems === "true" || isRitualItems === true) {
      query["flags.isRitualItems"] = true;
    }

    const totalProducts = await Item.countDocuments(query);

    const items = await Item.find(query)
      .populate("categoryId", "name subCategory")
      .populate("subCategoryId", "name code status")
      .populate("brandId", "name subBrand")
      .sort({ createdAt: -1 });

    const products = items.map((item) => {
      const { price, mrp } = item.pricing;
      const productImages = item.media?.image || item.media?.Images || [];

      const discountPercent =
        mrp && mrp > price
          ? Math.round(((mrp - price) / mrp) * 100)
          : 0;

      // Derive category/brand from populated ref, falling back to embedded fields
      const categoryName = item.categoryId?.name || item.category?.name || "";
      const categorySubCategory = item.subCategoryId?.name || item.categoryId?.subCategory || item.category?.subCategory || "";
      const brandName = item.brandId?.name || item.details?.brand || "";
      const brandSubBrand = item.brandId?.subBrand || item.details?.subBrand || "";

      return {
        id: item._id,
        itemCode: item.itemCode || "",
        title: item.title,
        description: item.description || "",
        details: item.details || {},
        discount: item.discount || {
          type: "percent",
          value: 0,
          isActive: false,
          startsAt: null,
          expiresAt: null,
        },
        price,
        oldPrice: mrp,
        discountPercent,
        thumbnail: productImages?.[0]?.replace(/\\/g, "/") || null,
        products:
          productImages?.map((img) =>
            img.replace(/\\/g, "/")
          ) || [],
        categoryId: item.categoryId || null,
        subCategoryId: item.subCategoryId || null,
        category: {
          name: categoryName,
          subCategory: categorySubCategory,
        },
        brandId: item.brandId || null,
        brand: {
          name: brandName,
          subBrand: brandSubBrand,
        },
        inStock: item.stock.quantity > 0,
        review: item.review || {
          "review": {     
            "comment": "",
            "rating": 0,
        },
      },
        ratings: item.ratings || {
          average: 0,
          totalReviews: 0,
          counts: {
            rating1: 0,
            rating2: 0,
            rating3: 0,
            rating4: 0,
            rating5: 0,
          },
        },
        isRecommended: item.flags.isRecommended,
        isMostPoojaEssentials: item.flags.isMostPoojaEssentials,
        isMostUsed: item.flags.isMostUsed,
        isEveryDayRitual: item.flags.isEveryDayRitual,
        isRitualItems: item.flags.isRitualItems,
      };
    });

    res.json({
      success: true,
      city,
      data: {
        products,
        pagination: {
          totalProducts,
          totalPages: Math.ceil(totalProducts),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get single product (User)
export const getSingleProductUser = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate("categoryId", "name subCategory")
      .populate("subCategoryId", "name code status")
      .populate("brandId", "name subBrand");

    if (!item || item.status !== "active") {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const { price, mrp, currency } = item.pricing;

    const discountPercent =
      mrp && mrp > price
        ? Math.round(((mrp - price) / mrp) * 100)
        : 0;

    const savings = mrp && mrp > price ? mrp - price : 0;

    // Derive category/brand from populated ref, falling back to embedded fields
    const categoryName = item.categoryId?.name || item.category?.name || "";
    const categorySubCategory = item.subCategoryId?.name || item.categoryId?.subCategory || item.category?.subCategory || "";
    const brandName = item.brandId?.name || item.details?.brand || "";
    const brandSubBrand = item.brandId?.subBrand || item.details?.subBrand || "";

    res.json({
      success: true,
      data: {
        id: item._id,
        itemCode: item.itemCode || "",
        title: item.title,
        description: item.description || "",
        details: item.details || {},
        discount: item.discount || {
          type: "percent",
          value: 0,
          isActive: false,
          startsAt: null,
          expiresAt: null,
        },
        categoryId: item.categoryId || null,
        subCategoryId: item.subCategoryId || null,
        category: {
          name: categoryName,
          subCategory: categorySubCategory,
        },
        brandId: item.brandId || null,
        brand: {
          name: brandName,
          subBrand: brandSubBrand,
        },
        pricing: {
          price,
          mrp,
          discountPercent,
          savings,
          currency,
        },
        image: item.media?.image || item.media?.Images || [],
        stock: {
          status: item.stock.quantity > 0 ? "in_stock" : "out_of_stock",
        },
        review: item.review || {
          "review": {     
            "comment": "",
            "rating": 0,
        },
        },
        ratings: item.ratings || {
          average: 0,
          totalReviews: 0,
          counts: {
            rating1: 0,
            rating2: 0,
            rating3: 0,
            rating4: 0,
            rating5: 0,
          },
        },
        tags: item.tags || [],
        isRecommended: item.flags.isRecommended,
        isMostPoojaEssentials: item.flags.isMostPoojaEssentials,
        isMostUsed: item.flags.isMostUsed,
        isEveryDayRitual: item.flags.isEveryDayRitual,
        isRitualItems: item.flags.isRitualItems,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add or update product rating (User)
export const addProductRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment = "" } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const normalizedRating = Number(rating);
    if (!Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      return res.status(400).json({
        success: false,
        message: "rating must be between 1 and 5",
      });
    }

    const product = await Item.findById(id);
    if (!product || product.status !== "active") {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const filter = { product: id, user: req.user._id };
    const update = {
      rating: normalizedRating,
      comment: String(comment || "").trim(),
    };

    const review = await ProductReview.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    const stats = await updateProductRatingStats(id);

    return res.json({
      success: true,
      message: "Rating saved successfully",
      data: {
        review,
        ratings: stats,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get product ratings (User)
export const getProductRatings = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const product = await Item.findById(id).select("status");
    if (!product || product.status !== "active") {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const safeLimit = Math.min(Number(limit) || 10, 50);
    const safePage = Number(page) || 1;
    const skip = (safePage - 1) * safeLimit;

    const [totalReviews, summary, reviews] = await Promise.all([
      ProductReview.countDocuments({ product: id }),
      buildRatingSummary(id),
      ProductReview.find({ product: id })
        .populate("user", "name profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
    ]);

    return res.json({
      success: true,
      data: {
        ratings: summary,
        reviews,
        pagination: {
          totalReviews,
          currentPage: safePage,
          totalPages: Math.ceil(totalReviews / safeLimit),
          limit: safeLimit,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
