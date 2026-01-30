import { useCallback, useEffect, useMemo, useState } from "react";
import { getJson } from "./api";
import AnalyticsCard from "./components/AnalyticsCard";
import StationPicker from "./components/StationPicker";
import Visualization from "./components/Visualization";
import ZoomControls from "./components/ZoomControls";
import { AnnualResponse, AnalyticsSummary, DataRangeResponse, MonthlyResponse, StationsResponse } from "./types";
import { STATION_PALETTE } from "./colors";
import { userFriendlyError } from "./errorMessages";

export default function App() {
  const [yearBounds, setYearBounds] = useState(() => ({ minYear: 1859, maxYear: 2019 }));
  const [stations, setStations] = useState<string[]>([]);
  const [stationsFilter, setStationsFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const [mode, setMode] = useState<"monthly" | "annual">("monthly");
  const [includeStd, setIncludeStd] = useState(false);

  const [zoom, setZoom] = useState(() => ({
    centerYear: Math.round((1859 + 2019) / 2),
    windowYears: 2019 - 1859 + 1
  }));

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyResponse | null>(null);
  const [annual, setAnnual] = useState<AnnualResponse | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastLoadedKey, setLastLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getJson<DataRangeResponse>("/api/data/range", { requestKey: "dataRange" })
      .then((range) => {
        if (cancelled) return;
        if (typeof range.min_year === "number" && typeof range.max_year === "number") {
          setYearBounds({ minYear: range.min_year, maxYear: range.max_year });
          setZoom({
            centerYear: Math.round((range.min_year + range.max_year) / 2),
            windowYears: range.max_year - range.min_year + 1
          });
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(userFriendlyError(e));
      })
      .finally(() => {
        getJson<StationsResponse>("/api/stations", { requestKey: "stations" })
          .then((data) => {
            if (cancelled) return;
            setStations(data.stations);
          })
          .catch((e) => {
            if (cancelled) return;
            setError(userFriendlyError(e));
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stationColorMap = useMemo(() => {
    const entries = stations.map((s, i) => [s, STATION_PALETTE[i % STATION_PALETTE.length]] as const);
    return Object.fromEntries(entries) as Record<string, string>;
  }, [stations]);

  const stationsParam = useMemo(() => selected.join(","), [selected]);

  const setWindowYearsClamped = useCallback(
    (v: number) => {
      const span = Math.max(1, yearBounds.maxYear - yearBounds.minYear + 1);
      const w = Math.max(1, Math.min(span, v));
      setZoom((z) => ({ ...z, windowYears: w }));
    },
    [setZoom, yearBounds.maxYear, yearBounds.minYear]
  );

  const zoomRange = useMemo(() => {
    const span = Math.max(1, yearBounds.maxYear - yearBounds.minYear + 1);
    const w = Math.max(1, Math.min(span, zoom.windowYears));
    const left = Math.floor(w / 2);
    const right = Math.ceil(w / 2) - 1;
    const start = zoom.centerYear - left;
    const end = zoom.centerYear + right;
    return { start, end };
  }, [yearBounds.maxYear, yearBounds.minYear, zoom.centerYear, zoom.windowYears]);

  const baseParams = useMemo(() => {
    const base = new URLSearchParams();
    base.set("stations", stationsParam);
    base.set("start_year", String(zoomRange.start));
    base.set("end_year", String(zoomRange.end));
    return base;
  }, [stationsParam, zoomRange.start, zoomRange.end]);

  const baseKey = useMemo(() => baseParams.toString(), [baseParams]);
  const targetKey = useMemo(() => `${baseKey}|${mode}|${includeStd ? "std1" : "std0"}`, [baseKey, mode, includeStd]);

  const fetchSummary = useCallback(async () => {
    return await getJson<AnalyticsSummary>(`/api/analytics/summary?${baseParams.toString()}`, {
      requestKey: "analyticsSummary"
    });
  }, [baseParams]);

  const fetchMonthly = useCallback(async () => {
    return await getJson<MonthlyResponse>(`/api/data/monthly?${baseParams.toString()}`, { requestKey: "monthlyData" });
  }, [baseParams]);

  const fetchAnnual = useCallback(
    async (std: boolean) => {
      const annualParams = new URLSearchParams(baseParams);
      annualParams.set("include_std", std ? "true" : "false");
      return await getJson<AnnualResponse>(`/api/data/annual?${annualParams.toString()}`, { requestKey: "annualData" });
    },
    [baseParams]
  );

  const loadCurrent = useCallback(async () => {
    if (!selected.length) return;
    setError(null);
    setLoading(true);
    try {
      const [s, data] = await Promise.all([
        fetchSummary(),
        mode === "monthly" ? fetchMonthly() : fetchAnnual(includeStd)
      ]);
      setSummary(s);
      if (mode === "monthly") {
        setMonthly(data as MonthlyResponse);
        setAnnual(null);
      } else {
        setAnnual(data as AnnualResponse);
        setMonthly(null);
      }
      setLastLoadedKey(targetKey);
    } catch (e) {
      setError(userFriendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [fetchAnnual, fetchMonthly, fetchSummary, includeStd, mode, selected.length, targetKey]);

  const switchMode = useCallback(
    async (nextMode: "monthly" | "annual") => {
      if (nextMode === mode) return;
      if (!selected.length) {
        setMode(nextMode);
        return;
      }

      setError(null);
      setLoading(true);
      try {
        const [s, data] = await Promise.all([
          fetchSummary(),
          nextMode === "monthly" ? fetchMonthly() : fetchAnnual(includeStd)
        ]);
        setSummary(s);
        if (nextMode === "monthly") setMonthly(data as MonthlyResponse);
        else setAnnual(data as AnnualResponse);
        setLastLoadedKey(`${baseKey}|${nextMode}|${includeStd ? "std1" : "std0"}`);
        setMode(nextMode);
      } catch (e) {
        setError(userFriendlyError(e));
      } finally {
        setLoading(false);
      }
    },
    [
      baseKey,
      fetchAnnual,
      fetchMonthly,
      fetchSummary,
      includeStd,
      mode,
      selected.length,
    ]
  );

  const toggleStd = useCallback(
    async (next: boolean) => {
      if (next === includeStd) return;
      if (mode !== "annual") {
        setIncludeStd(next);
        return;
      }
      if (!selected.length) {
        setIncludeStd(next);
        return;
      }

      setError(null);
      setLoading(true);
      try {
        const [s, a] = await Promise.all([fetchSummary(), fetchAnnual(next)]);
        setSummary(s);
        setAnnual(a);
        setIncludeStd(next);
        setLastLoadedKey(`${baseKey}|annual|${next ? "std1" : "std0"}`);
      } catch (e) {
        setError(userFriendlyError(e));
      } finally {
        setLoading(false);
      }
    },
    [baseKey, fetchAnnual, fetchSummary, includeStd, mode, selected.length]
  );

  useEffect(() => {
    if (!selected.length) {
      setSummary(null);
      setMonthly(null);
      setAnnual(null);
      setLastLoadedKey(null);
      return;
    }
    if (loading) return;
    if (lastLoadedKey === targetKey) return;
    void loadCurrent();
  }, [lastLoadedKey, loadCurrent, loading, selected.length, targetKey]);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Temperature Trends</h1>
          <p className="muted">Explore historical monthly + annual temperature data across stations.</p>
        </div>
        <a className="link" href="/api/docs" target="_blank" rel="noreferrer">
          API Docs
        </a>
      </header>

      {error && (
        <div className="banner bannerError" role="alert">
          {error}
        </div>
      )}

      <div className="layout">
        <div className="left">
          <StationPicker
            stations={stations}
            selected={selected}
            setSelected={setSelected}
            filter={stationsFilter}
            setFilter={setStationsFilter}
          />

          <div className="card">
            <div className="cardHeader">
              <h2>Visualization Mode</h2>
            </div>

            <div className="segmented">
              <button
                type="button"
                disabled={loading}
                className={mode === "monthly" ? "segmentedActive" : ""}
                onClick={() => void switchMode("monthly")}
              >
                Monthly
              </button>
              <button
                type="button"
                disabled={loading}
                className={mode === "annual" ? "segmentedActive" : ""}
                onClick={() => void switchMode("annual")}
              >
                Annual
              </button>
            </div>

            <div className="actions">
              <div className="muted small">{selected.length ? "" : "Select stations"}</div>
            </div>
          </div>

          <ZoomControls
            centerYear={zoom.centerYear}
            setCenterYear={(v) => setZoom((z) => ({ ...z, centerYear: v }))}
            windowYears={zoom.windowYears}
            setWindowYears={setWindowYearsClamped}
            minYear={yearBounds.minYear}
            maxYear={yearBounds.maxYear}
            reset={() => {
              const minY = yearBounds.minYear;
              const maxY = yearBounds.maxYear;
              setZoom({
                windowYears: maxY - minY + 1,
                centerYear: Math.round((minY + maxY) / 2)
              });
            }}
          />
        </div>

        <div className="right">
          <Visualization
            mode={mode}
            monthly={monthly}
            annual={annual}
            includeStd={includeStd}
            zoomStartYear={zoomRange.start}
            zoomEndYear={zoomRange.end}
            uiRevision={`${stationsParam}|${zoomRange.start}-${zoomRange.end}`}
            onZoomYearsChange={({ enabled, startYear, endYear }) => {
              if (!enabled) {
                const minY = yearBounds.minYear;
                const maxY = yearBounds.maxYear;
                setZoom({
                  windowYears: maxY - minY + 1,
                  centerYear: Math.round((minY + maxY) / 2)
                });
                return;
              }

              const start = Math.min(startYear, endYear);
              const end = Math.max(startYear, endYear);
              const span = Math.max(1, yearBounds.maxYear - yearBounds.minYear + 1);
              const nextWindow = Math.max(1, Math.min(span, end - start + 1));
              const nextCenter = Math.round((start + end) / 2);
              setZoom({ windowYears: nextWindow, centerYear: nextCenter });
            }}
            onIncludeStdChange={(next) => void toggleStd(next)}
            loading={loading}
            colorMap={stationColorMap}
          />

          <AnalyticsCard summary={summary} />
        </div>
      </div>
    </div>
  );
}
