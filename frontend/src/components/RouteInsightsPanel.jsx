import RouteInsightsChart from './RouteInsightsChart';
import TrafficTimeCompare from './TrafficTimeCompare';
import CongestionPeriodChart from './CongestionPeriodChart';
import './RouteInsightsPanel.css';

function paceBadgeClass(level) {
  if (level === 'light') return 'route-insights-pill route-insights-pill--ok';
  if (level === 'heavy') return 'route-insights-pill route-insights-pill--warn';
  return 'route-insights-pill route-insights-pill--mid';
}

function paceLabel(t, level) {
  if (level === 'light') return t('routes.paceLight');
  if (level === 'heavy') return t('routes.paceHeavy');
  if (level === 'moderate') return t('routes.paceModerate');
  return t('routes.paceUnknown');
}

export default function RouteInsightsPanel({
  t,
  enrichmentLoading,
  enrichmentError,
  enrichment,
  routeSummary,
}) {
  const weather = enrichment?.weatherAlongRoute || [];
  const pace = enrichment?.routePace;
  const sources = enrichment?.sources;
  const liveTraffic = enrichment?.liveTraffic;
  const congestion = enrichment?.congestionByDeparture;

  const labels = weather.map((p) => p.label || '');
  const temps = weather.map((p) => p.weather?.temperature ?? null);

  return (
    <aside className="route-insights" aria-label={t('routes.insightsAria')}>
      <header className="route-insights-head">
        <h2 className="route-insights-title">{t('routes.insightsTitle')}</h2>
        <p className="route-insights-lead">{t('routes.insightsLead')}</p>
      </header>

      {!routeSummary && (
        <div className="route-insights-empty">
          <p>{t('routes.insightsPlaceholder')}</p>
        </div>
      )}

      {routeSummary && (
        <div className="route-insights-summary">
          <div className="route-insights-metric">
            <span className="route-insights-metric-label">{t('routes.insightsDistance')}</span>
            <span className="route-insights-metric-value">
              {routeSummary.distanceKm != null ? `${routeSummary.distanceKm} km` : '—'}
            </span>
          </div>
          <div className="route-insights-metric">
            <span className="route-insights-metric-label">{t('routes.insightsDuration')}</span>
            <span className="route-insights-metric-value">
              {routeSummary.timeMin != null ? `${Math.round(routeSummary.timeMin)} min` : '—'}
            </span>
          </div>
        </div>
      )}

      {enrichmentLoading && (
        <div className="route-insights-loading">{t('routes.insightsLoading')}</div>
      )}

      {enrichmentError && <div className="route-insights-error">{enrichmentError}</div>}

      {!enrichmentLoading && enrichment && (
        <>
          <section className="route-insights-section route-insights-section--traffic">
            <h3 className="route-insights-h3">{t('routes.liveTrafficTitle')}</h3>
            {liveTraffic?.available ? (
              <>
                <p className="route-insights-subline">{t('routes.liveTrafficSubtitle')}</p>
                <TrafficTimeCompare t={t} live={liveTraffic} />
              </>
            ) : liveTraffic?.error ? (
              <div className="route-insights-pace">
                <div className="route-insights-error route-insights-error--soft">{liveTraffic.error}</div>
                {liveTraffic.setupHint && (
                  <p className="route-insights-source">{liveTraffic.setupHint}</p>
                )}
              </div>
            ) : (
              <div className="route-insights-pace">
                <p className="route-insights-pace-note">{t('routes.liveTrafficNoKey')}</p>
                {liveTraffic?.setupHint && (
                  <p className="route-insights-source">{liveTraffic.setupHint}</p>
                )}
              </div>
            )}
          </section>

          {congestion?.available && congestion.slots?.length > 0 && (
            <section className="route-insights-section">
              <h3 className="route-insights-h3">{t('routes.congestionChartTitle')}</h3>
              <p className="route-insights-subline">{t('routes.congestionChartLead')}</p>
              <CongestionPeriodChart t={t} congestion={congestion} />
            </section>
          )}
          {congestion?.available === false && congestion?.error && (
            <div className="route-insights-error route-insights-error--soft">{congestion.error}</div>
          )}

          {pace && (
            <section className="route-insights-section">
              <h3 className="route-insights-h3">{t('routes.insightsRoadLoad')}</h3>
              <div className="route-insights-pace">
                <span className={paceBadgeClass(pace.loadLevel)}>{paceLabel(t, pace.loadLevel)}</span>
                {pace.avgSpeedKmh != null && (
                  <p className="route-insights-pace-speed">
                    ~{pace.avgSpeedKmh} km/h {t('routes.insightsAvgSpeed')}
                  </p>
                )}
                <p className="route-insights-pace-note">{pace.paceNote}</p>
                <p className="route-insights-source">{t('routes.insightsPaceDisclaimer')}</p>
                <p className="route-insights-source">{t('routes.insightsTrafficExplain')}</p>
              </div>
            </section>
          )}

          {weather.length > 0 && (
            <>
              <section className="route-insights-section">
                <h3 className="route-insights-h3">{t('routes.insightsWeather')}</h3>
                <ul className="route-insights-weather-list">
                  {weather.map((pt, idx) => (
                    <li key={`${pt.label}-${idx}`} className="route-insights-weather-card">
                      <div className="route-insights-weather-top">
                        <span className="route-insights-weather-label">{pt.label}</span>
                        <span className="route-insights-weather-temp">
                          {pt.weather?.temperature != null ? `${Math.round(pt.weather.temperature)}°C` : '—'}
                        </span>
                      </div>
                      <div className="route-insights-weather-meta">
                        <span>{pt.weather?.description || ''}</span>
                        {pt.weather?.cloudCoverPct != null && (
                          <span>
                            {t('routes.insightsCloud')}: {Math.round(pt.weather.cloudCoverPct)}%
                          </span>
                        )}
                        {pt.weather?.precipitationMm != null && pt.weather.precipitationMm > 0 && (
                          <span>
                            {t('routes.insightsPrecip')}: {pt.weather.precipitationMm} mm
                          </span>
                        )}
                      </div>
                      <div className="route-insights-weather-foot">
                        <span>💨 {pt.weather?.windSpeed ?? '—'} km/h</span>
                        <span>💧 {pt.weather?.humidity ?? '—'}%</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="route-insights-section">
                <h3 className="route-insights-h3">{t('routes.insightsTempChart')}</h3>
                <RouteInsightsChart labels={labels} temperatures={temps} />
              </section>
            </>
          )}
        </>
      )}

      {!enrichmentLoading && enrichment && sources && (
        <footer className="route-insights-footer">
          <span>
            {t('routes.insightsSources')}: Open-Meteo · {t('routes.insightsPaceFooter')}
            {liveTraffic?.available ? ` · ${t('routes.insightsFooterTomTom')}` : ''}
          </span>
        </footer>
      )}
    </aside>
  );
}
