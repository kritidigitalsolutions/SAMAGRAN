import FestivalKit from "../../models/festivalKit.model.js";
import Item from "../../models/product.model.js";
import { uploadFileToFirebase } from "../../utils/firebaseUpload.js";

const resolveVendorFilter = (req) => {
  if (req.admin?.role === "vendor") {
    return { vendorId: req.admin.vendorId };
  }

  return {};
};

const resolveVendorIdForCreate = (req) => {
  if (req.admin?.role === "vendor") {
    return req.admin.vendorId || null;
  }

  return req.body?.vendorId || null;
};

const parseKitItems = (items) => (typeof items === "string" ? JSON.parse(items) : items);

const buildKitItems = async (items, vendorFilter = {}) => {
  const productIds = items.map((i) => i.product);
  const products = await Item.find({ _id: { $in: productIds }, ...vendorFilter });

  if (products.length !== items.length) {
    const error = new Error("Some products are invalid");
    error.statusCode = 400;
    throw error;
  }

  let totalPrice = 0;

  const formattedItems = items.map((i) => {
    const product = products.find((p) => p._id.toString() === i.product);

    if (!product) {
      throw new Error(`Product not found: ${i.product}`);
    }

    const price = product.pricing?.price;

    if (typeof price !== "number") {
      throw new Error(`Invalid price for product: ${product._id}`);
    }

    const qty = Number(i.quantity) || 1;

    totalPrice += price * qty;

    return {
      product: product._id,
      quantity: qty,
    };
  });

  return { formattedItems, totalPrice };
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  return fallback;
};

export const createKit = async (req, res) => {
  try {
    const {
      name,
      description,
      kitPrice,
      festivalType,
      status = "active",
      // category = "",
      isMostPopularKit,
      isMostUserUse,
      isPanditApproved,
    } = req.body;
    const image = req.file
      ? await uploadFileToFirebase(req.file, { folder: "festival-kits" })
      : "";
    const items = parseKitItems(req.body.items);

    if (!name || !items?.length || !kitPrice) {
      return res.status(400).json({
        success: false,
        message: "Name, items and kitPrice are required"
      });
    }

    const { formattedItems, totalPrice } = await buildKitItems(items, resolveVendorFilter(req));

    const savings = totalPrice - kitPrice;

    const kit = await FestivalKit.create({
      vendorId: resolveVendorIdForCreate(req),
      kitType: "special",
      name,
      description,
      image,
      // category: String(category || "").trim(),
      isMostPopularKit: toBoolean(isMostPopularKit),
      isMostUserUse: toBoolean(isMostUserUse),
      isPanditApproved: toBoolean(isPanditApproved),
      items: formattedItems,
      totalPrice,
      kitPrice,
      savings,
      festivalType,
      status
    });

    return res.status(201).json({
      success: true,
      message: "Festival kit created",
      data: kit
    });

  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message
    });
  }
};

export const getAllKits = async (req, res) => {
  try {
    const { search, festivalType, status = "all" } = req.query;
    let filter = {
      kitType: "special",
      ...resolveVendorFilter(req),
    };

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (festivalType && festivalType !== "All") {
      filter.festivalType = festivalType;
    }

    if (status !== "all") {
      filter.status = status;
    }

    const kits = await FestivalKit.find(filter).sort({ createdAt: -1 });

    res.json({
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

export const getSingleKit = async (req, res) => {
  try {
    const kit = await FestivalKit.findOne({
      _id: req.params.id,
      kitType: "special",
      ...resolveVendorFilter(req),
    })
      .populate("items.product", "title pricing media");
      // .populate("items.product", "title pricing media category");

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: "Kit not found"
      });
    }

    // Transform response for UI
    const formattedItems = kit.items.map(i => ({
      id: i.product._id,
      name: i.product.title,
      price: i.product.pricing.price,
      // category: i.product.category || null,
      image: i.product.media?.image?.[0] || i.product.media?.Images?.[0] || null,
      quantity: i.quantity
    }));

    res.json({
      success: true,
      data: {
        id: kit._id,
        name: kit.name,
        description: kit.description,
        image: kit.image,
        // category: kit.category || "",
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

export const deleteKit = async (req, res) => {
  try {
    const kit = await FestivalKit.findOneAndDelete({
      _id: req.params.id,
      kitType: "special",
      ...resolveVendorFilter(req),
    });

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: "Kit not found"
      });
    }

    res.json({
      success: true,
      message: "Kit deleted successfully"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const updateKit = async (req, res) => {
  try {
    const kit = await FestivalKit.findOne({
      _id: req.params.id,
      kitType: "special",
      ...resolveVendorFilter(req),
    });

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: "Kit not found"
      });
    }

    const {
      name = kit.name,
      description = kit.description,
      kitPrice = kit.kitPrice,
      festivalType = kit.festivalType,
      status = kit.status || "active",
      // category = kit.category || "",
      isMostPopularKit = kit.isMostPopularKit,
      isMostUserUse = kit.isMostUserUse,
      isPanditApproved = kit.isPanditApproved,
    } = req.body;
    const items = req.body.items ? parseKitItems(req.body.items) : null;

    let nextItems = kit.items;
    let nextTotalPrice = kit.totalPrice;

    if (items) {
      if (!items.length) {
        return res.status(400).json({
          success: false,
          message: "At least one product is required",
        });
      }

      const computed = await buildKitItems(items, resolveVendorFilter(req));
      nextItems = computed.formattedItems;
      nextTotalPrice = computed.totalPrice;
    }

    const normalizedKitPrice = Number(kitPrice);
    const resolvedKitPrice = Number.isFinite(normalizedKitPrice)
      ? normalizedKitPrice
      : kit.kitPrice;

    kit.name = String(name || "").trim();
    kit.description = String(description || "");
    kit.festivalType = festivalType;
    kit.status = status;
    // kit.category = String(category || "").trim();
    kit.isMostPopularKit = toBoolean(isMostPopularKit, kit.isMostPopularKit);
    kit.isMostUserUse = toBoolean(isMostUserUse, kit.isMostUserUse);
    kit.isPanditApproved = toBoolean(isPanditApproved, kit.isPanditApproved);
    kit.kitPrice = resolvedKitPrice;
    kit.items = nextItems;
    kit.totalPrice = nextTotalPrice;
    kit.savings = nextTotalPrice - resolvedKitPrice;

    if (req.file) {
      kit.image = await uploadFileToFirebase(req.file, { folder: "festival-kits" });
    }

    await kit.save();

    res.json({
      success: true,
      message: "Festival kit updated",
      data: kit
    });

  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message
    });
  }
};
