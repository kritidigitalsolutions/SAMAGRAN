import Ritual from "../../models/ritual.model.js";

export const createRitual = async (req, res) => {
  try {
    const { title = "", description = "", status = "active" } = req.body;

    if (!title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Ritual title is required",
      });
    }

    const exists = await Ritual.findOne({
      title: { $regex: `^${title.trim()}$`, $options: "i" },
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Ritual already exists",
      });
    }

    const ritual = await Ritual.create({
      title: title.trim(),
      description: String(description || "").trim(),
      status: status === "inactive" ? "inactive" : "active",
    });

    return res.status(201).json({
      success: true,
      message: "Ritual created",
      data: ritual,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to create ritual",
    });
  }
};

export const getAllRitualsForAdmin = async (req, res) => {
  try {
    const { search = "", status = "all" } = req.query;

    const filter = {};

    if (status !== "all") {
      filter.status = status;
    }

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      filter.$or = [{ title: regex }, { description: regex }];
    }

    const rituals = await Ritual.find(filter).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: rituals.length,
      data: rituals,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load rituals",
    });
  }
};

export const updateRitual = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status } = req.body;

    const ritual = await Ritual.findById(id);
    if (!ritual) {
      return res.status(404).json({
        success: false,
        message: "Ritual not found",
      });
    }

    if (typeof title === "string" && title.trim()) {
      const duplicate = await Ritual.findOne({
        _id: { $ne: id },
        title: { $regex: `^${title.trim()}$`, $options: "i" },
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Ritual title already in use",
        });
      }

      ritual.title = title.trim();
    }

    if (typeof description === "string") {
      ritual.description = description.trim();
    }

    if (status === "active" || status === "inactive") {
      ritual.status = status;
    }

    await ritual.save();

    return res.json({
      success: true,
      message: "Ritual updated",
      data: ritual,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to update ritual",
    });
  }
};

export const deleteRitual = async (req, res) => {
  try {
    const ritual = await Ritual.findByIdAndDelete(req.params.id);

    if (!ritual) {
      return res.status(404).json({
        success: false,
        message: "Ritual not found",
      });
    }

    return res.json({
      success: true,
      message: "Ritual deleted",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to delete ritual",
    });
  }
};
