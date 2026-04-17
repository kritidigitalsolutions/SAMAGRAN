import DefaultKit from "../models/defaultKit.model.js";

export const getDefaultKitsForUsers = async (req, res) => {
  try {
    const { search = "" } = req.query;

    const filter = {
      status: "active",
    };

    if (search.trim()) {
      filter.name = { $regex: search.trim(), $options: "i" };
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

export const getDefaultKitByIdForUsers = async (req, res) => {
  try {
    const kit = await DefaultKit.findOne({
      _id: req.params.id,
      status: "active",
    }).populate("items.product", "title pricing media stock status");

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


// ------------------------------------
// POST /api/user-kits/from-default/:defaultKitId
// Create draft from admin default kit, optionally override quantities
// ------------------------------------
export const createUserKitFromDefaultKit = async (req, res) => {
  try {
    const { defaultKitId } = req.params;
    const { name, customItems = [], addItems = [] } = req.body;

    const defaultKit = await DefaultKit.findOne({
      _id: defaultKitId,
      status: "active",
    }).populate("items.product", "_id title pricing stock status");

    if (!defaultKit) {
      return res.status(404).json({
        success: false,
        message: "Default kit not found",
      });
    }

    const overrideMap = new Map();

    if (Array.isArray(customItems)) {
      customItems.forEach((entry) => {
        if (entry?.productId) {
          overrideMap.set(String(entry.productId), Number(entry.quantity || 1));
        }
      });
    }

    const finalItems = [];
    let totalPrice = 0;

    for (const kitItem of defaultKit.items) {
      const product = kitItem.product;

      if (!product || product.status !== "active") {
        continue;
      }

      const overrideQty = overrideMap.get(String(product._id));
      const quantity = Math.max(Number(overrideQty || kitItem.quantity || 1), 1);

      if (Number(product.stock?.quantity || 0) < quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.title} out of stock for selected quantity`,
        });
      }

      const priceAtTime = Number(product.pricing?.price || 0);

      finalItems.push({
        product: product._id,
        quantity,
        priceAtTime,
      });

      totalPrice += priceAtTime * quantity;
    }

    if (Array.isArray(addItems)) {
      for (const entry of addItems) {
        const productId = entry?.productId;
        const quantity = Math.max(Number(entry?.quantity || 1), 1);

        if (!productId) {
          continue;
        }

        const existingIndex = finalItems.findIndex(
          (item) => String(item.product) === String(productId)
        );

        const product = await Item.findOne({
          _id: productId,
          status: "active",
        });

        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Product not found: ${productId}`,
          });
        }

        if (Number(product.stock?.quantity || 0) < quantity) {
          return res.status(400).json({
            success: false,
            message: `${product.title} out of stock for selected quantity`,
          });
        }

        const priceAtTime = Number(product.pricing?.price || 0);

        if (existingIndex >= 0) {
          totalPrice -= finalItems[existingIndex].priceAtTime * finalItems[existingIndex].quantity;

          finalItems[existingIndex] = {
            product: product._id,
            quantity,
            priceAtTime,
          };
        } else {
          finalItems.push({
            product: product._id,
            quantity,
            priceAtTime,
          });
        }

        totalPrice += priceAtTime * quantity;
      }
    }

    if (!finalItems.length) {
      return res.status(400).json({
        success: false,
        message: "No valid products found in selected default kit",
      });
    }

    const userKit = await UserKit.create({
      user: req.user._id,
      name: name?.trim() || `${defaultKit.name} (Custom)`,
      baseKit: defaultKit._id,
      items: finalItems,
      totalPrice,
      status: "draft",
      paymentStatus: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Draft created from default kit",
      data: userKit,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
