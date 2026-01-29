import { useMemo } from "react";

type Props = {
  stations: string[];
  selected: string[];
  setSelected: (next: string[]) => void;
  filter: string;
  setFilter: (next: string) => void;
};

export default function StationPicker({ stations, selected, setSelected, filter, setFilter }: Props) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter((s) => s.toLowerCase().includes(q));
  }, [stations, filter]);

  return (
    <div className="card">
      <div className="cardHeader">
        <h2>Stations</h2>
        <div className="pill">{selected.length} selected</div>
      </div>

      <div className="field">
        <span>Search</span>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Type to filter…" />
      </div>

      <div className="actions">
        <button type="button" onClick={() => setSelected(stations)} disabled={!stations.length}>
          Select all
        </button>
        <button type="button" onClick={() => setSelected([])} disabled={!selected.length}>
          Clear
        </button>
      </div>

      <div className="stationList" role="list">
        {filtered.map((s) => (
          <button
            key={s}
            type="button"
            className={`stationBtn ${selectedSet.has(s) ? "stationBtnOn" : "stationBtnOff"}`}
            aria-pressed={selectedSet.has(s)}
            onClick={() => {
              if (selectedSet.has(s)) setSelected(selected.filter((x) => x !== s));
              else setSelected([...selected, s]);
            }}
          >
            <span className="stationLabel">{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
