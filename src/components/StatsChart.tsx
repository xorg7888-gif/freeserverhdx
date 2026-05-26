/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ChartDataPoint {
  date: string;
  count: number;
}

interface ClaimActivityPoint {
  date: string;
  status: string;
  count: number;
}

interface StatsChartProps {
  registrations: ChartDataPoint[];
  claimActivity: ClaimActivityPoint[];
}

export const StatsChart: React.FC<StatsChartProps> = ({ registrations, claimActivity }) => {
  // Compute chart coordinates for registrations line chart
  const maxRegCount = Math.max(...registrations.map(r => r.count), 5);
  const width = 600;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;

  const getCoordinates = () => {
    return registrations.map((pt, i) => {
      const x = paddingX + (i / (registrations.length - 1)) * (width - 2 * paddingX);
      const y = height - paddingY - (pt.count / maxRegCount) * (height - 2 * paddingY);
      return { x, y, ...pt };
    });
  };

  const pts = getCoordinates();
  const linePath = pts.reduce((acc, pt, i) => {
    return acc + (i === 0 ? `M ${pt.x} ${pt.y}` : ` L ${pt.x} ${pt.y}`);
  }, '');

  const areaPath = pts.length > 0 
    ? `${linePath} L ${pts[pts.length - 1].x} ${height - paddingY} L ${pts[0].x} ${height - paddingY} Z`
    : '';

  // Process unique list of dates in claim activity
  const dates = (Array.from(new Set(claimActivity.map(c => c.date))) as string[]).slice(-7);
  const maxClaimDayTotal = Math.max(...dates.map(d => {
    const dayActs = claimActivity.filter(c => c.date === d);
    return dayActs.reduce((acc, curr) => acc + curr.count, 0);
  }), 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="hdx-stats-charts">
      {/* Registrations SVG Performance Chart */}
      <div className="p-6 bg-slate-800 border border-slate-700/60 rounded-xl" id="daily-registrations-chart">
        <h3 className="text-zinc-100 font-medium mb-3 text-sm tracking-wide uppercase text-zinc-300">Daily Registrations (7 Days)</h3>
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
            <defs>
              <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5865F2" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#5865F2" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            
            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = paddingY + ratio * (height - 2 * paddingY);
              const value = Math.round(maxRegCount * (1 - ratio));
              return (
                <g key={idx}>
                  <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#334155" strokeDasharray="3,3" strokeWidth="1" />
                  <text x={paddingX - 10} y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end">{value}</text>
                </g>
              );
            })}

            {/* Glowing Gradient Area */}
            {areaPath && <path d={areaPath} fill="url(#regGrad)" />}

            {/* Main Action Line */}
            {linePath && <path d={linePath} fill="none" stroke="#5865F2" strokeWidth="2.5" strokeLinecap="round" />}

            {/* Chart Dots */}
            {pts.map((pt, i) => (
              <g key={i} className="group cursor-pointer">
                <circle cx={pt.x} cy={pt.y} r="5" fill="#5865F2" stroke="#1e293b" strokeWidth="2" />
                <circle cx={pt.x} cy={pt.y} r="9" fill="#5865F2" opacity="0" className="hover:opacity-40 transition-opacity" />
                
                {/* Tooltip onHover */}
                <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <rect x={pt.x - 30} y={pt.y - 28} width="60" height="20" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                  <text x={pt.x} y={pt.y - 15} fill="#f1f5f9" fontSize="10" textAnchor="middle" fontWeight="bold">
                    {pt.count} Regs
                  </text>
                </g>
              </g>
            ))}

            {/* Date Labels */}
            {pts.map((pt, i) => (
              <text key={i} x={pt.x} y={height - 2} fill="#94a3b8" fontSize="9" textAnchor="middle">
                {pt.date.substring(5)}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {/* Claim Requests Breakdown */}
      <div className="p-6 bg-slate-800 border border-slate-700/60 rounded-xl" id="claim-activity-chart">
        <h3 className="text-zinc-100 font-medium mb-3 text-sm tracking-wide uppercase text-zinc-300">Server Claim Activity</h3>
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = paddingY + ratio * (height - 2 * paddingY);
              const value = Math.round(maxClaimDayTotal * (1 - ratio));
              return (
                <g key={idx}>
                  <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#334155" strokeDasharray="3,3" strokeWidth="1" />
                  <text x={paddingX - 10} y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end">{value}</text>
                </g>
              );
            })}

            {/* Bar charts grouped by day */}
            {dates.map((date, i) => {
              const xPos = paddingX + (i / (dates.length)) * (width - 2 * paddingX) + 12;
              const barWidth = 14;

              // Extract counts
              const approved = claimActivity.find(c => c.date === date && c.status === 'Approved')?.count || 0;
              const rejected = claimActivity.find(c => c.date === date && c.status === 'Rejected')?.count || 0;
              const pending = claimActivity.find(c => c.date === date && c.status === 'Pending')?.count || 0;

              // Stacked Heights
              const hApproved = (approved / maxClaimDayTotal) * (height - 2 * paddingY);
              const hRejected = (rejected / maxClaimDayTotal) * (height - 2 * paddingY);
              const hPending = (pending / maxClaimDayTotal) * (height - 2 * paddingY);

              const yBottom = height - paddingY;
              
              // Approved Segment (Success Secondary Green)
              const yApp = yBottom - hApproved;
              // Pending Segment (Primary Purple)
              const yPen = yApp - hPending;
              // Rejected Segment (Slate Gray/Crimson)
              const yRej = yPen - hRejected;

              return (
                <g key={i}>
                  {hApproved > 0 && (
                    <rect x={xPos} y={yApp} width={barWidth} height={hApproved} fill="#00C896" rx="2" className="hover:opacity-80 cursor-pointer" />
                  )}
                  {hPending > 0 && (
                    <rect x={xPos} y={yPen} width={barWidth} height={hPending} fill="#5865F2" rx="2" className="hover:opacity-80 cursor-pointer" />
                  )}
                  {hRejected > 0 && (
                    <rect x={xPos} y={yRej} width={barWidth} height={hRejected} fill="#ef4444" rx="2" className="hover:opacity-80 cursor-pointer" />
                  )}

                  {/* Legend/Hover tooltip values for this stack */}
                  <g className="group cursor-pointer">
                    <rect x={xPos - 5} y={paddingY} width={barWidth + 10} height={height - 2 * paddingY} opacity="0" fill="white" />
                    
                    {/* Tooltip onHover stack */}
                    <g className="opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                      <rect x={xPos - 45} y={paddingY - 10} width="110" height="52" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                      <text x={xPos + 10} y={paddingY + 3} fill="#00C896" fontSize="9" fontWeight="medium" textAnchor="middle">
                        Approved: {approved}
                      </text>
                      <text x={xPos + 10} y={paddingY + 16} fill="#5865F2" fontSize="9" fontWeight="medium" textAnchor="middle">
                        Pending: {pending}
                      </text>
                      <text x={xPos + 10} y={paddingY + 29} fill="#ef4444" fontSize="9" fontWeight="medium" textAnchor="middle">
                        Rejected: {rejected}
                      </text>
                    </g>
                  </g>

                  {/* Date label */}
                  <text x={xPos + barWidth / 2} y={height - 2} fill="#94a3b8" fontSize="9" textAnchor="middle">
                    {date.substring(5)}
                  </text>
                </g>
              );
            })}
          </svg>
          {/* Chart Colors Legend */}
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="w-2.5 h-2.5 rounded bg-[#00C896]"></span>
              Approved
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="w-2.5 h-2.5 rounded bg-[#5865F2]"></span>
              Pending
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="w-2.5 h-2.5 rounded bg-red-500"></span>
              Rejected
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
