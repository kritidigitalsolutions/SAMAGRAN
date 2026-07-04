import User from "../../models/user.model.js";
import generateToken from "../../utils/generateToken.js";
import mongoose from "mongoose";
import Order from "../../models/order.model.js";
import Cart from "../../models/cart.model.js";
import { uploadFileToFirebase } from "../../utils/firebaseUpload.js";
import Wallet from "../../models/wallet.model.js";
import WalletTransaction from "../../models/walletTransaction.model.js";
import Wishlist from "../../models/wishlist.model.js";
import UserCoupon from "../../models/userCoupon.model.js";
import PanditBooking from "../../models/panditBooking.model.js";
import PanditBookingIntent from "../../models/panditBookingIntent.model.js";
import PanditReview from "../../models/panditReview.model.js";
import ProductReview from "../../models/productReview.model.js";
import Complaint from "../../models/complaint.model.js";
import Notification from "../../models/notification.model.js";


const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ORDER_ITEMS_POPULATE = {
  path: "items.product",
  strictPopulate: false,
  populate: [
    {
      path: "items.product",
      strictPopulate: false,
    },
    {
      path: "baseKit",
      strictPopulate: false,
      populate: {
        path: "items.product",
        strictPopulate: false,
      },
    },
  ],
};

const CART_PRODUCT_POPULATE = {
  path: "product",
  strictPopulate: false,
  populate: [
    {
      path: "items.product",
      strictPopulate: false,
    },
    {
      path: "baseKit",
      strictPopulate: false,
      populate: {
        path: "items.product",
        strictPopulate: false,
      },
    },
  ],
};

const normalizeOrderStatus = (value = "Placed") => {
  const normalized = String(value || "Placed").trim().toLowerCase();

  if (normalized === "placed") return "Placed";
  if (normalized === "confirmed") return "Confirmed";
  // if (normalized === "preparing") return "Preparing";
  if (normalized === "out for delivery" || normalized === "out_for_delivery") {
    return "Out for Delivery";
  }
  if (normalized === "delivered") return "Delivered";
  if (normalized === "cancelled" || normalized === "canceled") return "Cancelled";

  return "Placed";
};

// const TRACKING_STEPS = ["Placed", "Confirmed", "Preparing", "Out for Delivery", "Delivered"];
const TRACKING_STEPS = ["Placed", "Confirmed", "Out for Delivery", "Delivered"];

const buildTrackingPayload = (order) => {
  const currentStatus = normalizeOrderStatus(order?.orderStatus);
  const currentIndex = TRACKING_STEPS.indexOf(currentStatus);

  const steps = TRACKING_STEPS.map((step, index) => {
    if (currentStatus === "Cancelled") {
      return {
        label: step,
        completed: false,
        active: step === "Placed",
      };
    }

    return {
      label: step,
      completed: index < currentIndex || (currentStatus === "Delivered" && index === currentIndex),
      active: index === currentIndex,
    };
  });

  return {
    currentStatus,
    isCancelled: currentStatus === "Cancelled",
    steps,
    placedAt: order?.createdAt || null,
    lastUpdatedAt: order?.updatedAt || null,
  };
};

const formatOrderForAdminUser = (order = {}) => ({
  ...order,
  itemCount: Array.isArray(order.items) ? order.items.length : 0,
  tracking: buildTrackingPayload(order),
});


export const getAllUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const searchTerm = search?.trim();

    let query = {};

    // ✅ SEARCH LOGIC
    if (searchTerm) {
      const searchRegex = new RegExp(escapeRegex(searchTerm), "i");

      query = {
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
          { address: searchRegex },
        ],
      };
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteUserCompleteData = async (userId) => {
  const id = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

  await Promise.all([
    Cart.deleteMany({ user: id }),
    Order.deleteMany({ user: id }),
    Wallet.deleteOne({ user: id }),
    WalletTransaction.deleteMany({ user: id }),
    Wishlist.deleteMany({ user: id }),
    UserCoupon.deleteMany({ userId: id }),
    PanditBooking.deleteMany({ user: id }),
    PanditBookingIntent.deleteMany({ user: id }),
    PanditReview.deleteMany({ user: id }),
    ProductReview.deleteMany({ user: id }),
    Complaint.deleteMany({ user: id }),
    Notification.deleteMany({ "audience.type": "user", "audience.ids": { $size: 1, $all: [id] } }),
    Notification.updateMany(
      {},
      {
        $pull: {
          readBy: id,
          deletedBy: id,
          "audience.ids": id
        }
      }
    ),
    User.findByIdAndDelete(id)
  ]);
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    await deleteUserCompleteData(id);

    res.json({
      success: true,
      message: "User deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUserDetailsByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const user = await User.findById(id).select("-otp -otpExpires").lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const [orders, cart] = await Promise.all([
      Order.find({ user: id }).sort({ createdAt: -1 }).populate(ORDER_ITEMS_POPULATE).lean(),
      Cart.find({ user: id }).sort({ createdAt: -1 }).populate(CART_PRODUCT_POPULATE).lean(),
    ]);

    return res.json({
      success: true,
      data: {
        user,
        orders: orders.map(formatOrderForAdminUser),
        cart,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const uploadCandidate =
      req.file ||
      req.files?.profileImageFile?.[0] ||
      req.files?.profileImage?.[0];
    let uploadedProfileImage = "";
    if (uploadCandidate) {
      uploadedProfileImage = await uploadFileToFirebase(uploadCandidate, { folder: "users/profile" });
    }

    const {
      name,
      email,
      phone,
      address,
      profileImage,
      isProfileComplete,
    } = req.body;

    if (name !== undefined) user.name = String(name || "").trim();
    if (email !== undefined) user.email = String(email || "").trim().toLowerCase();
    if (phone !== undefined) user.phone = String(phone || "").trim();
    if (address !== undefined) user.address = String(address || "").trim();
    if (uploadedProfileImage) {
      user.profileImage = uploadedProfileImage;
    } else if (profileImage !== undefined) {
      user.profileImage = String(profileImage || "").trim();
    }
    if (isProfileComplete !== undefined) user.isProfileComplete = Boolean(isProfileComplete);

    await user.save();

    return res.json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const toggleUserBlockByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isBlocked = isBlocked === undefined ? !Boolean(user.isBlocked) : Boolean(isBlocked);
    await user.save();

    return res.json({
      success: true,
      message: user.isBlocked ? "User blocked successfully" : "User unblocked successfully",
      data: {
        _id: user._id,
        isBlocked: user.isBlocked,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUserOrdersByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const orders = await Order.find({ user: id })
      .sort({ createdAt: -1 })
      .populate(ORDER_ITEMS_POPULATE)
      .lean();

    return res.json({
      success: true,
      count: orders.length,
      data: orders.map(formatOrderForAdminUser),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUserCartByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const cart = await Cart.find({ user: id })
      .sort({ createdAt: -1 })
      .populate(CART_PRODUCT_POPULATE)
      .lean();

    const total = cart.reduce((sum, item) => sum + Number(item.priceAtAdd || 0) * Number(item.quantity || 0), 0);

    return res.json({
      success: true,
      count: cart.length,
      total,
      data: cart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// GET PROFILE (protected)
export const getProfile = async (req, res) => {
  res.json(req.user);
};
