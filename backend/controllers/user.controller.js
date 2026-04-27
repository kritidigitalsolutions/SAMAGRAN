import User from "../models/user.model.js";
import mongoose from "mongoose";
import { uploadFileToFirebase } from "../utils/firebaseUpload.js";

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
    let uploadedProfileImage = "";
    if (req.file) {
      uploadedProfileImage = await uploadFileToFirebase(req.file, { folder: "users/profile" });
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

