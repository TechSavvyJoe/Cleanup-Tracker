import React from 'react';

const SkeletonBlock = ({ className = '', compact }) => (
  <div className={`skeleton-block ${compact ? 'compact' : ''} ${className}`.trim()} aria-hidden="true" />
);

export default SkeletonBlock;
