import Banner from "../models/banner.js";
import { uploadFileToFirebase } from "../utils/firebaseUpload.js";

export const getAllBannersForAdmin = async (req, res) => {
  try {
    const banner = await Banner.find({ status: "active" })
      .populate("couponId")
      .populate("offerId")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: banner.length,
      data: banner,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load Banner",
    });
  }
};
