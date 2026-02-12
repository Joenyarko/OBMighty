import React, { useState } from 'react';

const SimpleBarChart = ({ data, xKey, yKey, color = '#4caf50', height = 200 }) => {
    const [hoverIndex, setHoverIndex] = useState(null);

    if (!data || data.length === 0) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>No data</div>;

    const maxValue = Math.max(...data.map(d => Number(d[yKey]) || 0));
    const padding = 20;
    const chartHeight = height - padding * 2;
    const barWidth = 100 / data.length;
    const barGap = 20; // percent of bar width

    return (
        <div style={{ position: 'relative', height: height, width: '100%' }}>
            <svg width="100%" height="100%" preserveAspectRatio="none">
                {/* Y-axis grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
                    <line
                        key={i}
                        x1="0"
                        y1={height - padding - (tick * chartHeight)}
                        x2="100%"
                        y2={height - padding - (tick * chartHeight)}
                        stroke="#e0e0e0"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                    />
                ))}

                {/* Bars */}
                {data.map((d, i) => {
                    const value = Number(d[yKey]) || 0;
                    const barHeight = maxValue === 0 ? 0 : (value / maxValue) * chartHeight;
                    const x = (i * (100 / data.length));
                    const effectiveBarWidth = (100 / data.length) * 0.7; // 70% width
                    const offset = (100 / data.length) * 0.15; // Centering

                    return (
                        <g key={i} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
                            <rect
                                x={`${x + offset}%`}
                                y={height - padding - barHeight}
                                width={`${effectiveBarWidth}%`}
                                height={barHeight}
                                fill={color}
                                rx="4"
                                opacity={hoverIndex === i ? 0.8 : 1}
                                style={{ transition: 'all 0.3s ease' }}
                            />
                            {/* Value Label on hover or if space permits */}
                            {hoverIndex === i && (
                                <text
                                    x={`${x + offset + effectiveBarWidth / 2}%`}
                                    y={height - padding - barHeight - 5}
                                    textAnchor="middle"
                                    fill="#333"
                                    fontSize="12"
                                    fontWeight="bold"
                                >
                                    {value}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* X Axis Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: `0 ${100 / data.length * 0.15}%`, marginTop: '-15px' }}>
                {data.map((d, i) => (
                    <div key={i} style={{ width: `${100 / data.length}%`, textAlign: 'center', fontSize: '10px', color: '#666', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {d[xKey]}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SimpleBarChart;
