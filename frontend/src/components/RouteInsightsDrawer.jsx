import './RouteInsightsPanel.css';

export default function RouteInsightsDrawer({ open, onOpenChange, drawerId, t, children }) {
  return (
    <div className="route-insights-shell" aria-hidden={!open}>
      {open && (
        <button
          type="button"
          className="route-insights-backdrop"
          aria-label={t('routes.insightsBackdropAria')}
          onClick={() => onOpenChange(false)}
        />
      )}
      <div className={`route-insights-drawer ${open ? 'route-insights-drawer--open' : ''}`} id={drawerId}>
        {children}
      </div>
      <button
        type="button"
        className={`route-insights-tab ${open ? 'route-insights-tab--open' : ''}`}
        aria-expanded={open}
        aria-controls={drawerId}
        onClick={() => onOpenChange((prev) => !prev)}
      >
        <span className="route-insights-tab-icon" aria-hidden>
          {open ? '◀' : '▶'}
        </span>
        <span>{open ? t('routes.insightsToggleHide') : t('routes.insightsToggleShow')}</span>
      </button>
    </div>
  );
}
