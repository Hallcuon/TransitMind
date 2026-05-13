import './TrafficTimeCompare.css';

function minutesLabel(sec) {
  if (sec == null || !Number.isFinite(sec)) return '—';
  return `${Math.round(sec / 60)}`;
}

export default function TrafficTimeCompare({ t, live }) {
  if (!live?.available) return null;

  const rows = [
    { key: 'free', label: t('routes.trafficFreeFlow'), sec: live.noTrafficTravelTimeInSeconds },
    { key: 'hist', label: t('routes.trafficHistoric'), sec: live.historicTrafficTravelTimeInSeconds },
    { key: 'live', label: t('routes.trafficLive'), sec: live.liveTrafficIncidentsTravelTimeInSeconds },
  ].filter((r) => r.sec != null && Number.isFinite(r.sec));

  const maxSec = rows.length ? Math.max(...rows.map((r) => r.sec), 1) : 1;

  return (
    <div className="traffic-time-compare">
      {live.trafficDelayMinutes != null && (
        <p className="traffic-time-compare__delay">
          {t('routes.trafficDelayApprox')}: ~{live.trafficDelayMinutes} {t('routes.trafficMinSuffix')}
        </p>
      )}
      {rows.length === 0 && live.travelTimeInSeconds != null && (
        <p className="traffic-time-compare__fallback">
          {t('routes.trafficTotalTime')}: {minutesLabel(live.travelTimeInSeconds)} {t('routes.trafficMinShort')}
        </p>
      )}
      {rows.length > 0 && (
        <div className="traffic-time-compare__bars" role="img" aria-label={t('routes.trafficBarsAria')}>
          {rows.map((r) => (
            <div key={r.key} className="traffic-time-compare__row">
              <span className="traffic-time-compare__label">{r.label}</span>
              <div className="traffic-time-compare__track">
                <div
                  className={`traffic-time-compare__fill traffic-time-compare__fill--${r.key}`}
                  style={{ width: `${Math.min(100, (r.sec / maxSec) * 100)}%` }}
                />
              </div>
              <span className="traffic-time-compare__val">
                {minutesLabel(r.sec)} {t('routes.trafficMinShort')}
              </span>
            </div>
          ))}
        </div>
      )}
      {live.note && <p className="traffic-time-compare__note">{live.note}</p>}
    </div>
  );
}
