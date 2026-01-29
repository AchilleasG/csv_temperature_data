export type AnalyticsSummary = {
  count: number;
  mean: number | null;
  std: number | null;
  min: number | null;
  max: number | null;
};

export type StationsResponse = { count: number; stations: string[] };

export type MonthlyPoint = { year: number; month: number; value: number };
export type MonthlySeries = { station: string; points: MonthlyPoint[] };
export type MonthlyResponse = { stations: MonthlySeries[] };

export type AnnualPoint =
  | { year: number; mean: number }
  | { year: number; mean: number; std: number | null; lower?: number; upper?: number };
export type AnnualSeries = { station: string; points: AnnualPoint[] };
export type AnnualResponse = { stations: AnnualSeries[] };

export type DataRangeResponse = { min_year: number | null; max_year: number | null };
