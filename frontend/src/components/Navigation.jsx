import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import './Navigation.css';

const Navigation = ({ isConnected }) => {
  const { t, locale, setLocale } = useI18n();

  return (
    <nav className="navbar navbar-panel">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          <span className="brand-icon">🛫</span>
          <span className="nav-brand-text">TransitMind</span>
        </Link>

        <ul className="nav-menu">
          <li>
            <Link to="/" className="nav-link">
              {t('nav.home')}
            </Link>
          </li>
          <li>
            <Link to="/routes" className="nav-link">
              {t('nav.routes')}
            </Link>
          </li>
        </ul>

        <div className="nav-right">
          <div className="lang-switch" role="group" aria-label={t('nav.language')}>
            <button
              type="button"
              className={`lang-switch-btn ${locale === 'uk' ? 'active' : ''}`}
              onClick={() => setLocale('uk')}
              aria-pressed={locale === 'uk'}
            >
              UA
            </button>
            <button
              type="button"
              className={`lang-switch-btn ${locale === 'en' ? 'active' : ''}`}
              onClick={() => setLocale('en')}
              aria-pressed={locale === 'en'}
            >
              EN
            </button>
          </div>

          <div className="nav-status">
            <span
              className={`status-indicator ${isConnected ? 'connected' : 'offline'}`}
              title={isConnected ? t('nav.backendOk') : t('nav.backendOff')}
            >
              <span className="status-dot" aria-hidden="true" />
              {isConnected ? 'OK' : 'Off'}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
