import React, { useState } from 'react';

const SimpleLineChart = ({ data, xKey, yKey, color = '#2196f3', height = 200 }) => {
    const [hoverPoint, setHoverPoint] = useState(null);

    if (!data || data.length === 0) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>No data</div>;

    const maxValue = Math.max(...data.map(d => Number(d[yKey]) || 0));
    const padding = 20;
    const chartHeight = height - padding * 2;

    // Generate Plot Points
    const points = data.map((d, i) => {
        const value = Number(d[yKey]) || 0;
        const x = (i / (data.length - 1)) * 100; // Percentage
        const y = maxValue === 0 ? height - padding : height - padding - ((value / maxValue) * chartHeight);
        return { x, y, value, label: d[xKey] };
    });

    // Create Path String
    const pathD = points.length > 1
        ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
        : `M 0 ${height - padding} L 100 ${height - padding}`;

    // Create Area Fill String
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return (
        <div style={{ position: 'relative', height: height, width: '100%' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                <svg width="100%" height="100%" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
                    {/* Note: viewBox width is 100 (for percentage-like coords) but height is fixed pixels. 
                      Actually mixing units in viewBox is tricky if aspect ratio isn't handled.
                      Let's stick to percentage for X and pixels for Y? 
                      SVG viewBox doesn't work that way.
                      
                      BETTER APPROACH: Use 0-100 coordinates for everything and scale Y in mapping.
                  */}
                </svg>
            </div>

            {/* Re-implementing with 100x100 coord system for simplicity */}
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                    <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Area under curve */}
                <path
                    d={`
                        M 0 ${100 - (points[0].value / maxValue * 80)} 
                        ${points.map((p, i) => `L ${(i / (points.length - 1)) * 100} ${100 - (p.value / maxValue * 80)}`).join(' ')} 
                        L 100 100 L 0 100 Z
                    `}
                    fill={`url(#gradient-${color})`}
                    stroke="none"
                />

                {/* Line */}
                <path
                    d={`
                        M 0 ${100 - (points[0].value / maxValue * 80)} 
                        ${points.map((p, i) => `L ${(i / (points.length - 1)) * 100} ${100 - (p.value / maxValue * 80)}`).join(' ')}
                    `}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                />

                {/* Points */}
                {points.map((p, i) => (
                    <circle
                        key={i}
                        cx={`${(i / (points.length - 1)) * 100}`}
                        cy={`${100 - (p.value / maxValue * 80)}`}
                        r="3"
                        fill="#fff"
                        stroke={color}
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                        onMouseEnter={() => setHoverPoint(i)}
                        onMouseLeave={() => setHoverPoint(null)}
                    />
                ))}
            </svg>

            {/* Hover Tooltip */}
            {hoverPoint !== null && (
                <div style={{
                    position: 'absolute',
                    left: `${(hoverPoint / (points.length - 1)) * 100}%`,
                    top: `${100 - (points[hoverPoint].value / maxValue * 80)}%`, // Approximate
                    transform: 'translate(-50%, -150%)',
                    background: 'rgba(0,0,0,0.8)',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    zIndex: 10
                }}>
                    <strong>{points[hoverPoint].label}</strong>: {points[hoverPoint].value}
                </div>
            )}

            {/* X Labels (First and Last only to avoid clutter) */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, fontSize: '10px', color: '#666' }}>{data[0][xKey]}</div>
            <div style={{ position: 'absolute', bottom: 0, right: 0, fontSize: '10px', color: '#666' }}>{data[data.length - 1][xKey]}</div>
        </div>
    );
};

export default SimpleLineChart;
