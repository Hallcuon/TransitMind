import React from 'react';
import { Link } from 'react-router-dom';
import UTCClock from '../components/UTCClock';
import { useI18n } from '../i18n/I18nContext';
import './Home.css';

const FEATURE_ORDER = ['map', 'focus', 'solo'];

const Home = () => {
  const { t } = useI18n();

  const scrollTo = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="home-page home-page--minimal">
      <div className="home-ambient" aria-hidden="true">
        <span className="home-ambient__blob home-ambient__blob--a" />
        <span className="home-ambient__blob home-ambient__blob--b" />
        <span className="home-ambient__mesh home-ambient__mesh--soft" aria-hidden="true" />
      </div>

      <section className="hero hero--tight">
        <div className="hero-grid hero-grid--minimal">
          <div className="hero-copy">
            <p className="hero-eyebrow">{t('home.heroEyebrow')}</p>
            <h1 className="hero-title">
              <span className="hero-brand">{t('home.title')}</span>
            </h1>
            <p className="tagline tagline--compact">{t('home.tagline')}</p>
            <p className="hero-micro hero-micro--compact">{t('home.heroMicro')}</p>
            <div className="hero-buttons">
              <Link to="/routes" className="btn btn-primary">
                {t('home.startJourney')}
              </Link>
              <a href="#features" className="btn btn-ghost" onClick={scrollTo('features')}>
                {t('home.exploreFeatures')}
              </a>
            </div>
          </div>

          <aside className="hero-aside hero-aside--minimal">
            <div className="hero-clock-card hero-clock-card--compact">
              <UTCClock showDate={true} showSeconds={false} />
            </div>
          </aside>
        </div>
      </section>

      <section id="features" className="home-strip section-block">
        <header className="home-strip-head">
          <p className="section-eyebrow">{t('home.featuresEyebrow')}</p>
          <h2 className="home-strip-title">{t('home.featuresTitle')}</h2>
        </header>
        <div className="home-strip-grid">
          {FEATURE_ORDER.map((id) => (
            <article key={id} className={`home-compact-card home-compact-card--${id}`}>
              <span className="home-compact-tag">{t(`home.feat_${id}_tag`)}</span>
              <h3 className="home-compact-heading">{t(`home.feat_${id}_title`)}</h3>
              <p className="home-compact-body">{t(`home.feat_${id}_desc`)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-cta-bar section-block">
        <p className="home-cta-bar-text">{t('home.ctaDesc')}</p>
        <Link to="/routes" className="btn btn-primary btn-large">
          {t('home.ctaButton')}
        </Link>
      </section>
    </div>
  );
};

export default Home;
