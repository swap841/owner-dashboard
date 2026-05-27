// lib/areaCode.ts

/**
 * Extracts a 6-digit pincode from an address string and formats it as AREA_<pincode>.
 * If no pincode is found, it generates a fallback code using uppercase characters of the address.
 */
export function extractAreaCode(address: string | undefined | null): string {
  if (!address) return "AREA_UNKNOWN";
  
  // Look for a 6-digit number representing an Indian pincode
  const pincodeMatch = address.match(/\b\d{6}\b/);
  if (pincodeMatch) {
    return `AREA_${pincodeMatch[0]}`;
  }
  
  // Fallback: clean the address and extract a clean substring for area identification
  const clean = address
    .replace(/[^a-zA-Z0-9]/g, "")
    .trim();
  
  if (clean.length > 0) {
    return `AREA_${clean.substring(0, 6).toUpperCase()}`;
  }
  
  return "AREA_UNKNOWN";
}
