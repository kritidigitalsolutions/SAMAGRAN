import User from "../models/user.model.js";
import generateToken from "../utils/generateToken.js";

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// COMPLETE PROFILE
export const completeProfile = async (req, res) => {
  try {
    const { userId, name, email, address } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        name,
        email,
        address,
        isProfileComplete: true,
      },
      { new: true }
    );

    const token = generateToken(user._id);

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET PROFILE (protected)
export const getProfile = async (req, res) => {
  res.json(req.user);
};

// GET ALL USERS (Admin)
// export const getAllUsers = async (req, res) => {
//   try {
//     const users = await User.find().sort({ createdAt: -1 });

//     res.json({
//       success: true,
//       data: users,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
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

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    await User.findByIdAndDelete(id);

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
