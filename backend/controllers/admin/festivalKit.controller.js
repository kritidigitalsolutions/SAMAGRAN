import FestivalKit from "../../models/festivalKit.model.js";
import Item from "../../models/product.model.js";
import { uploadFileToFirebase } from "../../utils/firebaseUpload.js";
import mongoose from "mongoose";

const SAMAGRAN_KIT_TYPE = "Samagran kit";
const SAMAGRAN_KIT_TYPES = [SAMAGRAN_KIT_TYPE, "special"];

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

const resolveProductId = (productRef) => {
  if (!productRef) return "";
  if (typeof productRef === "string") return productRef.trim();
  if (typeof productRef === "object") {
    return String(productRef._id || productRef.id || "").trim();
  }
  return String(productRef).trim();
};

const buildKitItems = async (items) => {
  if (!Array.isArray(items) || !items.length) {
    const err = new Error("At least one product is required");
    err.statusCode = 400;
    throw err;
  }

  const productIds = items
    .map((i) => resolveProductId(i.product || i.id || i._id))
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (!productIds.length) {
    const err = new Error("At least one valid product is required");
    err.statusCode = 400;
    throw err;
  }

  const products = await Item.find({ _id: { $in: productIds } });

  let totalPrice = 0;
  const formattedItems = [];

  for (const entry of items) {
    const rawId = resolveProductId(entry.product || entry.id || entry._id);
    const product = products.find((p) => String(p._id) === rawId);

    if (!product) {
      const err = new Error(`Product not found: ${rawId || "invalid ID"}`);
      err.statusCode = 400;
      throw err;
    }

    const price = Number(product.pricing?.price ?? product.price ?? 0);
    const qty = Math.max(1, Number(entry.quantity || 1));

    totalPrice += price * qty;

    formattedItems.push({
      product: product._id,
      quantity: qty,
    });
  }

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
      ritual,
    } = req.body;
    const image = req.file
      ? await uploadFileToFirebase(req.file, { folder: "festival-kits" })
      : "";
    const items = parseKitItems(req.body.items);

    if (!name || !items?.length) {
      return res.status(400).json({
        success: false,
        message: "Name and at least one product are required"
      });
    }

    const { formattedItems, totalPrice } = await buildKitItems(items);

    const numKitPrice = Number(kitPrice);
    const resolvedKitPrice = Number.isFinite(numKitPrice) && numKitPrice > 0
      ? numKitPrice
      : totalPrice;

    const savings = Math.max(totalPrice - resolvedKitPrice, 0);

    const kit = await FestivalKit.create({
      vendorId: resolveVendorIdForCreate(req),
      kitType: SAMAGRAN_KIT_TYPE,
      name,
      description,
      image,
      // category: String(category || "").trim(),
      isMostPopularKit: toBoolean(isMostPopularKit),
      isMostUserUse: toBoolean(isMostUserUse),
      isPanditApproved: toBoolean(isPanditApproved),
      items: formattedItems,
      totalPrice,
      kitPrice: resolvedKitPrice,
      savings,
      festivalType,
      status,
      ritual: ritual && mongoose.Types.ObjectId.isValid(ritual) ? ritual : null,
    });

    return res.status(201).json({
      success: true,
      message: "Samagran kit created",
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
      kitType: { $in: SAMAGRAN_KIT_TYPES },
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

    const kits = await FestivalKit.find(filter).populate("ritual", "title").populate("vendorId", "name businessName email phone address").sort({ createdAt: -1 });

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
      kitType: { $in: SAMAGRAN_KIT_TYPES },
      ...resolveVendorFilter(req),
    })
      .populate("items.product", "title pricing media")
      .populate("ritual", "title");

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: "Samagran kit not found"
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
        festivalType: kit.festivalType,
        ritual: kit.ritual ? { _id: kit.ritual._id, title: kit.ritual.title } : null,
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
      kitType: { $in: SAMAGRAN_KIT_TYPES },
      ...resolveVendorFilter(req),
    });

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: "Samagran kit not found"
      });
    }

    res.json({
      success: true,
      message: "Samagran kit deleted successfully"
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
      kitType: { $in: SAMAGRAN_KIT_TYPES },
      ...resolveVendorFilter(req),
    });

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: "Samagran kit not found"
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
      ritual = kit.ritual,
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

      const computed = await buildKitItems(items);
      nextItems = computed.formattedItems;
      nextTotalPrice = computed.totalPrice;
    }

    const numKitPrice = Number(kitPrice);
    const resolvedKitPrice = Number.isFinite(numKitPrice) && numKitPrice > 0
      ? numKitPrice
      : (kitPrice === "" || kitPrice === null || typeof kitPrice === "undefined"
          ? nextTotalPrice
          : kit.kitPrice || nextTotalPrice);

    kit.name = String(name || "").trim();
    kit.kitType = SAMAGRAN_KIT_TYPE;
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
    kit.savings = Math.max(nextTotalPrice - resolvedKitPrice, 0);
    kit.ritual = ritual === "" || ritual === "null" || !ritual ? null : ritual;

    if (req.file) {
      kit.image = await uploadFileToFirebase(req.file, { folder: "festival-kits" });
    }

    await kit.save();

    res.json({
      success: true,
      message: "Samagran kit updated",
      data: kit
    });

  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message
    });
  }
};
