// 📊 Advanced Data Visualization Components
// Interactive charts and graphs for enterprise analytics

import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from './PremiumUI';

/**
 * PERFORMANCE CHART
 * Real-time line chart with smooth animations
 */
export const PerformanceChart = ({ data = [], height = 300, title, showGrid = true, color = '#3b82f6' }) => {
  const canvasRef = useRef(null);
  const [hoveredPoint] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size accounting for device pixel ratio
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const padding = 40;
    const width = rect.width;
    const chartHeight = height - padding * 2;
    
    // Calculate min and max values
    const values = data.map(d => d.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
      }
    }

    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    data.forEach((point, index) => {
      const x = padding + (width - padding * 2) * (index / (data.length - 1));
      const normalizedValue = (point.value - minValue) / (range || 1);
      const y = height - padding - chartHeight * normalizedValue;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, `${color}40`);
    gradient.addColorStop(1, `${color}00`);
    ctx.fillStyle = gradient;
    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fill();

    // Draw points
    data.forEach((point, index) => {
      const x = padding + (width - padding * 2) * (index / (data.length - 1));
      const normalizedValue = (point.value - minValue) / (range || 1);
      const y = height - padding - chartHeight * normalizedValue;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw axes labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 5; i++) {
      const value = maxValue - (range / 5) * i;
      const y = padding + (chartHeight / 5) * i;
      ctx.fillText(Math.round(value).toString(), padding - 10, y + 4);
    }

  }, [data, height, showGrid, color]);

  return (
    <GlassCard className="p-6">
      {title && <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>}
      <div className="relative">
        <canvas 
          ref={canvasRef}
          style={{ width: '100%', height: `${height}px` }}
          className="rounded-lg"
        />
        {hoveredPoint && (
          <div className="absolute bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none">
            <div className="font-semibold">{hoveredPoint.label}</div>
            <div>{hoveredPoint.value}</div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

/**
 * BAR CHART
 * Animated horizontal/vertical bar chart
 */
export const BarChart = ({ data = [], height = 300, horizontal = false, color = '#3b82f6', showValues = true }) => {
  const [animatedData, setAnimatedData] = useState(data.map(d => ({ ...d, animValue: 0 })));

  useEffect(() => {
    // Animate bars
    const timer = setTimeout(() => {
      setAnimatedData(data.map(d => ({ ...d, animValue: d.value })));
    }, 100);
    return () => clearTimeout(timer);
  }, [data]);

  const maxValue = Math.max(...data.map(d => d.value));

  if (horizontal) {
    return (
      <GlassCard className="p-6">
        <div className="space-y-4">
          {animatedData.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                {showValues && <span className="text-gray-500 dark:text-gray-400">{item.value}</span>}
              </div>
              <div className="relative h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 rounded-lg transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${(item.animValue / maxValue) * 100}%`,
                    backgroundColor: item.color || color
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-end justify-around space-x-2" style={{ height: `${height}px` }}>
        {animatedData.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center justify-end space-y-2">
            <div className="relative w-full flex items-end justify-center" style={{ height: `${height - 40}px` }}>
              {showValues && (
                <span className="absolute -top-6 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {item.value}
                </span>
              )}
              <div 
                className="w-full rounded-t-lg transition-all duration-1000 ease-out"
                style={{ 
                  height: `${(item.animValue / maxValue) * 100}%`,
                  backgroundColor: item.color || color
                }}
              />
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 text-center truncate w-full">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

/**
 * DONUT CHART
 * Animated donut/pie chart with segments
 */
export const DonutChart = ({ data = [], size = 200, thickness = 40, centerText, centerSubtext }) => {
  const [animatedData, setAnimatedData] = useState(data.map(d => ({ ...d, animValue: 0 })));
  const total = data.reduce((sum, item) => sum + item.value, 0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedData(data.map(d => ({ ...d, animValue: d.value })));
    }, 100);
    return () => clearTimeout(timer);
  }, [data]);

  const svgSize = size;
  const center = svgSize / 2;
  const radius = (svgSize - thickness) / 2;
  const innerRadius = radius - thickness;

  let currentAngle = -90;

  const createArc = (startAngle, endAngle, radius, innerRadius) => {
    const start = polarToCartesian(center, center, radius, endAngle);
    const end = polarToCartesian(center, center, radius, startAngle);
    const innerStart = polarToCartesian(center, center, innerRadius, endAngle);
    const innerEnd = polarToCartesian(center, center, innerRadius, startAngle);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      `M ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`,
      'Z'
    ].join(' ');
  };

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  return (
    <GlassCard className="p-6 flex flex-col items-center">
      <div className="relative">
        <svg width={svgSize} height={svgSize} className="transform -rotate-90">
          {animatedData.map((item, index) => {
            const percentage = (item.animValue / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;
            
            return (
              <path
                key={index}
                d={createArc(startAngle, endAngle, radius, innerRadius)}
                fill={item.color}
                className="transition-all duration-1000 ease-out hover:opacity-80 cursor-pointer"
              />
            );
          })}
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerText && (
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{centerText}</div>
          )}
          {centerSubtext && (
            <div className="text-sm text-gray-500 dark:text-gray-400">{centerSubtext}</div>
          )}
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-6 grid grid-cols-2 gap-3 w-full">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.label}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white ml-auto">
              {Math.round((item.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

/**
 * HEATMAP
 * Activity heatmap calendar view
 */
export const Heatmap = ({ data = [], width = 800, cellSize = 12, monthLabels = true }) => {
  const [hoveredCell, setHoveredCell] = useState(null);

  // Generate grid for the year
  const generateGrid = () => {
    const grid = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364); // Last 52 weeks

    for (let week = 0; week < 52; week++) {
      const weekData = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + week * 7 + day);
        
        const dateStr = date.toISOString().split('T')[0];
        const value = data.find(d => d.date === dateStr)?.value || 0;
        
        weekData.push({ date, value, dateStr });
      }
      grid.push(weekData);
    }
    
    return grid;
  };

  const grid = generateGrid();
  const maxValue = Math.max(...data.map(d => d.value), 1);

  const getColor = (value) => {
    if (value === 0) return '#ebedf0';
    const intensity = Math.min(value / maxValue, 1);
    const hue = 142; // Green
    const saturation = 52;
    const lightness = 90 - intensity * 40;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  return (
    <GlassCard className="p-6">
      <div className="overflow-x-auto">
        <svg width={width} height={cellSize * 7 + 40}>
          {/* Day labels */}
          <g transform={`translate(30, 0)`}>
            {['Mon', 'Wed', 'Fri'].map((day, i) => (
              <text
                key={day}
                x={0}
                y={cellSize * (i * 2 + 1) + cellSize / 2}
                className="text-xs fill-gray-500 dark:fill-gray-400"
                dominantBaseline="middle"
                textAnchor="end"
              >
                {day}
              </text>
            ))}
          </g>

          {/* Cells */}
          <g transform={`translate(40, 0)`}>
            {grid.map((week, weekIndex) => (
              <g key={weekIndex} transform={`translate(${weekIndex * (cellSize + 2)}, 0)`}>
                {week.map((cell, dayIndex) => (
                  <rect
                    key={dayIndex}
                    x={0}
                    y={dayIndex * (cellSize + 2)}
                    width={cellSize}
                    height={cellSize}
                    rx={2}
                    fill={getColor(cell.value)}
                    className="cursor-pointer transition-all duration-200 hover:stroke-gray-400 hover:stroke-2"
                    onMouseEnter={() => setHoveredCell(cell)}
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                ))}
              </g>
            ))}
          </g>
        </svg>
        
        {/* Tooltip */}
        {hoveredCell && (
          <div className="mt-4 p-3 bg-gray-900 text-white text-sm rounded-lg inline-block">
            <div className="font-semibold">{hoveredCell.date.toLocaleDateString()}</div>
            <div>{hoveredCell.value} contributions</div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

/**
 * SPARKLINE
 * Minimal inline chart for trends
 */
export const Sparkline = ({ data = [], width = 100, height = 30, color = '#3b82f6', showDot = true }) => {
  if (data.length === 0) return null;

  const values = data.map(d => typeof d === 'number' ? d : d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values.map((value, index) => {
    const x = (width / (values.length - 1)) * index;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const lastValue = values[values.length - 1];
  const lastX = width;
  const lastY = height - ((lastValue - min) / range) * height;

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDot && (
        <circle
          cx={lastX}
          cy={lastY}
          r="3"
          fill={color}
        />
      )}
    </svg>
  );
};

const DataVisualization = {
  PerformanceChart,
  BarChart,
  DonutChart,
  Heatmap,
  Sparkline
};

export default DataVisualization;
