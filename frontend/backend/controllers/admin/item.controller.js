    import Item from "../../models/item.model.js";

    const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const generateSlug = (title) => {
    return title.toLowerCase().replace(/ /g, "-");
    };

    export const addItem = async (req, res) => {
    try {
        const {
        title,
        price,
        mrp,
        categoryName,
        quantity,
        tags,
        isRecommended,
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
    Images: req.files
        ? req.files.map((file) => file.path)
        : [],
    },
        stock: {
            quantity: quantity || 0,
        },

        tags: tags ? tags.split(",") : [],

        flags: {
            isRecommended: isRecommended === "true",
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

export const getItems = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const searchTerm = search?.trim();

    const skip = (page - 1) * limit;

    // ✅ BASE QUERY
    let query = { status: "active" };

    // ✅ SEARCH LOGIC
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

        images: item.media?.Images || [],
        thumbnail: item.media?.Images?.[0] || null,

        ratings: {
          average: item.ratings.average,
          totalReviews: item.ratings.totalReviews,
        },

        stock: {
          available: item.stock.quantity > 0,
        },

        tags: item.tags || [],
        isRecommended: item.flags.isRecommended,
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


export const getSingleItem = async (req, res) => {
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
          images: item.media?.Images || [],
        },

        ratings: {
          average: item.ratings?.average || 0,
          totalReviews: item.ratings?.totalReviews || 0,
        },

        stock: {
          status:
            item.stock.quantity > 0 ? "in_stock" : "out_of_stock",
          quantity: item.stock.quantity,
        },

        tags: item.tags || [],

        flags: {
          isRecommended: item.flags.isRecommended,
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

export const updateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    // ✅ Update safely (nested fields handled)
    const {
      title,
      price,
      mrp,
      categoryName,
      quantity,
      tags,
      isRecommended,
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

    await item.save();

    // ✅ Build production-style response
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
          thumbnail: item.media?.Images?.[0] || null,
          images: item.media?.Images || [],
        },

        stock: {
          status:
            item.stock.quantity > 0 ? "in_stock" : "out_of_stock",
          quantity: item.stock.quantity,
        },

        tags: item.tags || [],

        flags: {
          isRecommended: item.flags.isRecommended,
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
export const deleteItem = async (req, res) => {
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
