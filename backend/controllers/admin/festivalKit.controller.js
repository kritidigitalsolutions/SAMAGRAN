import FestivalKit from "../../models/festivalKit.model.js";
import Item from "../../models/product.model.js";
import { uploadFileToFirebase } from "../../utils/firebaseUpload.js";

const parseKitItems = (items) => (typeof items === "string" ? JSON.parse(items) : items);

const buildKitItems = async (items) => {
  const productIds = items.map((i) => i.product);
  const products = await Item.find({ _id: { $in: productIds } });

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

export const createKit = async (req, res) => {
  try {
    const { name, description, kitPrice, festivalType, status = "active" } = req.body;
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

    const { formattedItems, totalPrice } = await buildKitItems(items);

    const savings = totalPrice - kitPrice;

    const kit = await FestivalKit.create({
      name,
      description,
      image,
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

    let filter = {};

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
    const kit = await FestivalKit.findById(req.params.id)
      .populate("items.product", "title pricing media");

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
    const kit = await FestivalKit.findByIdAndDelete(req.params.id);

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
    const kit = await FestivalKit.findById(req.params.id);

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: "Kit not found"
      });
    }

    const { name, description, kitPrice, festivalType, status = kit.status || "active" } = req.body;
    const items = req.body.items ? parseKitItems(req.body.items) : null;

    if (!name || !items?.length || !kitPrice) {
      return res.status(400).json({
        success: false,
        message: "Name, items and kitPrice are required"
      });
    }

    const { formattedItems, totalPrice } = await buildKitItems(items);

    kit.name = name;
    kit.description = description;
    kit.festivalType = festivalType;
    kit.status = status;
    kit.kitPrice = Number(kitPrice);
    kit.items = formattedItems;
    kit.totalPrice = totalPrice;
    kit.savings = totalPrice - Number(kitPrice);

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
