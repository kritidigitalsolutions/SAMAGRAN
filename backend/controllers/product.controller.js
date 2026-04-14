import Item from "../models/product.model.js";

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Get all products (User)
export const getProductsUser = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    const skip = (page - 1) * limit;

    let query = { status: "active" };

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");

      query.$or = [
        { title: searchRegex },
        { "category.name": searchRegex },
        { tags: searchRegex },
      ];
    }

    const totalProducts = await Item.countDocuments(query);

    const items = await Item.find(query)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const products = items.map((item) => {
      const { price, mrp } = item.pricing;
      const productImages = item.media?.image || item.media?.Images || [];

      const discountPercent =
        mrp && mrp > price
          ? Math.round(((mrp - price) / mrp) * 100)
          : 0;

      return {
        id: item._id,
        title: item.title,
        price,
        oldPrice: mrp,
        discountPercent,
        thumbnail: productImages?.[0]?.replace(/\\/g, "/") || null,
        products:
          productImages?.map((img) =>
            img.replace(/\\/g, "/")
          ) || [],
        category: item.category?.name,
        inStock: item.stock.quantity > 0,
        isRecommended: item.flags.isRecommended,
        isMostPoojaEssentials: item.flags.isMostPoojaEssentials,
        isMostUsed: item.flags.isMostUsed,
        isEveryDayRitual: item.flags.isEveryDayRitual,
        isRitualItems: item.flags.isRitualItems,
      };
    });

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          totalProducts,
          currentPage: Number(page),
          totalPages: Math.ceil(totalProducts / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get single product (User)
export const getSingleProductUser = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item || item.status !== "active") {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const { price, mrp, currency } = item.pricing;

    const discountPercent =
      mrp && mrp > price
        ? Math.round(((mrp - price) / mrp) * 100)
        : 0;

    const savings = mrp && mrp > price ? mrp - price : 0;

    res.json({
      success: true,
      data: {
        id: item._id,
        title: item.title,
        category: item.category?.name,
        pricing: {
          price,
          mrp,
          discountPercent,
          savings,
          currency,
        },
        image: item.media?.image || item.media?.Images || [],
        stock: {
          status: item.stock.quantity > 0 ? "in_stock" : "out_of_stock",
        },
        tags: item.tags || [],
        isRecommended: item.flags.isRecommended,
        isMostPoojaEssentials: item.flags.isMostPoojaEssentials,
        isMostUsed: item.flags.isMostUsed,
        isEveryDayRitual: item.flags.isEveryDayRitual,
        isRitualItems: item.flags.isRitualItems,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
