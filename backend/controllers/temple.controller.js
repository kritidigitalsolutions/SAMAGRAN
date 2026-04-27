import temple from "../models/temple.model.js";

export const getAlltemples = async (req, res) => {
  try {
    const { search = "", status = "all" } = req.query;

    const filter = {};

    if (status !== "all") {
      filter.status = status;
    }

    if (String(search || "").trim()) {
      const regex = { $regex: String(search).trim(), $options: "i" };
      filter.$or = [
        { name: regex },
        { description: regex },
        { "address.city": regex },
        { "address.state": regex },
        { "address.landmark": regex },
      ];
    }

    const temples = await temple.find(filter).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: temples.length,
      data: temples,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load temples",
    });
  }
};
