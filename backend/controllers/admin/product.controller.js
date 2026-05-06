import Item from "../../models/product.model.js";
import { uploadFileToFirebase } from "../../utils/firebaseUpload.js";

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const generateSlug = (title) => {
  return title.toLowerCase().replace(/ /g, "-");
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildPricingPayload = ({ price, mrp, gstPercent, priceIncludesGst }) => {
  const sellingPrice = toNumber(price, 0);
  const gstRate = Math.max(toNumber(gstPercent, 0), 0);
  const includesGst = toBoolean(priceIncludesGst, true);

  const basePrice = includesGst
    ? sellingPrice / (1 + gstRate / 100 || 1)
    : sellingPrice;
  const gstAmount = includesGst
    ? sellingPrice - basePrice
    : basePrice * (gstRate / 100);

  return {
    price: sellingPrice,
    mrp: mrp !== undefined && mrp !== "" ? toNumber(mrp, sellingPrice) : undefined,
    basePrice: Number(basePrice.toFixed(2)),
    gstPercent: gstRate,
    gstAmount: Number(gstAmount.toFixed(2)),
    priceIncludesGst: includesGst,
  };
};

const buildDiscountPayload = (body = {}) => {
  const discountType = body.discountType === "flat" ? "flat" : "percent";
  const discountValue = toNumber(body.discountValue, 0);
  const discountIsActive = toBoolean(body.discountIsActive, false);
  const startsAt = body.discountStartsAt ? new Date(body.discountStartsAt) : null;
  const expiresAt = body.discountExpiresAt ? new Date(body.discountExpiresAt) : null;

  return {
    type: discountType,
    value: discountValue,
    isActive: discountIsActive,
    startsAt,
    expiresAt,
  };
};

const parseExistingImages = (value) => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return value.trim() ? [value.trim()] : [];
    }
  }

  return [];
};

const buildDetailsPayload = (body = {}) => ({
  brand: String(body.brand || "").trim(),
  sku: String(body.sku || "").trim(),
  unit: String(body.unit || "").trim(),
  weight: String(body.weight || "").trim(),
  dimensions: String(body.dimensions || "").trim(),
  material: String(body.material || "").trim(),
  color: String(body.color || "").trim(),
  manufacturer: String(body.manufacturer || "").trim(),
  countryOfOrigin: String(body.countryOfOrigin || "").trim(),
  packageContents: String(body.packageContents || "").trim(),
  usageInstructions: String(body.usageInstructions || "").trim(),
  careInstructions: String(body.careInstructions || "").trim(),
  expiryInfo: String(body.expiryInfo || "").trim(),
});

const assignDetailsPayload = (item, body = {}) => {
  item.details = item.details || {};

  Object.entries(buildDetailsPayload(body)).forEach(([key, value]) => {
    if (body[key] !== undefined) {
      item.details[key] = value;
    }
  });
};

