import FestivalKit from "../models/festivalKit.model.js";

// @desc   Get all kits (User)
// @route  GET /api/user/kits
// @access Public
export const getAllKitsUser = async (req, res) => {
  try {
    const { search, festivalType } = req.query;

    const filter = {
      status: "active",
      kitType: "special",
    };

    if (search) {
      filter.name = { $regex: search, $options: "i" };
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
    const kit = await FestivalKit.findOne({
      _id: req.params.id,
      status: "active",
      kitType: "special",
    })
      .populate("items.product", "title slug pricing media category");

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
      category: i.product.category || null,
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
        category: kit.category || "",
        kitType: kit.kitType,
        isMostPopularKit: kit.isMostPopularKit,
        isMostUserUse: kit.isMostUserUse,
        isPanditApproved: kit.isPanditApproved,
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