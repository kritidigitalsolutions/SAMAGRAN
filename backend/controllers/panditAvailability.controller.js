import mongoose from "mongoose";
import PanditAvailability from "../models/panditAvailability.model.js";

const VALID_STATUSES = new Set(["available", "booked", "not_available"]);

const normalizeMonth = (value) => {
  const month = Number(value);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }
  return month;
};

const normalizeYear = (value) => {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1970) {
    return null;
  }
  return year;
};

const resolveMonthYear = ({ month, year }) => {
  const now = new Date();
  const hasMonth = month !== undefined && month !== null && String(month).trim() !== "";
  const hasYear = year !== undefined && year !== null && String(year).trim() !== "";

  const resolvedMonth = hasMonth ? normalizeMonth(month) : now.getMonth() + 1;
  const resolvedYear = hasYear ? normalizeYear(year) : now.getFullYear();

  if ((hasMonth && !resolvedMonth) || (hasYear && !resolvedYear)) {
    return { month: null, year: null, error: "Invalid month or year" };
  }

  return { month: resolvedMonth, year: resolvedYear, error: null };
};

const normalizeAvailability = ({ availability, year, month }) => {
  if (!Array.isArray(availability)) {
    return { data: null, error: "availability must be an array" };
  }

  const monthKey = String(month).padStart(2, "0");
  const prefix = `${year}-${monthKey}-`;

  const errors = [];
  const data = [];

  availability.forEach((entry, index) => {
    const date = String(entry?.date || "").trim();
    const status = String(entry?.status || "").trim();

    if (!date || !status) {
      errors.push(`availability[${index}] requires date and status`);
      return;
    }

    if (!date.startsWith(prefix)) {
      errors.push(`availability[${index}].date must be in ${prefix}XX format`);
      return;
    }

    if (!VALID_STATUSES.has(status)) {
      errors.push(`availability[${index}].status must be available, booked, or not_available`);
      return;
    }

    data.push({ date, status });
  });

  if (errors.length) {
    return { data: null, error: errors.join(", ") };
  }

  return { data, error: null };
};

export const upsertPanditAvailability = async (req, res) => {
  try {
    const { month, year, availability, pandit_id } = req.body || {};
    const resolvedMonth = normalizeMonth(month);
    const resolvedYear = normalizeYear(year);

    if (!resolvedMonth || !resolvedYear) {
      return res.status(400).json({
        success: false,
        message: "month and year are required",
      });
    }

    const { data, error } = normalizeAvailability({
      availability,
      year: resolvedYear,
      month: resolvedMonth,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const resolvedPanditId = req.pandit?._id || pandit_id;

    if (!resolvedPanditId || !mongoose.Types.ObjectId.isValid(resolvedPanditId)) {
      return res.status(400).json({
        success: false,
        message: "Valid pandit_id is required",
      });
    }

    if (req.pandit?._id && String(req.pandit._id) !== String(resolvedPanditId)) {
      return res.status(403).json({
        success: false,
        message: "Pandit mismatch",
      });
    }

    const payload = {
      pandit: resolvedPanditId,
      month: resolvedMonth,
      year: resolvedYear,
      availability: data,
    };

    const record = await PanditAvailability.findOneAndUpdate(
      { pandit: resolvedPanditId, month: resolvedMonth, year: resolvedYear },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      data: record,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to save availability",
    });
  }
};

const fetchPanditAvailability = async ({ panditId, month, year }) => {
  return PanditAvailability.findOne({ pandit: panditId, month, year });
};

export const getPanditAvailabilityForPandit = async (req, res) => {
  try {
    const { month, year } = req.query;
    const { month: resolvedMonth, year: resolvedYear, error } = resolveMonthYear({
      month,
      year,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const record = await fetchPanditAvailability({
      panditId: req.pandit?._id,
      month: resolvedMonth,
      year: resolvedYear,
    });

    return res.json({
      success: true,
      data: record || {
        pandit: req.pandit?._id,
        month: resolvedMonth,
        year: resolvedYear,
        availability: [],
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load availability",
    });
  }
};

export const getPanditAvailabilityForUser = async (req, res) => {
  try {
    const { panditId } = req.params;
    const { month, year } = req.query;
    const { month: resolvedMonth, year: resolvedYear, error } = resolveMonthYear({
      month,
      year,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    if (!panditId || !mongoose.Types.ObjectId.isValid(panditId)) {
      return res.status(400).json({
        success: false,
        message: "Valid panditId is required",
      });
    }

    const record = await fetchPanditAvailability({
      panditId,
      month: resolvedMonth,
      year: resolvedYear,
    });

    return res.json({
      success: true,
      data: record || {
        pandit: panditId,
        month: resolvedMonth,
        year: resolvedYear,
        availability: [],
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Unable to load availability",
    });
  }
};
