import mongoose from "mongoose";
import Wishlist from "../../models/wishlist.model.js";

const ADMIN_WISHLIST_POPULATE = [
  {
    path: "user",
    select: "name phone email profileImage",
    strictPopulate: false,
  },
  {
    path: "product",
    strictPopulate: false,
  },
];

export const getAllUsersWishlists = async (req, res) => {
  try {
    const wishlists = await Wishlist.find({})
      .sort({ createdAt: -1 })
      .populate(ADMIN_WISHLIST_POPULATE);

    const userIds = new Set(
      wishlists
        .map((row) => row.user?._id?.toString())
        .filter(Boolean)
    );

    return res.json({
      success: true,
      count: wishlists.length,
      usersCount: userIds.size,
      data: wishlists,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUserWishlistByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const wishlists = await Wishlist.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate(ADMIN_WISHLIST_POPULATE);

    return res.json({
      success: true,
      count: wishlists.length,
      data: wishlists,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
