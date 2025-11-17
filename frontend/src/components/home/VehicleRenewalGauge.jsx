"use client";
 
import React from "react";
 
// Helper: clamp a value into a range
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
 
// Format integers with commas
const formatInt = (n) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
 
/**
 * VehicleRenewalGauge (JSX)
 * - Semicircle gauge (0..180°)
 * - Color segments: Red (0-50%), Yellow (50-80%), Green (80-100%)
 * - Needle points to actual; capped at target end of arc
 * - Card layout included
 * - Responsive: SVG scales with container width
 */
const VehicleRenewalGauge = ({ actual, target, min = 0, title = "Vehicle Renewal" }) => {
  const safeTarget = Math.max(target, min);
  const range = Math.max(1, safeTarget - min); // avoid divide-by-zero
  const ratio = (actual - min) / range;
  const pct = clamp(ratio, 0, 1);
 
  // SVG geometry (logical units; viewBox makes it responsive)
  // Use a fixed logical size; SVG scales to container via CSS
  const width = 320;
  const height = 180;
  const cx = width / 2;
  const cy = height; // Semicircle sits on bottom
  const radius = 150; // Fits within 320x180 viewBox
 
  // Convert 0..1 to angle (PI..0), and to XY on circle
  const angleForPct = (p) => Math.PI * (1 - p);
  const polarToCartesian = (centerX, centerY, r, angle) => ({
    x: centerX + r * Math.cos(angle),
    y: centerY - r * Math.sin(angle), // draw upward (semicircle above baseline)
  });
 
  const buildSectorPath = (fromPct, toPct, rOuter, rInner) => {
    const startAngleOuter = angleForPct(fromPct);
    const endAngleOuter = angleForPct(toPct);
    const largeArcOuter = endAngleOuter - startAngleOuter <= Math.PI ? 0 : 1;
 
    const outerStart = polarToCartesian(cx, cy, rOuter, startAngleOuter);
    const outerEnd = polarToCartesian(cx, cy, rOuter, endAngleOuter);
 
    const startAngleInner = angleForPct(toPct);
    const endAngleInner = angleForPct(fromPct);
    const largeArcInner = endAngleInner - startAngleInner <= Math.PI ? 0 : 1;
 
    const innerStart = polarToCartesian(cx, cy, rInner, startAngleInner);
    const innerEnd = polarToCartesian(cx, cy, rInner, endAngleInner);
 
    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${rOuter} ${rOuter} 0 ${largeArcOuter} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerStart.x} ${innerStart.y}`,
      `A ${rInner} ${rInner} 0 ${largeArcInner} 0 ${innerEnd.x} ${innerEnd.y}`,
      "Z",
    ].join(" ");
  };
 
  // Segments: green color scheme
  const segments = [
    { from: 0, to: 0.5, color: "#86efac" }, // light green (0-50%)
    { from: 0.5, to: 0.75, color: "#4ade80" }, // medium green (50-75%)
    { from: 0.75, to: 1.0, color: "#22c55e" }, // green (75-100%)
  ];
 
  // Needle geometry (smaller)
  const needleAngle = angleForPct(pct);
  const needleLength = radius * 0.55;
  const needleTip = polarToCartesian(cx, cy, needleLength, needleAngle);
  const needleBaseLeft = polarToCartesian(cx, cy, 6, needleAngle + Math.PI / 2);
  const needleBaseRight = polarToCartesian(cx, cy, 6, needleAngle - Math.PI / 2);
  const needlePath = `M ${needleBaseLeft.x} ${needleBaseLeft.y} L ${needleTip.x} ${needleTip.y} L ${needleBaseRight.x} ${needleBaseRight.y} Z`;
 
  // Tick helpers (0%, 50%, 75%, 100%)
  // Hide all labels (remove 50% and 75% text)
  const ticks = [
    { p: 0, label: null },
    { p: 0.5, label: null },
    { p: 0.75, label: null },
    { p: 1.0, label: null },
  ];
 
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5 flex flex-col">
      <h2 className="text-sm font-semibold text-slate-800 mb-2">
        {title}
      </h2>
 
      <div className="w-full aspect-[4/3]">
        <svg
          className="w-full h-full"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Vehicle Renewal semicircle gauge"
        >
          {/* Colored filled band inside the gauge */}
          {segments.map((s, idx) => {
            const outerR = radius;
            const innerR = radius * 0.72;
            return (
              <path key={idx} d={buildSectorPath(s.from, s.to, outerR, innerR)} fill={s.color} opacity={1} />
            );
          })}
 
          {/* Ticks */}
          {ticks.map((t, idx) => {
            const a = angleForPct(t.p);
            const inner = polarToCartesian(cx, cy, radius * 0.7, a);
            const outer = polarToCartesian(cx, cy, radius * 0.6, a);
            const label = polarToCartesian(cx, cy, radius * 1.05, a);
            return (
              <g key={idx}>
                <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#6b7280" strokeWidth={2} />
                {t.label ? (
                  <text
                    x={label.x}
                    y={label.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={11}
                    fill="#374151"
                  >
                    {t.label}
                  </text>
                ) : null}
              </g>
            );
          })}
 
          {/* Needle */}
          <path d={needlePath} fill="#111827" />
          <circle cx={cx} cy={cy} r={8} fill="#111827" />
 
          {/* End labels removed as requested */}
        </svg>
      </div>
 
      {/* Centered values below arc */}
      <div className="mt-1 flex flex-col items-center">
        <div className="text-2xl font-bold leading-none text-slate-900">
          {formatInt(actual)}
        </div>
        <div className="text-xs text-slate-500">
          Target: {formatInt(safeTarget)}
        </div>
      </div>
    </div>
  );
};
 
export default VehicleRenewalGauge;
 

