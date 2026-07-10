/**
 * Format date string (YYYY-MM-DD or ISO string) to readable format
 * e.g., "2023-05-15" -> "May 15, 2023"
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return "N/A";
  }
}

/**
 * Format datetime string to readable format with time
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "N/A";
  }
}

/**
 * Format percentages (e.g., 0.85 -> "85%", 85 -> "85%")
 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "0%";
  // If the value is a decimal like 0.85, multiply by 100
  const normalizedValue = value <= 1 && value > 0 ? value * 100 : value;
  return `${Math.round(normalizedValue)}%`;
}

/**
 * Format employee full name
 */
export function formatName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/**
 * Helper to get clean status labels
 */
export function formatStatus(status: string): string {
  if (!status) return "";
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
