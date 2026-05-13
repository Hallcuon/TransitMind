import './CongestionPeriodChart.css';

function periodTitle(t, period) {
  const key = `routes.congestPeriod_${period}`;
  return t(key);
}

export default function CongestionPeriodChart({ t, congestion }) {
  const slots = congestion?.slots || [];
  const peakIdx = congestion?.peakSlotIndex ?? -1;

  const minutes = slots.map((s) =>
    s.travelTimeSeconds != null && Number.isFinite(s.travelTimeSeconds)
      ? s.travelTimeSeconds / 60
      : null
  );
  const valid = minutes.filter((m) => m != null);
  const maxMin = valid.length ? Math.max(...valid, 5) : 5;

  const W = 280;
  const H = 132;
  const pad = { l: 32, r: 10, t: 14, b: 36 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;
  const n = Math.max(slots.length, 1);
  const gap = 6;
  const barW = n ? (chartW - gap * (n - 1)) / n : chartW;

  const barRects = slots.map((s, i) => {
    const m = minutes[i];
    const h = m != null ? (m / maxMin) * chartH : 0;
    const x = pad.l + i * (barW + gap);
    const y = pad.t + chartH - h;
    const isPeak = i === peakIdx && m != null;
    return { x, y, w: barW, h, isPeak, m, label: s.localTimeLabel, period: s.period };
  });

  const linePoints = slots
    .map((s, i) => {
      const m = minutes[i];
      if (m == null) return null;
      const x = pad.l + i * (barW + gap) + barW / 2;
      const y = pad.t + chartH - (m / maxMin) * chartH;
      return { x, y };
    })
    .filter(Boolean);

  const pathD =
    linePoints.length >= 2
      ? linePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
      : '';

  const peakSlot = peakIdx >= 0 ? slots[peakIdx] : null;

  return (
    <div className="congestion-chart">
      <svg
        className="congestion-chart__svg"
        viewBox={`0 0 ${W} ${H}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect x={pad.l} y={pad.t} width={chartW} height={chartH} className="congestion-chart__grid-bg" rx="4" />
        {barRects.map((b, i) => (
          <g key={`${b.label}-${i}`}>
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={Math.max(b.h, b.m != null ? 2 : 0)}
              className={`congestion-chart__bar ${b.isPeak ? 'congestion-chart__bar--peak' : ''}`}
              rx="3"
            />
            <text x={b.x + b.w / 2} y={H - 10} textAnchor="middle" className="congestion-chart__tick">
              {b.label}
            </text>
            {b.m != null && (
              <text x={b.x + b.w / 2} y={b.y - 4} textAnchor="middle" className="congestion-chart__val">
                {Math.round(b.m)}
              </text>
            )}
          </g>
        ))}
        {pathD && (
          <path d={pathD} className="congestion-chart__line" fill="none" strokeWidth="2" strokeLinecap="round" />
        )}
        {linePoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" className="congestion-chart__dot" />
        ))}
      </svg>

      <ul className="congestion-chart__legend">
        {slots.map((s, i) => (
          <li key={`${s.period}-${i}`}>
            <span className="congestion-chart__legend-time">{s.localTimeLabel}</span>
            <span className="congestion-chart__legend-title">{periodTitle(t, s.period)}</span>
            {minutes[i] != null ? (
              <span className="congestion-chart__legend-min">{Math.round(minutes[i])} min</span>
            ) : (
              <span className="congestion-chart__legend-min">—</span>
            )}
            {i === peakIdx && minutes[i] != null && (
              <span className="congestion-chart__peak-pill">{t('routes.congestPeakShort')}</span>
            )}
          </li>
        ))}
      </ul>

      {peakSlot && minutes[peakIdx] != null && (
        <p className="congestion-chart__peak-note">
          {t('routes.congestPeakSummary')}: {peakSlot.localTimeLabel} ({periodTitle(t, peakSlot.period)}) — ~
          {Math.round(minutes[peakIdx])} min
        </p>
      )}
    </div>
  );
}