export const addProduct = async (req, res) => {
  try {
    const {
      title,
      price,
      mrp,
      gstPercent,
      priceIncludesGst,
      categoryName,
      description,
      city,
      hsnCode,
      status,
      quantity,
      tags,
      isRecommended,
      isMostPoojaEssentials,
      isMostUsed,
      isEveryDayRitual,
      isRitualItems,
      discountType,
      discountValue,
      discountIsActive,
      discountStartsAt,
      discountExpiresAt,
    } = req.body;

    if (!title || !price) {
      return res.status(400).json({
        success: false,
        message: "Title and price required",
      });
    }

    const imageUrls = req.files?.length
      ? await Promise.all(
          req.files.map((file) => uploadFileToFirebase(file, { folder: "products" }))
        )
      : [];

    const item = await Item.create({
      title,
      slug: generateSlug(title),
      category: {
        name: categoryName,
      },
      description: String(description || "").trim(),
      details: buildDetailsPayload(req.body),
      pricing: buildPricingPayload({
        price,
        mrp,
        gstPercent,
        priceIncludesGst,
      }),
      discount: buildDiscountPayload({
        discountType,
        discountValue,
        discountIsActive,
        discountStartsAt,
        discountExpiresAt,
      }),
      compliance: {
        city: String(city || "").trim(),
        hsnCode: String(hsnCode || "").trim(),
      },
      media: {
        image: imageUrls,
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
      status: status || "active",
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
    const { page = 1, limit = 10, search, status = "active" } = req.query;
    const searchTerm = search?.trim();

    const skip = (page - 1) * limit;

    let query = {};

    if (status !== "all") {
      query.status = status;
    }

    if (searchTerm) {
      const searchRegex = new RegExp(escapeRegex(searchTerm), "i");

      query.$or = [
        { title: searchRegex },
        { "category.name": searchRegex },
        { description: searchRegex },
        { "details.brand": searchRegex },
        { "details.sku": searchRegex },
        { "details.manufacturer": searchRegex },
        { tags: searchRegex },
      ];
    }

    const totalProducts = await Item.countDocuments(query);

    const items = await Item.find(query)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const products = items.map((item) => {
      const { price, mrp, currency, basePrice, gstPercent, gstAmount, priceIncludesGst } = item.pricing;
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
        description: item.description || "",
        details: item.details || {},
        pricing: {
          price,
          mrp,
          basePrice,
          gstPercent,
          gstAmount,
          priceIncludesGst,
          discountPercent,
          currency,
        },
        compliance: {
          hsnCode: item.compliance?.hsnCode || "",
          city: item.compliance?.city || "",
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
          quantity: item.stock.quantity,
        },
        status: item.status,
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

    const { price, mrp, currency, basePrice, gstPercent, gstAmount, priceIncludesGst } = item.pricing;

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
        description: item.description || "",
        details: item.details || {},
        pricing: {
          price,
          mrp,
          basePrice,
          gstPercent,
          gstAmount,
          priceIncludesGst,
          discountPercent,
          currency,
          savings,
        },
        discount: item.discount || {
          type: "percent",
          value: 0,
          isActive: false,
          startsAt: null,
          expiresAt: null,
        },
        compliance: {
          hsnCode: item.compliance?.hsnCode || "",
          city: item.compliance?.city || "",
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
      gstPercent,
      priceIncludesGst,
      categoryName,
      description,
      city,
      hsnCode,
      status,
      quantity,
      tags,
      isRecommended,
      isMostPoojaEssentials,
      isMostUsed,
      isEveryDayRitual,
      isRitualItems,
      discountType,
      discountValue,
      discountIsActive,
      discountStartsAt,
      discountExpiresAt,
    } = req.body;

    if (title) {
      item.title = title;
      item.slug = title.toLowerCase().replace(/ /g, "-");
    }

    if (categoryName) item.category.name = categoryName;

    if (description !== undefined) {
      item.description = String(description || "").trim();
    }

    assignDetailsPayload(item, req.body);

    if (price !== undefined || mrp !== undefined || gstPercent !== undefined || priceIncludesGst !== undefined) {
      const pricingPayload = buildPricingPayload({
        price: price !== undefined ? price : item.pricing.price,
        mrp: mrp !== undefined ? mrp : item.pricing.mrp,
        gstPercent: gstPercent !== undefined ? gstPercent : item.pricing.gstPercent,
        priceIncludesGst:
          priceIncludesGst !== undefined
            ? priceIncludesGst
            : item.pricing.priceIncludesGst,
      });

      item.pricing.price = pricingPayload.price;
      item.pricing.mrp = pricingPayload.mrp;
      item.pricing.basePrice = pricingPayload.basePrice;
      item.pricing.gstPercent = pricingPayload.gstPercent;
      item.pricing.gstAmount = pricingPayload.gstAmount;
      item.pricing.priceIncludesGst = pricingPayload.priceIncludesGst;
    }

    if (city !== undefined || hsnCode !== undefined) {
      item.compliance = item.compliance || {};
      if (city !== undefined) item.compliance.city = String(city || "").trim();
      if (hsnCode !== undefined) item.compliance.hsnCode = String(hsnCode || "").trim();
    }

    if (status !== undefined) {
      item.status = status;
    }

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

    if (
      discountType !== undefined ||
      discountValue !== undefined ||
      discountIsActive !== undefined ||
      discountStartsAt !== undefined ||
      discountExpiresAt !== undefined
    ) {
      item.discount = buildDiscountPayload({
        discountType: discountType ?? item.discount?.type,
        discountValue: discountValue ?? item.discount?.value,
        discountIsActive: discountIsActive ?? item.discount?.isActive,
        discountStartsAt: discountStartsAt ?? item.discount?.startsAt,
        discountExpiresAt: discountExpiresAt ?? item.discount?.expiresAt,
      });
    }

    const hasExistingImages = req.body.existingImages !== undefined;
    const hasNewUploads = Boolean(req.files?.length);

    if (hasExistingImages || hasNewUploads) {
      const existingImages = parseExistingImages(req.body.existingImages);
      const uploadedImages = hasNewUploads
        ? await Promise.all(
            req.files.map((file) =>
              uploadFileToFirebase(file, { folder: "products" })
            )
          )
        : [];

      item.media = item.media || {};
      item.media.image = [...existingImages, ...uploadedImages];
    }

    await item.save();

    const { price: p, mrp: m, currency, basePrice, gstPercent: gRate, gstAmount, priceIncludesGst: includesGst } = item.pricing;

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
        description: item.description || "",
        details: item.details || {},
        pricing: {
          price: p,
          mrp: m,
          basePrice,
          gstPercent: gRate,
          gstAmount,
          priceIncludesGst: includesGst,
          discountPercent,
          currency,
          savings,
        },
        discount: item.discount || {
          type: "percent",
          value: 0,
          isActive: false,
          startsAt: null,
          expiresAt: null,
        },
        compliance: {
          hsnCode: item.compliance?.hsnCode || "",
          city: item.compliance?.city || "",
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
