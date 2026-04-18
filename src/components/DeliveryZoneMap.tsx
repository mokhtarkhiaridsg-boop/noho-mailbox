"use client";

import { useState } from "react";
import { DELIVERY_ZONES, type DeliveryZone } from "@/lib/delivery-zones";

// SVG viewBox is 500x500; center at (250,250)
const CX = 250;
const CY = 250;

// Zones 1-6 as concentric rings. Zone 7 is represented as outermost ring.
// Radii are spaced evenly: zone 1 innermost (~40px), zone 6 outermost (~220px)
const ZONE_RADII: Record<number, number> = {
  1: 42,
  2: 82,
  3: 122,
  4: 162,
  5: 200,
  6: 232,
  7: 255,
};

interface TooltipData {
  zone: DeliveryZone;
  x: number;
  y: number;
}

interface DeliveryZoneMapProps {
  activeZone?: number;
  onZoneHover?: (zone: number | null) => void;
}

export default function DeliveryZoneMap({ activeZone, onZoneHover }: DeliveryZoneMapProps) {
  const [hoveredZone, setHoveredZone] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [clickedZone, setClickedZone] = useState<number | null>(null);

  // The "highlighted" zone is whichever is hovered/clicked or the external activeZone
  const highlightedZone = hoveredZone ?? clickedZone ?? activeZone ?? null;

  function handleMouseEnter(zoneId: number, svgX: number, svgY: number) {
    setHoveredZone(zoneId);
    onZoneHover?.(zoneId);
    const zone = DELIVERY_ZONES.find((z) => z.id === zoneId);
    if (zone) setTooltip({ zone, x: svgX, y: svgY });
  }

  function handleMouseLeave() {
    setHoveredZone(null);
    onZoneHover?.(null);
    setTooltip(null);
  }

  function handleClick(zoneId: number) {
    setClickedZone((prev) => (prev === zoneId ? null : zoneId));
  }

  // Convert SVG coords to percent for tooltip positioning
  function tooltipStyle(x: number, y: number): React.CSSProperties {
    const leftPct = (x / 500) * 100;
    const topPct = (y / 500) * 100;
    return {
      left: `${Math.min(leftPct, 65)}%`,
      top: `${Math.min(topPct, 70)}%`,
    };
  }

  // Rings are drawn from outer to inner so inner rings are on top
  const zonesReversed = [...DELIVERY_ZONES].reverse();

  return (
    <div className="relative w-full max-w-xl mx-auto select-none" style={{ fontFamily: "inherit" }}>
      <svg
        viewBox="0 0 500 500"
        className="w-full h-auto block"
        style={{ background: "#0F1923", borderRadius: "1.25rem" }}
        aria-label="NOHO Mailbox delivery zone map"
      >
        {/* Subtle grid lines for context */}
        {[1, 2, 3, 4].map((i) => (
          <line
            key={`h${i}`}
            x1={0} y1={i * 100} x2={500} y2={i * 100}
            stroke="rgba(255,255,255,0.04)" strokeWidth={1}
          />
        ))}
        {[1, 2, 3, 4].map((i) => (
          <line
            key={`v${i}`}
            x1={i * 100} y1={0} x2={i * 100} y2={500}
            stroke="rgba(255,255,255,0.04)" strokeWidth={1}
          />
        ))}

        {/* Concentric zone rings — outer to inner */}
        {zonesReversed.map((zone) => {
          const r = ZONE_RADII[zone.id];
          const isHighlighted = highlightedZone === zone.id;
          const isDimmed = highlightedZone !== null && !isHighlighted;

          // Use a slightly lighter fill for very dark zones so they're visible
          let fillColor = zone.color;
          // Zone 5 (#2D1D0F) and zone 6 (#110E0B) are very dark — bump opacity for fill
          const fillOpacity = zone.id >= 5 ? 0.35 : 0.15;

          return (
            <g key={zone.id}>
              <circle
                cx={CX}
                cy={CY}
                r={r}
                fill={fillColor}
                fillOpacity={isHighlighted ? 0.35 : isDimmed ? 0.07 : fillOpacity}
                stroke={zone.color === "#110E0B" ? "#4A3828" : zone.color}
                strokeWidth={isHighlighted ? 3 : 1.5}
                strokeOpacity={isHighlighted ? 1 : isDimmed ? 0.3 : 0.8}
                style={{ cursor: "pointer", transition: "fill-opacity 0.2s, stroke-opacity 0.2s, stroke-width 0.15s" }}
                onMouseEnter={(e) => {
                  const svg = e.currentTarget.closest("svg")!;
                  const rect = svg.getBoundingClientRect();
                  const scaleX = 500 / rect.width;
                  const scaleY = 500 / rect.height;
                  const svgX = (e.clientX - rect.left) * scaleX;
                  const svgY = (e.clientY - rect.top) * scaleY;
                  // Place tooltip at mouse position within SVG
                  handleMouseEnter(zone.id, svgX, svgY);
                }}
                onMouseMove={(e) => {
                  const svg = e.currentTarget.closest("svg")!;
                  const rect = svg.getBoundingClientRect();
                  const scaleX = 500 / rect.width;
                  const scaleY = 500 / rect.height;
                  const svgX = (e.clientX - rect.left) * scaleX;
                  const svgY = (e.clientY - rect.top) * scaleY;
                  const zone2 = DELIVERY_ZONES.find((z) => z.id === zone.id);
                  if (zone2) setTooltip({ zone: zone2, x: svgX, y: svgY });
                }}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleClick(zone.id)}
              />
            </g>
          );
        })}

        {/* Zone labels — positioned at right edge of each ring */}
        {DELIVERY_ZONES.map((zone) => {
          const r = ZONE_RADII[zone.id];
          const prevR = zone.id === 1 ? 0 : ZONE_RADII[zone.id - 1];
          const midR = (r + prevR) / 2;
          // Place label at right side of the ring (angle 0 = right)
          const labelX = CX + midR * 0.92;
          const labelY = CY;
          const isDimmed = highlightedZone !== null && highlightedZone !== zone.id;

          // For very small zone 1, use center
          const finalX = zone.id === 1 ? CX : labelX;
          const finalY = zone.id === 1 ? CY - 14 : labelY;

          return (
            <g key={`label-${zone.id}`} style={{ pointerEvents: "none" }}>
              <text
                x={finalX}
                y={finalY - 5}
                textAnchor={zone.id === 1 ? "middle" : "middle"}
                fontSize={zone.id === 1 ? 7 : Math.max(6, 9 - zone.id * 0.5)}
                fontWeight="700"
                fill={zone.color === "#110E0B" ? "#8A6848" : zone.color}
                fillOpacity={isDimmed ? 0.25 : 0.95}
                style={{ transition: "fill-opacity 0.2s", userSelect: "none" }}
              >
                Z{zone.id}
              </text>
              {zone.id !== 1 && midR > 30 && (
                <text
                  x={finalX}
                  y={finalY + 7}
                  textAnchor="middle"
                  fontSize={Math.max(5, 7 - zone.id * 0.3)}
                  fontWeight="500"
                  fill="rgba(255,255,255,0.45)"
                  fillOpacity={isDimmed ? 0.12 : 0.55}
                  style={{ transition: "fill-opacity 0.2s", userSelect: "none" }}
                >
                  {zone.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Center pin marker */}
        <g style={{ pointerEvents: "none" }}>
          {/* Pin shadow */}
          <ellipse cx={CX} cy={CY + 18} rx={7} ry={3} fill="rgba(0,0,0,0.4)" />
          {/* Pin body */}
          <path
            d={`M ${CX} ${CY + 16} C ${CX - 8} ${CY + 4} ${CX - 10} ${CY - 6} ${CX - 10} ${CY - 10}
               A 10 10 0 0 1 ${CX + 10} ${CY - 10}
               C ${CX + 10} ${CY - 6} ${CX + 8} ${CY + 4} ${CX} ${CY + 16} Z`}
            fill="#3374B5"
            stroke="#fff"
            strokeWidth={1.5}
          />
          {/* Pin inner dot */}
          <circle cx={CX} cy={CY - 10} r={3.5} fill="white" />
          {/* NOHO label */}
          <rect
            x={CX - 30}
            y={CY + 22}
            width={60}
            height={14}
            rx={4}
            fill="rgba(15,25,35,0.85)"
            stroke="rgba(51,116,181,0.6)"
            strokeWidth={1}
          />
          <text
            x={CX}
            y={CY + 32}
            textAnchor="middle"
            fontSize={7.5}
            fontWeight="700"
            fill="#93C4FF"
            letterSpacing="0.05em"
          >
            NOHO MAILBOX
          </text>
        </g>

        {/* Compass rose — top right */}
        <g transform="translate(462, 38)" style={{ pointerEvents: "none" }}>
          <circle cx={0} cy={0} r={14} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
          <text x={0} y={-5} textAnchor="middle" fontSize={8} fontWeight="700" fill="rgba(255,255,255,0.5)">N</text>
          <line x1={0} y1={-12} x2={0} y2={12} stroke="rgba(255,255,255,0.2)" strokeWidth={0.8} />
          <line x1={-12} y1={0} x2={12} y2={0} stroke="rgba(255,255,255,0.2)" strokeWidth={0.8} />
        </g>

        {/* Scale label bottom */}
        <text x={250} y={490} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.2)" style={{ pointerEvents: "none" }}>
          Conceptual zone map — not to scale
        </text>
      </svg>

      {/* Tooltip overlay */}
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            ...tooltipStyle(tooltip.x, tooltip.y),
            transform: "translate(-50%, -110%)",
          }}
        >
          <div
            style={{
              background: "rgba(10,18,28,0.97)",
              border: `1.5px solid ${tooltip.zone.color === "#110E0B" ? "#4A3828" : tooltip.zone.color}`,
              borderRadius: "0.75rem",
              padding: "10px 14px",
              minWidth: "160px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <p style={{ color: "rgba(200,190,180,0.6)", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "2px" }}>
              Zone {tooltip.zone.id}
            </p>
            <p style={{ color: "#F8F2EA", fontSize: "13px", fontWeight: 800, marginBottom: "2px" }}>
              {tooltip.zone.name}
            </p>
            <p style={{ color: "rgba(200,190,180,0.7)", fontSize: "10px", marginBottom: "6px" }}>
              {tooltip.zone.label}
            </p>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#93C4FF", fontSize: "15px", fontWeight: 800 }}>
                {tooltip.zone.id === 7 ? "Call" : `$${tooltip.zone.basePrice.toFixed(0)}`}
              </span>
              <span style={{ color: "rgba(200,190,180,0.55)", fontSize: "10px" }}>
                {tooltip.zone.etaWindow}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        className="mt-3 flex flex-wrap gap-2 justify-center"
        style={{ padding: "0 4px" }}
      >
        {DELIVERY_ZONES.map((zone) => {
          const isActive = highlightedZone === zone.id;
          const strokeColor = zone.color === "#110E0B" ? "#4A3828" : zone.color;
          return (
            <button
              key={zone.id}
              onClick={() => handleClick(zone.id)}
              onMouseEnter={() => {
                setHoveredZone(zone.id);
                onZoneHover?.(zone.id);
                const z = DELIVERY_ZONES.find((z) => z.id === zone.id);
                if (z) setTooltip({ zone: z, x: 250, y: 200 });
              }}
              onMouseLeave={handleMouseLeave}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 8px",
                borderRadius: "999px",
                border: `1px solid ${isActive ? strokeColor : "rgba(255,255,255,0.1)"}`,
                background: isActive ? `${zone.color}30` : "rgba(255,255,255,0.04)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: strokeColor,
                  flexShrink: 0,
                  display: "block",
                }}
              />
              <span style={{ fontSize: "10px", fontWeight: 600, color: isActive ? "#F8F2EA" : "rgba(200,190,180,0.6)", whiteSpace: "nowrap" }}>
                Z{zone.id} {zone.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
