import Pandit from "../../models/pandit.model.js";

export const getAllPanditsForAdmin = async (req, res) => {
  try {
    const { search = "" } = req.query;

    const filter = {};

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      filter.$or = [
        { fullName: regex },
        { phone: regex },
        { "address.city": regex },
        { "address.state": regex },
        { templeAssociated: regex },
      ];
    }

    const pandits = await Pandit.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: pandits.length,
      data: pandits,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Unable to load pandits",
    });
  }
};
