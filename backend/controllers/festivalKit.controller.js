import FestivalKit from "../models/festivalKit.model.js";

// @desc   Get all kits (User)
// @route  GET /api/user/kits
// @access Public
export const getAllKitsUser = async (req, res) => {
  try {
    const { search, festivalType } = req.query;

    let filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (festivalType && festivalType !== "All") {
      filter.festivalType = festivalType;
    }

    const kits = await FestivalKit.find(filter)
      .populate("items.product", "title slug pricing media")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: kits.length,
      data: kits
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// @desc   Get single kit (User)
// @route  GET /api/user/kits/:id
// @access Public
export const getSingleKitUser = async (req, res) => {
  try {
    const kit = await FestivalKit.findById(req.params.id)
      .populate("items.product", "title slug pricing media");

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: "Kit not found"
      });
    }

    const formattedItems = kit.items.map(i => ({
      id: i.product._id,
      name: i.product.title,
      slug: i.product.slug,
      price: i.product.pricing.price,
      image: i.product.media?.image?.[0] || i.product.media?.Images?.[0] || null,
      quantity: i.quantity
    }));

    res.status(200).json({
      success: true,
      data: {
        id: kit._id,
        name: kit.name,
        slug: kit.slug,
        description: kit.description,
        image: kit.image,
        items: formattedItems,
        totalPrice: kit.totalPrice,
        kitPrice: kit.kitPrice,
        savings: kit.savings,
        festivalType: kit.festivalType
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};