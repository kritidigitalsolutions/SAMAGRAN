import AboutUs from "../../models/aboutUs.model.js";

export const upsertAboutUs = async (req, res) => {
    try {
        const { title, content } = req.body;

        if (!String(content || "").trim()) {
            return res.status(400).json({
                success: false,
                message: "Content is required",
            });
        }

        let aboutUs = await AboutUs.findOne();

        if (aboutUs) {
            aboutUs.title = String(title || aboutUs.title || "About Us").trim();
            aboutUs.content = String(content).trim();
            await aboutUs.save();
        } else {
            aboutUs = await AboutUs.create({
                title: String(title || "About Us").trim(),
                content: String(content).trim(),
            });
        }

        return res.status(200).json({
            success: true,
            message: "About us updated successfully",
            data: aboutUs,
        });
    } catch (error) {
        console.error("Upsert About Us error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getAboutUs = async (req, res) => {
  try {
    const aboutUs = await AboutUs.findOne();

    if (!aboutUs) {
      return res.status(404).json({
        message: "about us page not found",
      });
    }

    res.status(200).json({
      success: true,
      aboutUs,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

