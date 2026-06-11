/**
 * Converts a city name string to consistent Title Case.
 * Examples:
 *   "GARHWA"    → "Garhwa"
 *   "GarHwa"    → "Garhwa"
 *   "new delhi" → "New Delhi"
 *   "  patna "  → "Patna"
 *
 * @param {string} value
 * @returns {string}
 */
export const toTitleCase = (value) => {
  if (!value || typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Takes a raw array of city strings (as returned by the API) and returns a
 * sorted, case-insensitively deduplicated array of Title Case city names.
 *
 * Handles values like "GARHWA", "GarHwa", and "garhwa" → single "Garhwa" entry.
 *
 * @param {string[]} cities
 * @returns {string[]}
 */
export const normalizeCities = (cities) => {
  if (!Array.isArray(cities)) return [];

  const seen = new Map();

  for (const raw of cities) {
    const normalized = toTitleCase(String(raw || ""));
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, normalized);
    }
  }

  return Array.from(seen.values()).sort();
};
