/**
 * Converts a city name string to consistent Title Case.
 * Examples:
 *   "GARHWA"   → "Garhwa"
 *   "GarHwa"   → "Garhwa"
 *   "new delhi"→ "New Delhi"
 *   "  patna " → "Patna"
 *
 * @param {string} value - Raw city name.
 * @returns {string} Normalized Title Case city name.
 */
export const toTitleCase = (value) => {
  if (!value || typeof value !== "string") return "";

  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Deduplicates and normalizes an array of raw city name strings.
 * Case-insensitive deduplication — all variants of the same city collapse into one Title Case entry.
 *
 * @param {string[]} cities - Array of raw city strings from DB distinct().
 * @returns {string[]} Sorted, deduplicated Title Case city names.
 */
export const normalizeCityList = (cities) => {
  if (!Array.isArray(cities)) return [];

  const seen = new Map();

  for (const raw of cities) {
    const normalized = toTitleCase(raw);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, normalized);
    }
  }

  return Array.from(seen.values()).sort();
};
