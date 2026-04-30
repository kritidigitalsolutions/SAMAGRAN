import User from "../models/user.model.js";
import mongoose from "mongoose";
import { uploadFileToFirebase } from "../utils/firebaseUpload.js";

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const DELETE_REASONS = [
  "not_using",
  "privacy_concerns",
  "better_alternative",
  "too_many_notifications",
  "technical_issues",
  "other",
];

// GET PROFILE (protected)
export const getProfile = async (req, res) => {
  res.json(req.user);
};

export const updateUser = async (req, res) => {
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
      user.profileImage = String(profileImage).trim();
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

export const deleteAccount = async (req, res) => {
  try {
    const { reason = "", notes = "", acknowledge = false } = req.body || {};

    const normalizedReason = String(reason || "").trim();
    if (!normalizedReason) {
      return res.status(400).json({
        success: false,
        message: "reason is required",
      });
    }

    if (!DELETE_REASONS.includes(normalizedReason)) {
      return res.status(400).json({
        success: false,
        message: "reason must be a supported value",
      });
    }

    if (!Boolean(acknowledge)) {
      return res.status(400).json({
        success: false,
        message: "acknowledge is required",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isDeleted = true;
    user.isBlocked = true;
    user.deletedAt = new Date();
    user.deleteReason = normalizedReason;
    user.deleteReasonNotes = String(notes || "").trim();

    await user.save();

    return res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

