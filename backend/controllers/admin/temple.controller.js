import temple from "../../models/temple.model.js";
import { uploadFileToFirebase } from "../../utils/firebaseUpload.js";

const normalizeFacilities = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
};

const sanitizetemplePayload = (body = {}) => {
  const normalizedAddress =
    body.address && typeof body.address === "object"
      ? body.address
      : {
          line1: body["address[line1]"] || "",
          line2: body["address[line2]"] || "",
          city: body["address[city]"] || "",
          state: body["address[state]"] || "",
          pinCode: body["address[pinCode]"] || "",
          landmark: body["address[landmark]"] || "",
        };

  const {
    name = "",
    image = "",
    description = "",
    contactPhone = "",
    contactPerson = "",
    openingTime = "",
    closingTime = "",
    facilities = [],
    status = "active",
    address = normalizedAddress,
  } = body;

  return {
    name: String(name || "").trim(),
    image: String(image || "").trim(),
    description: String(description || "").trim(),
    contactPhone: String(contactPhone || "").trim(),
    contactPerson: String(contactPerson || "").trim(),
    openingTime: String(openingTime || "").trim(),
    closingTime: String(closingTime || "").trim(),
    facilities: normalizeFacilities(facilities),
    status: status === "inactive" ? "inactive" : "active",
    address: {
      line1: String(address?.line1 || "").trim(),
      line2: String(address?.line2 || "").trim(),
      city: String(address?.city || "").trim(),
      state: String(address?.state || "").trim(),
      pinCode: String(address?.pinCode || "").trim(),
      landmark: String(address?.landmark || "").trim(),
    },
  };
};

export const createtemple = async (req, res) => {
  try {
    const payload = sanitizetemplePayload(req.body);
    const uploadedImage = req.file
      ? await uploadFileToFirebase(req.file, { folder: "temples" })
      : "";

    if (uploadedImage) {
      payload.image = uploadedImage;
    }

    if (!payload.name) {
      return res.status(400).json({
        success: false,
        message: "temple name is required",
      });
    }

    const exists = await temple.findOne({
      name: { $regex: `^${payload.name}$`, $options: "i" },
      "address.city": payload.address.city,
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "temple already exists in this city",
      });
    }

    const newTemple = await temple.create(payload);

    return res.status(201).json({
      success: true,
      message: "temple created",
      data: newTemple,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to create temple",
    });
  }
};

export const getAlltemplesForAdmin = async (req, res) => {
  try {
    const { search = "", status = "all" } = req.query;

    const filter = {};

    if (status !== "all") {
      filter.status = status;
    }

    if (String(search || "").trim()) {
      const regex = { $regex: String(search).trim(), $options: "i" };
      filter.$or = [
        { name: regex },
        { description: regex },
        { "address.city": regex },
        { "address.state": regex },
        { "address.landmark": regex },
      ];
    }

    const temples = await temple.find(filter).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: temples.length,
      data: temples,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load temples",
    });
  }
};

export const updatetemple = async (req, res) => {
  try {
    const { id } = req.params;
    const templeDoc = await temple.findById(id);

    if (!templeDoc) {
      return res.status(404).json({
        success: false,
        message: "temple not found",
      });
    }

    const uploadedImage = req.file
      ? await uploadFileToFirebase(req.file, { folder: "temples" })
      : "";

    const payload = sanitizetemplePayload({
      ...templeDoc.toObject(),
      ...req.body,
      address: {
        ...(templeDoc.address?.toObject?.() || templeDoc.address || {}),
        ...(req.body?.address || {}),
      },
      facilities: req.body?.facilities !== undefined ? req.body.facilities : templeDoc.facilities,
    });

    if (uploadedImage) {
      payload.image = uploadedImage;
    }

    if (!payload.name) {
      return res.status(400).json({
        success: false,
        message: "temple name is required",
      });
    }

    const duplicate = await temple.findOne({
      _id: { $ne: id },
      name: { $regex: `^${payload.name}$`, $options: "i" },
      "address.city": payload.address.city,
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "Another temple with same name already exists in this city",
      });
    }

    Object.assign(templeDoc, payload);
    await templeDoc.save();

    return res.json({
      success: true,
      message: "temple updated",
      data: templeDoc,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to update temple",
    });
  }
};

export const deletetemple = async (req, res) => {
  try {
    const deletedTemple = await temple.findByIdAndDelete(req.params.id);

    if (!deletedTemple) {
      return res.status(404).json({
        success: false,
        message: "temple not found",
      });
    }

    return res.json({
      success: true,
      message: "temple deleted",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to delete temple",
    });
  }
};
