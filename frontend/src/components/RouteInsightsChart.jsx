import './RouteInsightsChart.css';

/**
 * Lightweight SVG sparkline — avoids Chart.js / Vite prebundle MIME issues.
 * @param {{ labels: string[], temperatures: (number|null)[] }} props
 */
export default function RouteInsightsChart({ labels, temperatures }) {
  const pairs = labels.map((label, i) => ({
    label,
    t: temperatures[i],
  })).filter((p) => p.t != null && Number.isFinite(p.t));

  if (pairs.length < 2) {
    return null;
  }

  const vals = pairs.map((p) => p.t);
  const minT = Math.min(...vals);
  const maxT = Math.max(...vals);
  const pad = 8;
  const w = 280;
  const h = 120;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  const span = maxT - minT || 1;
  const points = pairs.map((p, i) => {
    const x = pad + (i / (pairs.length - 1)) * innerW;
    const y = pad + innerH - ((p.t - minT) / span) * innerH;
    return { x, y, label: p.label, temp: p.t };
  });

  const d = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`).join(' ');

  return (
    <div className="route-insights-chart-wrap route-insights-svg-chart">
      <svg viewBox={`0 0 ${w} ${h}`} className="route-insights-svg-chart__svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(52, 211, 153, 0.35)" />
            <stop offset="100%" stopColor="rgba(52, 211, 153, 0)" />
          </linearGradient>
        </defs>
        <path
          d={`${d} L ${points[points.length - 1].x.toFixed(2)} ${h - pad} L ${points[0].x.toFixed(2)} ${h - pad} Z`}
          fill="url(#sparkFill)"
          className="route-insights-svg-chart__area"
        />
        <path d={d} fill="none" stroke="rgba(52, 211, 153, 0.95)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r="3.5" fill="#34d399" stroke="#0f172a" strokeWidth="1" />
        ))}
      </svg>
      <div className="route-insights-svg-chart__labels">
        {points.map((pt, i) => (
          <span key={i} title={`${pt.label}: ${Math.round(pt.temp)}°C`}>
            {pt.label}
          </span>
        ))}
      </div>
    </div>
  );
}
