import FestivalKit from "../models/festivalKit.model.js";

export const getAllKitsForUsers = async (req, res) => {
  try {
    const { search = "", festivalType } = req.query;
    const searchText = search.trim();

    const filter = {
      status: "active",
    };

    if (searchText) {
      filter.name = { $regex: searchText, $options: "i" };
    }

    if (festivalType && festivalType !== "All") {
      filter.festivalType = festivalType;
    }

    const kits = await FestivalKit.find(filter)
      .populate("items.product", "title slug pricing media category")
      .sort({ createdAt: -1 });

    res.status(200).json({
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
