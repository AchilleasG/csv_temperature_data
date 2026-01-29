import { useMemo } from "react";
import Plotly from "plotly.js-basic-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";
import { AnnualResponse, MonthlyResponse } from "../types";
import { STATION_PALETTE } from "../colors";

const Plot = createPlotlyComponent(Plotly as any);

type Props = {
  mode: "monthly" | "annual";
  monthly: MonthlyResponse | null;
  annual: AnnualResponse | null;
  includeStd: boolean;
  zoomStartYear: number;
  zoomEndYear: number;
  uiRevision: string;
  onZoomYearsChange: (next: { enabled: boolean; startYear: number; endYear: number }) => void;
  onIncludeStdChange: (next: boolean) => void;
  loading: boolean;
  colorMap: Record<string, string>;
};

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return `rgba(255,255,255,${alpha})`;
  const r = Number.parseInt(m[1], 16);
  const g = Number.parseInt(m[2], 16);
  const b = Number.parseInt(m[3], 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function Visualization({
  mode,
  monthly,
  annual,
  includeStd,
  zoomStartYear,
  zoomEndYear,
  uiRevision,
  onZoomYearsChange,
  onIncludeStdChange,
  loading,
  colorMap
}: Props) {
  const colorForStation = (station: string) =>
    colorMap[station] ?? STATION_PALETTE[0]; // fallback should be rare

  const traces = useMemo(() => {
    if (mode === "monthly") {
      const data = monthly?.stations ?? [];
      return data.map((series) => ({
        type: "scatter" as const,
        mode: "lines" as const,
        name: series.station,
        legendgroup: series.station,
        line: { color: colorForStation(series.station) },
        x: series.points.map((p) => `${p.year}-${pad2(p.month)}-01`),
        y: series.points.map((p) => p.value)
      }));
    }

    const data = annual?.stations ?? [];
    const out: any[] = [];
    for (const series of data) {
      const points = series.points as any[];
      const baseColor = colorForStation(series.station);
      const x = points.map((p) => p.year);
      const mean = points.map((p) => p.mean);
      out.push({
        type: "scatter",
        mode: "lines",
        name: series.station,
        legendgroup: series.station,
        line: { color: baseColor },
        x,
        y: mean
      });

      if (includeStd) {
        const fill = hexToRgba(baseColor, 0.18);
        const lower = points.map((p) => (typeof p.lower === "number" ? p.lower : null));
        const upper = points.map((p) => (typeof p.upper === "number" ? p.upper : null));
        out.push({
          type: "scatter",
          mode: "lines",
          name: `${series.station} -1σ`,
          legendgroup: series.station,
          x,
          y: lower,
          line: { width: 0, color: "rgba(0,0,0,0)" },
          hoverinfo: "skip",
          showlegend: false
        });
        out.push({
          type: "scatter",
          mode: "lines",
          name: `${series.station} +1σ`,
          legendgroup: series.station,
          x,
          y: upper,
          line: { width: 0, color: "rgba(0,0,0,0)" },
          fill: "tonexty",
          fillcolor: fill,
          hoverinfo: "skip",
          showlegend: false
        });
      }
    }
    return out;
  }, [mode, monthly, annual, includeStd, colorMap]);

  const title = mode === "monthly" ? "Monthly" : "Annual";
  const xTitle = mode === "monthly" ? "Date" : "Year";
  const xRange =
    mode === "monthly" ? [`${zoomStartYear}-01-01`, `${zoomEndYear}-12-31`] : [zoomStartYear, zoomEndYear];

  function parseRelayoutYears(e: any): { enabled: boolean; startYear: number; endYear: number } | null {
    if (!e || typeof e !== "object") return null;
    const autorange = e["xaxis.autorange"] ?? e["xaxis.autorange[0]"] ?? e["xaxis.autorange[1]"];
    if (autorange === true) return { enabled: false, startYear: zoomStartYear, endYear: zoomEndYear };

    const r0 = e["xaxis.range[0]"] ?? (Array.isArray(e["xaxis.range"]) ? e["xaxis.range"][0] : undefined);
    const r1 = e["xaxis.range[1]"] ?? (Array.isArray(e["xaxis.range"]) ? e["xaxis.range"][1] : undefined);
    if (r0 == null || r1 == null) return null;

    const toYear = (v: any): number | null => {
      if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
      if (typeof v === "string" && v.length >= 4) {
        const y = Number.parseInt(v.slice(0, 4), 10);
        return Number.isFinite(y) ? y : null;
      }
      return null;
    };

    const y0 = toYear(r0);
    const y1 = toYear(r1);
    if (y0 == null || y1 == null) return null;

    const startYear = Math.min(y0, y1);
    const endYear = Math.max(y0, y1);
    return { enabled: true, startYear, endYear };
  }

  return (
    <div className="card">
      <div className="cardHeader">
        <div className="chartHeaderLeft">
          <h2>{title}</h2>
          {loading ? <span className="spinner" aria-label="Loading" role="status" /> : null}
        </div>
        {mode === "annual" ? (
          <label className="toggleInline" title="Display deviation band (±1σ)">
            <span className="toggleLabel">±1σ</span>
            <input
              type="checkbox"
              checked={includeStd}
              disabled={loading}
              onChange={(e) => onIncludeStdChange(e.target.checked)}
              className="toggleCheckbox"
            />
            <span className="togglePill" aria-hidden="true" />
          </label>
        ) : null}
      </div>

      <div className="plotWrap">
        <Plot
          data={traces}
          layout={{
            uirevision: uiRevision,
            autosize: true,
            margin: { l: 50, r: 20, t: 10, b: 45 },
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
            font: { color: "rgba(255,255,255,0.92)" },
            xaxis: {
              title: { text: xTitle },
              gridcolor: "rgba(255,255,255,0.08)",
              type: mode === "monthly" ? "date" : undefined,
              autorange: false,
              range: xRange as any
            },
            yaxis: { title: { text: "°C" }, gridcolor: "rgba(255,255,255,0.08)" },
            legend: { orientation: "h", y: -0.25 }
          }}
          config={{ displayModeBar: false, responsive: true }}
          onRelayout={(e) => {
            const parsed = parseRelayoutYears(e);
            if (!parsed) return;
            onZoomYearsChange(parsed);
          }}
          style={{ width: "100%", height: "520px" }}
        />
      </div>
    </div>
  );
}
