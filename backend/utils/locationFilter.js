/**
 * locationFilter.js
 *
 * Shared utility for city-based location filtering (V1).
 *
 * City resolution priority:
 *   1. ?city= query param  (highest — guest users & instant override)
 *   2. req.user.selectedCity (authenticated users' stored preference)
 *   3. null  →  caller should return { cityRequired: true }
 *
 * Backward compatibility:
 *   Vendors / products with no city data are treated as "available everywhere"
 *   and are always included in results regardless of the requested city.
 *
 * V1 scope: city-level only.
 *   Pincode fields exist in the DB schema but are NOT enforced here yet.
 */

import Vendor from "../models/vendor.model.js";
import Pandit from "../models/pandit.model.js";

// ─── City resolution ────────────────────────────────────────────────────────

/**
 * Resolve the effective city for a request.
 *
 * @param {import('express').Request} req
 * @returns {string|null}  Trimmed city string, or null if not determinable.
 */
export const resolveCity = (req) => {
  // 1. Explicit ?city= param (works for guests and authenticated users)
  const queryCity = String(req.query?.city || "").trim();
  if (queryCity) return queryCity;

  // 2. Authenticated user's stored city
  const userCity = String(req.user?.selectedCity || "").trim();
  if (userCity) return userCity;

  return null;
};

// ─── Vendor helpers ─────────────────────────────────────────────────────────

/**
 * Build a MongoDB $in condition for vendorId that limits results to vendors
 * serving the given city.
 *
 * Vendors with an empty/missing address.city are considered "available
 * everywhere" and are always included (backward compatibility).
 *
 * @param {string} city
 * @returns {Promise<import('mongoose').Types.ObjectId[]>}
 *   Array of vendor ObjectIds active in the city (includes city-agnostic ones).
 *   Returns null when no city is provided — caller must handle that case.
 */
export const getVendorIdsByCity = async (city) => {
  if (!city) return null;

  const normalizedCity = city.trim();

  const vendors = await Vendor.find({
    status: "active",
    $or: [
      // Vendors explicitly serving this city (case-insensitive)
      { "address.city": { $regex: `^${escapeRegex(normalizedCity)}$`, $options: "i" } },
      // Vendors with no city set — treat as global (backward compat)
      { "address.city": "" },
      { "address.city": { $exists: false } },
    ],
  }).select("_id");

  return vendors.map((v) => v._id);
};

/**
 * Build a Mongoose query condition for products/kits based on city.
 *
 * Returns a filter object for the `vendorId` field that can be spread into
 * any find() query.  Also handles products that have no vendorId at all
 * (legacy / admin-created items) — those pass through regardless of city.
 *
 * @param {string|null} city
 * @returns {Promise<object>}  Partial Mongoose filter object.
 */
export const buildVendorCityFilter = async (city) => {
  if (!city) return {};

  const vendorIds = await getVendorIdsByCity(city);

  // Include: documents whose vendorId is in the city set, OR vendorId is null/missing
  return {
    $or: [
      { vendorId: { $in: vendorIds } },
      { vendorId: null },
      { vendorId: { $exists: false } },
    ],
  };
};

// ─── Pandit helpers ─────────────────────────────────────────────────────────

/**
 * Return an array of pandit ObjectIds whose service city matches the given city.
 *
 * Matches against `pandit.address.city` and
 * `pandit.serviceTypes.detectedLocation.city` (either one is enough).
 *
 * @param {string} city
 * @returns {Promise<import('mongoose').Types.ObjectId[]>}
 */
export const getPanditIdsByCity = async (city) => {
  if (!city) return [];

  const normalizedCity = city.trim();
  const cityRegex = { $regex: `^${escapeRegex(normalizedCity)}$`, $options: "i" };

  const pandits = await Pandit.find({
    status: "active",
    $or: [
      { "address.city": cityRegex },
      { "serviceTypes.detectedLocation.city": cityRegex },
    ],
  }).select("_id");

  return pandits.map((p) => p._id);
};

/**
 * Return the set of ritual titles (lowercased) that are actively offered
 * by at least one active pandit in the given city.
 *
 * A ritual is considered "offered" when the pandit has it in
 * `poojaOfferings` with `isSelected: true`.
 *
 * @param {string} city
 * @returns {Promise<Set<string>>}  Set of lowercase ritual titles.
 */
export const getRitualTitlesAvailableInCity = async (city) => {
  if (!city) return new Set();

  const panditIds = await getPanditIdsByCity(city);
  if (panditIds.length === 0) return new Set();

  const pandits = await Pandit.find(
    { _id: { $in: panditIds } },
    { poojaOfferings: 1 }
  ).lean();

  const titles = new Set();

  for (const pandit of pandits) {
    const offerings = Array.isArray(pandit.poojaOfferings) ? pandit.poojaOfferings : [];
    for (const offering of offerings) {
      if (offering.isSelected && offering.name) {
        titles.add(String(offering.name).trim().toLowerCase());
      }
    }
  }

  return titles;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Standard "city is required" response payload.
 * Returns HTTP 200 so the frontend can gracefully show the city picker
 * rather than treating it as an error.
 *
 * @param {import('express').Response} res
 */
export const sendCityRequired = (res) => {
  return res.status(200).json({
    success: true,
    cityRequired: true,
    message: "Please select your city to continue.",
    data: null,
  });
};

// ─── Private helpers ─────────────────────────────────────────────────────────

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
