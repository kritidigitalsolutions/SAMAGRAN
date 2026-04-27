import DefaultKit from "../../models/defaultKit.model.js";
import Item from "../../models/product.model.js";
import { uploadFileToFirebase } from "../../utils/firebaseUpload.js";

const parseItems = (items) => {
  if (!items) {
    return [];
  }

  return typeof items === "string" ? JSON.parse(items) : items;
};

const buildKitItems = async (items) => {
  if (!Array.isArray(items) || !items.length) {
    const err = new Error("At least one product is required");
    err.statusCode = 400;
    throw err;
  }

  const productIds = items.map((item) => item.product);
  const products = await Item.find({
    _id: { $in: productIds },
    status: "active",
  });

  if (products.length !== items.length) {
    const err = new Error("Some selected products are invalid or inactive");
    err.statusCode = 400;
    throw err;
  }

  let totalPrice = 0;

  const formattedItems = items.map((entry) => {
    const product = products.find((p) => p._id.toString() === String(entry.product));

    if (!product) {
      const err = new Error(`Product not found: ${entry.product}`);
      err.statusCode = 400;
      throw err;
    }

    const quantity = Number(entry.quantity || 1);

    if (quantity < 1) {
      const err = new Error("Each quantity must be at least 1");
      err.statusCode = 400;
      throw err;
    }

    const price = Number(product.pricing?.price || 0);

    totalPrice += price * quantity;

    return {
      product: product._id,
      quantity,
    };
  });

  return { formattedItems, totalPrice };
};

export const createDefaultKit = async (req, res) => {
  try {
    const { name, description = "", kitPrice, status = "active" } = req.body;
    const items = parseItems(req.body.items);

    if (!name || typeof kitPrice === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Name and kitPrice are required",
      });
    }

    const { formattedItems, totalPrice } = await buildKitItems(items);
    const normalizedKitPrice = Number(kitPrice);

    const imageUrl = req.file
      ? await uploadFileToFirebase(req.file, { folder: "default-kits" })
      : "";

    const created = await DefaultKit.create({
      name: name.trim(),
      description: description.trim(),
      image: imageUrl,
      items: formattedItems,
      totalPrice,
      kitPrice: normalizedKitPrice,
      savings: Math.max(totalPrice - normalizedKitPrice, 0),
      status,
    });

    res.status(201).json({
      success: true,
      message: "Default kit created",
      data: created,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getAdminDefaultKits = async (req, res) => {
  try {
    const { search = "", status = "all" } = req.query;
    const filter = {};

    if (search.trim()) {
      filter.name = { $regex: search.trim(), $options: "i" };
    }

    if (status !== "all") {
      filter.status = status;
    }

    const kits = await DefaultKit.find(filter)
      .populate("items.product", "title pricing media")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: kits.length,
      data: kits,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getAdminDefaultKitById = async (req, res) => {
  try {
    const kit = await DefaultKit.findById(req.params.id).populate(
      "items.product",
      "title pricing media"
    );

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: "Default kit not found",
      });
    }

    res.json({
      success: true,
      data: kit,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const updateDefaultKit = async (req, res) => {
  try {
    const kit = await DefaultKit.findById(req.params.id);

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: "Default kit not found",
      });
    }

    const {
      name = kit.name,
      description = kit.description,
      kitPrice = kit.kitPrice,
      status = kit.status,
    } = req.body;

    const parsedItems = req.body.items ? parseItems(req.body.items) : null;

    let nextItems = kit.items;
    let nextTotalPrice = kit.totalPrice;

    if (parsedItems) {
      const computed = await buildKitItems(parsedItems);
      nextItems = computed.formattedItems;
      nextTotalPrice = computed.totalPrice;
    }

    const normalizedKitPrice = Number(kitPrice);

    kit.name = name.trim();
    kit.description = description.trim();
    kit.kitPrice = normalizedKitPrice;
    kit.status = status;
    kit.items = nextItems;
    kit.totalPrice = nextTotalPrice;
    kit.savings = Math.max(nextTotalPrice - normalizedKitPrice, 0);

    if (req.file) {
      kit.image = await uploadFileToFirebase(req.file, { folder: "default-kits" });
    }

    await kit.save();

    res.json({
      success: true,
      message: "Default kit updated",
      data: kit,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }
};

export const deleteDefaultKit = async (req, res) => {
  try {
    const kit = await DefaultKit.findByIdAndDelete(req.params.id);

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: "Default kit not found",
      });
    }

    res.json({
      success: true,
      message: "Default kit deleted",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
