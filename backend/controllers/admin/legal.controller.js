import Legal from "../../models/legal.model.js";

export const upsertLegal = async (req, res) => {
    try {
        const { type } = req.params;
        const { content } = req.body;

        if (!type) {
            return res.status(400).json({
                success: false,
                message: "type is required",
            });
        }

        if (!String(content || "").trim()) {
            return res.status(400).json({
                success: false,
                message: "content is required",
            });
        }

        const legal = await Legal.findOneAndUpdate(
            { type: String(type).trim().toLowerCase() },
            { content: String(content).trim() },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
            }
        );

        return res.status(200).json({
            success: true,
            data: legal,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getLegal = async (req, res) => {
  try {
    const { type } = req.params;

    const legal = await Legal.findOne({ type });

    if (!legal) {
      return res.status(404).json({
        message: "Legal page not found",
      });
    }

    res.status(200).json({
      success: true,
      legal,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export default upsertLegal;