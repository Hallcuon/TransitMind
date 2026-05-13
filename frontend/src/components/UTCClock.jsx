import React, { useState, useEffect } from 'react';
import './UTCClock.css';

const UTCClock = ({ showDate = true, showSeconds = true }) => {
  const [utcTime, setUtcTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatUTCTime = () => {
    return utcTime.toLocaleString('en-US', {
      timeZone: 'UTC',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
    });
  };

  const formatTimeOnly = () => {
    return utcTime.toLocaleString('en-US', {
      timeZone: 'UTC',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
    });
  };

  return (
    <div className="utc-clock">
      <div className="clock-icon">🌍</div>
      <div className="clock-content">
        <div className="clock-label">UTC Time</div>
        {showDate ? (
          <div className="clock-time">{formatUTCTime()}</div>
        ) : (
          <div className="clock-time-only">{formatTimeOnly()}</div>
        )}
      </div>
    </div>
  );
};

export default UTCClock;
