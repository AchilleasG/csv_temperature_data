import { AnalyticsSummary } from "../types";

type Props = {
  summary: AnalyticsSummary | null;
};

function fmt(v: number | null) {
  if (v === null) return "—";
  return Number.isFinite(v) ? v.toFixed(3) : "—";
}

export default function AnalyticsCard({ summary }: Props) {
  return (
    <div className="card">
      <div className="cardHeader">
        <h2>Analytics</h2>
      </div>

      {!summary ? (
        <div className="muted">No data loaded yet.</div>
      ) : (
        <div className="statsGrid">
          <div className="stat">
            <div className="label">Count</div>
            <div className="value">{summary.count}</div>
          </div>
          <div className="stat">
            <div className="label">Mean</div>
            <div className="value">{fmt(summary.mean)}</div>
          </div>
          <div className="stat">
            <div className="label">Std</div>
            <div className="value">{fmt(summary.std)}</div>
          </div>
          <div className="stat">
            <div className="label">Min</div>
            <div className="value">{fmt(summary.min)}</div>
          </div>
          <div className="stat">
            <div className="label">Max</div>
            <div className="value">{fmt(summary.max)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

