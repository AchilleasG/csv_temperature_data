type Props = {
  centerYear: number;
  setCenterYear: (v: number) => void;
  windowYears: number;
  setWindowYears: (v: number) => void;
  minYear: number;
  maxYear: number;
  reset: () => void;
};

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

const MIN_CENTER_YEAR = 1000;
const MAX_CENTER_YEAR = 3000;

export default function ZoomControls({
  centerYear,
  setCenterYear,
  windowYears,
  setWindowYears,
  minYear,
  maxYear,
  reset
}: Props) {
  const [centerYearText, setCenterYearText] = useState(String(centerYear));

  useEffect(() => {
    setCenterYearText(String(centerYear));
  }, [centerYear]);

  const hasUnappliedCenterYear = centerYearText.trim() !== String(centerYear);

  const left = Math.floor(windowYears / 2);
  const right = Math.ceil(windowYears / 2) - 1;
  const start = centerYear - left;
  const end = centerYear + right;

  const sliderMin = 1;
  const sliderMax = maxYear - minYear + 1;
  const pct = sliderMax > sliderMin ? ((windowYears - sliderMin) / (sliderMax - sliderMin)) * 100 : 0;
  const sliderStyle = { ["--range-pct" as any]: `${pct}%` } as CSSProperties;

  function commitCenterYear(nextRaw: string) {
    const next = Number(nextRaw);
    if (!Number.isFinite(next)) {
      setCenterYearText(String(centerYear));
      return;
    }
    if (next < MIN_CENTER_YEAR || next > MAX_CENTER_YEAR) {
      window.alert(`Center year must be between ${MIN_CENTER_YEAR} and ${MAX_CENTER_YEAR}.`);
      setCenterYearText(String(centerYear));
      return;
    }
    setCenterYear(Math.trunc(next));
  }

  return (
    <div className="card">
      <div className="cardHeader">
        <h2>Zoom</h2>
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>

      <div className="grid">
        <label className="field">
          <span>Center year</span>
          <input
            type="number"
            value={centerYearText}
            min={MIN_CENTER_YEAR}
            max={MAX_CENTER_YEAR}
            onChange={(e) => setCenterYearText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitCenterYear((e.target as HTMLInputElement).value);
            }}
            onBlur={(e) => commitCenterYear(e.target.value)}
            className={hasUnappliedCenterYear ? "warningInput" : undefined}
          />
        </label>

        {hasUnappliedCenterYear && (
          <div className="hintRow" role="note" aria-live="polite">
            <span className="hintDot" aria-hidden="true" />
            <span>Press Enter to apply</span>
          </div>
        )}

        <label className="field">
          <span>Window (years)</span>
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            value={windowYears}
            className="rangeSlider"
            style={sliderStyle}
            onChange={(e) => setWindowYears(Number(e.target.value))}
          />
          <div className="muted small">
            {start} – {end} ({windowYears} years)
          </div>
        </label>
      </div>

      <div className="muted small" style={{ marginTop: 10 }}>
        Dataset coverage: {minYear}–{maxYear}. Outside this range the plot may be empty.
      </div>
    </div>
  );
}
