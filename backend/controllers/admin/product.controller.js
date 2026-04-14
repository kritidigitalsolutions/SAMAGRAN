import Item from "../../models/product.model.js";

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const generateSlug = (title) => {
  return title.toLowerCase().replace(/ /g, "-");
};

export const addProduct = async (req, res) => {
  try {
    const {
      title,
      price,
      mrp,
      categoryName,
      quantity,
      tags,
      isRecommended,
      isMostPoojaEssentials,
      isMostUsed,
      isEveryDayRitual,
      isRitualItems,
    } = req.body;

    if (!title || !price) {
      return res.status(400).json({
        success: false,
        message: "Title and price required",
      });
    }

    const item = await Item.create({
      title,
      slug: generateSlug(title),
      category: {
        name: categoryName,
      },
      pricing: {
        price,
        mrp,
      },
      media: {
        image: req.files ? req.files.map((file) => file.path) : [],
      },
      stock: {
        quantity: quantity || 0,
      },
      tags: tags ? tags.split(",") : [],
      flags: {
        isRecommended: isRecommended === "true",
        isMostPoojaEssentials: isMostPoojaEssentials === "true",
        isMostUsed: isMostUsed === "true",
        isEveryDayRitual: isEveryDayRitual === "true",
        isRitualItems: isRitualItems === "true",
      },
    });

    res.status(201).json({
      success: true,
      message: "Item added successfully",
      item,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const searchTerm = search?.trim();

    const skip = (page - 1) * limit;

    let query = { status: "active" };

    if (searchTerm) {
      const searchRegex = new RegExp(escapeRegex(searchTerm), "i");

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
      const { price, mrp, currency } = item.pricing;
      const productImages = item.media?.image || item.media?.Images || [];

      const discountPercent =
        mrp && mrp > price
          ? Math.round(((mrp - price) / mrp) * 100)
          : 0;

      return {
        _id: item._id,
        title: item.title,
        slug: item.slug,
        category: {
          name: item.category?.name,
        },
        pricing: {
          price,
          mrp,
          discountPercent,
          currency,
        },
        price,
        oldPrice: mrp,
        products: productImages,
        thumbnail: productImages?.[0] || null,
        ratings: {
          average: item.ratings.average,
          totalReviews: item.ratings.totalReviews,
        },
        stock: {
          available: item.stock.quantity > 0,
        },
        tags: item.tags || [],
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
          limit: Number(limit),
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

export const getSingleProduct = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
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
        slug: item.slug,
        category: {
          name: item.category?.name,
        },
        pricing: {
          price,
          mrp,
          discountPercent,
          currency,
          savings,
        },
        media: {
          image: item.media?.image || item.media?.Images || [],
        },
        ratings: {
          average: item.ratings?.average || 0,
          totalReviews: item.ratings?.totalReviews || 0,
        },
        stock: {
          status: item.stock.quantity > 0 ? "in_stock" : "out_of_stock",
          quantity: item.stock.quantity,
        },
        tags: item.tags || [],
        flags: {
          isRecommended: item.flags.isRecommended,
          isMostPoojaEssentials: item.flags.isMostPoojaEssentials,
          isMostUsed: item.flags.isMostUsed,
          isEveryDayRitual: item.flags.isEveryDayRitual,
          isRitualItems: item.flags.isRitualItems,
        },
        meta: {
          createdAt: item.createdAt,
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

export const updateProduct = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const {
      title,
      price,
      mrp,
      categoryName,
      quantity,
      tags,
      isRecommended,
      isMostPoojaEssentials,
      isMostUsed,
      isEveryDayRitual,
      isRitualItems,
    } = req.body;

    if (title) {
      item.title = title;
      item.slug = title.toLowerCase().replace(/ /g, "-");
    }

    if (categoryName) item.category.name = categoryName;

    if (price !== undefined) item.pricing.price = price;
    if (mrp !== undefined) item.pricing.mrp = mrp;

    if (quantity !== undefined) item.stock.quantity = quantity;

    if (tags) item.tags = tags.split(",");

    if (isRecommended !== undefined) {
      item.flags.isRecommended = isRecommended === "true";
    }

    if (isMostPoojaEssentials !== undefined) {
      item.flags.isMostPoojaEssentials = isMostPoojaEssentials === "true";
    }

    if (isMostUsed !== undefined) {
      item.flags.isMostUsed = isMostUsed === "true";
    }

    if (isEveryDayRitual !== undefined) {
      item.flags.isEveryDayRitual = isEveryDayRitual === "true";
    }

    if (isRitualItems !== undefined) {
      item.flags.isRitualItems = isRitualItems === "true";
    }

    await item.save();

    const { price: p, mrp: m, currency } = item.pricing;

    const discountPercent =
      m && m > p ? Math.round(((m - p) / m) * 100) : 0;

    const savings = m && m > p ? m - p : 0;

    res.json({
      success: true,
      message: "Item updated successfully",
      data: {
        id: item._id,
        title: item.title,
        slug: item.slug,
        category: {
          name: item.category?.name,
        },
        pricing: {
          price: p,
          mrp: m,
          discountPercent,
          currency,
          savings,
        },
        media: {
          thumbnail: (item.media?.image || item.media?.Images || [])?.[0] || null,
          image: item.media?.image || item.media?.Images || [],
        },
        stock: {
          status: item.stock.quantity > 0 ? "in_stock" : "out_of_stock",
          quantity: item.stock.quantity,
        },
        tags: item.tags || [],
        flags: {
          isRecommended: item.flags.isRecommended,
          isMostPoojaEssentials: item.flags.isMostPoojaEssentials,
          isMostUsed: item.flags.isMostUsed,
          isEveryDayRitual: item.flags.isEveryDayRitual,
          isRitualItems: item.flags.isRitualItems,
        },
        updatedAt: item.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { status: "inactive" },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    res.json({
      success: true,
      message: "Item removed from catalog",
      data: {
        id: item._id,
        title: item.title,
        status: item.status,
        deletedAt: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
