import mongoose from "mongoose";
import Wishlist from "../models/wishlist.model.js";
import Item from "../models/product.model.js";

const WISHLIST_PRODUCT_POPULATE = {
  path: "product",
  strictPopulate: false,
};

export const toggleWishlist = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid productId",
      });
    }

    const product = await Item.findOne({ _id: productId, status: "active" }).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const existing = await Wishlist.findOne({ user: userId, product: productId });

    if (existing) {
      await existing.deleteOne();

      return res.json({
        success: true,
        message: "Removed from wishlist",
        isWishlisted: false,
        productId,
      });
    }

    const created = await Wishlist.create({
      user: userId,
      product: productId,
    });

    const populated = await created.populate(WISHLIST_PRODUCT_POPULATE);

    return res.json({
      success: true,
      message: "Added to wishlist",
      isWishlisted: true,
      data: populated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyWishlist = async (req, res) => {
  try {
    const userId = req.user?._id;

    const items = await Wishlist.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate(WISHLIST_PRODUCT_POPULATE);

    return res.json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
