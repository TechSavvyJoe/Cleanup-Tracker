import React from 'react';

const TrendIcon = ({ direction }) => {
  if (!direction || direction === 'neutral') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (direction === 'up') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2 7.5 6 3.5l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 4v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2 4.5 6 8.5l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 8V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

const MetricCard = ({
  title,
  value,
  description,
  icon,
  meta,
  trend
}) => {
  const trendDirection = trend?.direction || 'neutral';
  const trendValue = trend?.value;

  return (
    <div className="metric-card">
      <div className="metric-card__header">
        <div className="metric-card__icon">{icon}</div>
        <div className="metric-card__title">
          <span>{title}</span>
          {description && <p>{description}</p>}
        </div>
      </div>
      <div className="metric-card__value">
        <span>{value}</span>
        {meta && <small>{meta}</small>}
      </div>
      {trendValue != null && (
        <div className={`metric-card__trend metric-card__trend--${trendDirection}`}>
          <TrendIcon direction={trendDirection} />
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
