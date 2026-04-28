import Banner from "../../models/banner.js";
import { uploadFileToFirebase } from "../../utils/firebaseUpload.js";

export const createBenner = async (req, res) => {
  try {
    const {
      title = "",
      subTitle= "",
      description = "",
      image = "",
      priceOff= "",
      status = "active",
    } = req.body;

    if (!title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Banner title is required",
      });
    }

    const exists = await Banner.findOne({
      title: { $regex: `^${title.trim()}$`, $options: "i" },
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "banner already exists",
      });
    }

    const uploadedImage = req.file
      ? await uploadFileToFirebase(req.file, { folder: "banner" })
      : "";

    const banner = await Banner.create({
      title: title.trim(),
      subTitle: subTitle.trim(),
      description: String(description || "").trim(),
      image: uploadedImage || String(image || "").trim(),
      priceOff: subTitle.trim(),
      status: status === "inactive" ? "inactive" : "active",
    });

    return res.status(201).json({
      success: true,
      message: "Banner created",
      data: banner,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to create Banner",
    });
  }
};

export const getAllBannersForAdmin = async (req, res) => {
  try {
    const { search = "", status = "all" } = req.query;

    const filter = {};

    if (status !== "all") {
      filter.status = status;
    }

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      filter.$or = [{ title: regex }, { priceOff: regex }];
    }

    const banner = await Banner.find(filter).sort({ createdAt: -1 });

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

export const updateBanner = async (req, res) => {
  try {
        const uploadedImage = req.file
          ? await uploadFileToFirebase(req.file, { folder: "banners" })
          : "";

    const { id } = req.params;
    const {
      title,
      subTitle,
      description,
      image,
      priceOff,
      status,
    } = req.body;

    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "banner not found",
      });
    }

    if (typeof title === "string" && title.trim()) {
      const duplicate = await Banner.findOne({
        _id: { $ne: id },
        title: { $regex: `^${title.trim()}$`, $options: "i" },
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "banner title already in use",
        });
      }

      banner.title = title.trim();
    }

    if (typeof description === "string") {
      banner.description = description.trim();
    }
    if (typeof priceOff === "string") {
      banner.priceOff = priceOff.trim();
    }

    if (uploadedImage) {
      banner.image = uploadedImage;
    } else if (typeof image === "string") {
      banner.image = image.trim();
    }
    if (status === "active" || status === "inactive") {
      banner.status = status;
    }

    await banner.save();

    return res.json({
      success: true,
      message: "banner updated",
      data: banner,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to update banner",
    });
  }
};

export const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "banner not found",
      });
    }

    return res.json({
      success: true,
      message: "banner deleted",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to delete banner",
    });
  }
};
