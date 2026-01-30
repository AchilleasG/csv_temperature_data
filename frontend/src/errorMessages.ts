import { ApiError, ApiRequestKey } from "./api";

function requestLabel(key: ApiRequestKey | undefined): string {
  switch (key) {
    case "dataRange":
      return "dataset year range";
    case "stations":
      return "station list";
    case "analyticsSummary":
      return "analytics summary";
    case "monthlyData":
      return "monthly data";
    case "annualData":
      return "annual data";
    default:
      return "data";
  }
}

function formatStationList(stations: string[]): string {
  const unique = Array.from(new Set(stations)).filter(Boolean);
  unique.sort((a, b) => a.localeCompare(b));
  if (unique.length <= 6) return unique.join(", ");
  return `${unique.slice(0, 6).join(", ")} (+${unique.length - 6} more)`;
}

function missingStationsFromDetail(detail: unknown): string[] | null {
  if (!detail || typeof detail !== "object") return null;
  const ms = (detail as any).missing_stations;
  if (!Array.isArray(ms)) return null;
  const out = ms.map((x) => String(x)).filter(Boolean);
  return out.length ? out : null;
}

export function userFriendlyError(e: unknown): string {
  if (e instanceof ApiError) {
    const label = requestLabel(e.requestKey);

    if (e.status === 0) {
      return "Can’t reach the server. Check that the API is running (and not blocked by CORS), then try again.";
    }

    if (e.status === 404) {
      const missing = missingStationsFromDetail(e.detail);
      if (missing && (e.requestKey === "analyticsSummary" || e.requestKey === "monthlyData" || e.requestKey === "annualData")) {
        return `Some selected stations aren’t available in the dataset (${formatStationList(missing)}). Remove them and try again.`;
      }
      return `Not found while loading ${label}.`;
    }

    if (e.status === 422) {
      if (typeof e.detail === "string") {
        if (e.detail.includes("stations is required")) return "Select at least one station to load data.";
        if (e.detail.includes("start_year must be <=")) return "Invalid year range. Start year must be ≤ end year.";
      }
      return `Invalid request while loading ${label}.`;
    }

    if (e.status >= 500) {
      if (typeof e.detail === "string" && e.detail.includes("CSV_PATH not found")) {
        return "The server can’t find the CSV dataset. Set `CSV_PATH` (or mount the data file) and reload.";
      }
      return `Server error while loading ${label}. Please try again.`;
    }

    if (e.message === "Invalid JSON response from server") {
      return `Unexpected server response while loading ${label}. Please try again.`;
    }

    return `Request failed while loading ${label} (${e.status}).`;
  }

  if (e instanceof Error) return e.message || "Unexpected error.";
  return "Unexpected error.";
}

