import mongoose from "mongoose";
import Item from "../models/product.model.js";
import ProductReview from "../models/productReview.model.js";

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

// Get all products (User)
export const getProductsUser = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    const skip = (page - 1) * limit;

    let query = { status: "active" };

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");

      query.$or = [
        { title: searchRegex },
        { "category.name": searchRegex },
        { description: searchRegex },
        { "details.brand": searchRegex },
        { "details.sku": searchRegex },
        { "details.manufacturer": searchRegex },
        { tags: searchRegex },
      ];
    }

    const totalProducts = await Item.countDocuments(query);

    const items = await Item.find(query)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const products = items.map((item) => {
      const { price, mrp } = item.pricing;
      const productImages = item.media?.image || item.media?.Images || [];

      const discountPercent =
        mrp && mrp > price
          ? Math.round(((mrp - price) / mrp) * 100)
          : 0;

      return {
        id: item._id,
        title: item.title,
        description: item.description || "",
        details: item.details || {},
        price,
        oldPrice: mrp,
        discountPercent,
        thumbnail: productImages?.[0]?.replace(/\\/g, "/") || null,
        products:
          productImages?.map((img) =>
            img.replace(/\\/g, "/")
          ) || [],
        category: item.category?.name,
        inStock: item.stock.quantity > 0,
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
      data: {
        products,
        pagination: {
          totalProducts,
          currentPage: Number(page),
          totalPages: Math.ceil(totalProducts / limit),
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
    const item = await Item.findById(req.params.id);

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

    res.json({
      success: true,
      data: {
        id: item._id,
        title: item.title,
        description: item.description || "",
        details: item.details || {},
        category: item.category?.name,
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
