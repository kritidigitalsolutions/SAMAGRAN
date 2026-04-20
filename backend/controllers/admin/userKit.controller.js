import UserKit from "../../models/userKit.model.js";
// import FestivalKit from "../models/festivalKit.model.js";


// GET /api/user-kits/admin/all
export const getAllUserKitsForAdmin = async (req, res) => {
  try {
    const kits = await UserKit.find()
      .populate("items.product", "title pricing media")
      .sort({ createdAt: -1 });

    const formattedKits = kits.map((kit) => ({
      _id: kit._id,
      name: kit.name || "Custom kit",
      user: kit.user
        ? {
            _id: kit.user._id,
            name: kit.user.name || "Unnamed user",
            phone: kit.user.phone || "",
          }
        : null,
      items: kit.items.map((item) => ({
        productId: item.product?._id || item.product,
        name: item.product?.title || "Kit item",
        price: item.priceAtTime ?? item.product?.pricing?.price ?? 0,
        image: item.product?.media?.image?.[0] || item.product?.media?.Images?.[0] || null,
        quantity: item.quantity || 1,
      })),
      totalPrice: kit.totalPrice || 0,
      totalItems: kit.items.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      ),
      status: kit.status,
      createdAt: kit.createdAt,
      updatedAt: kit.updatedAt,
    }));

    res.json({
      success: true,
      count: formattedKits.length,
      data: formattedKits,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Unable to load user kits.",
    });
  }
};

// DELETE /api/admin/user-kits/:userKitId
export const deleteUserKitByAdmin = async (req, res) => {
  try {
    const { userKitId } = req.params;

    const deletedKit = await UserKit.findByIdAndDelete(userKitId);

    if (!deletedKit) {
      return res.status(404).json({
        success: false,
        message: "User kit not found",
      });
    }

    return res.json({
      success: true,
      message: "User kit deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to delete user kit.",
    });
  }
};