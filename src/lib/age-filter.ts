/**
 * Parses age strings (e.g. "12-18M", "1Y", "2-4Y", "All ages") into [minMonths, maxMonths].
 */
export function parseAgeRange(raw: string | null | undefined): [number, number] | null {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase().replace(/\s*[-–—/to]+\s*/g, "-");

  if (s === "all ages") return [0, 9999];

  // Range match e.g. "12-18m", "1-2y", "6-9m"
  const rangeMatch = s.match(/^(\d+)\s*([a-z]+)?-(\d+)\s*([a-z]+)?$/);
  if (rangeMatch) {
    const v1 = parseInt(rangeMatch[1], 10);
    const u1 = rangeMatch[2] || "";
    const v2 = parseInt(rangeMatch[3], 10);
    const u2 = rangeMatch[4] || "";

    const isY2 = u2.includes("y") || u2.includes("yr");
    const isY1 = u1.includes("y") || u1.includes("yr");
    const unit1 = isY1 ? "y" : u1.includes("m") ? "m" : isY2 ? "y" : v2 <= 5 ? "y" : "m";
    const unit2 = isY2 ? "y" : u2.includes("m") ? "m" : isY1 ? "y" : v2 <= 5 ? "y" : "m";

    const m1 = unit1 === "y" ? v1 * 12 : v1;
    const m2 = unit2 === "y" ? v2 * 12 : v2;
    return [Math.min(m1, m2), Math.max(m1, m2)];
  }

  // Single value match e.g. "1y", "12m", "2y"
  const singleMatch = s.match(/^(\d+)\s*([a-z]+)?$/);
  if (singleMatch) {
    const v = parseInt(singleMatch[1], 10);
    const u = singleMatch[2] || "";
    const isYear = u.includes("y") || u.includes("yr") || (!u.includes("m") && v <= 10);
    if (isYear) {
      // 1Y covers the 1-year age span (12 to 24 months)
      return [v * 12, (v + 1) * 12];
    }
    return [v, v + 3];
  }

  return null;
}

/**
 * Checks if the selected age filter overlaps with any age/size configured on the product.
 */
export function matchesAge(
  filterAge: string | null | undefined,
  productSizes: string[] = [],
  productAgeGroup?: string | null
): boolean {
  if (!filterAge || filterAge === "All ages") return true;

  const clientRange = parseAgeRange(filterAge);
  if (!clientRange) return true;
  const [cMin, cMax] = clientRange;

  const allSizes = [...productSizes];
  if (productAgeGroup && !allSizes.includes(productAgeGroup)) {
    allSizes.push(productAgeGroup);
  }

  return allSizes.some((size) => {
    if (!size) return false;
    if (size.trim().toLowerCase() === "all ages") return true;

    const pRange = parseAgeRange(size);
    if (!pRange) {
      return size.trim().toLowerCase() === filterAge.trim().toLowerCase();
    }
    const [pMin, pMax] = pRange;

    // Overlap: they share months within the range
    if (Math.max(cMin, pMin) < Math.min(cMax, pMax)) return true;

    // Direct exact match
    return cMin === pMin && cMax === pMax;
  });
}
