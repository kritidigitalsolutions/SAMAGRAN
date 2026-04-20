import DefaultKit from "../models/defaultKit.model.js";

export const getDefaultKitsForUsers = async (req, res) => {
  try {
    const { search = "" } = req.query;

    const filter = {
      status: "active",
    };

    if (search.trim()) {
      filter.name = { $regex: search.trim(), $options: "i" };
    }

    const kits = await DefaultKit.find(filter)
      .populate("items.product", "title pricing media")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: kits.length,
      data: kits,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getDefaultKitByIdForUsers = async (req, res) => {
  try {
    const kit = await DefaultKit.findOne({
      _id: req.params.id,
      status: "active",
    }).populate("items.product", "title pricing media stock status");

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: "Default kit not found",
      });
    }

    res.json({
      success: true,
      data: kit,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};



