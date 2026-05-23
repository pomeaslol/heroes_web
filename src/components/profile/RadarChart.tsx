'use client';

import { Domain } from '@/models/domain';
import { computeTotalXP, computeLevelInfo } from '@/models/goal';

export interface RadarOverlay {
  label: string;
  color: string;
  // level per domain axis (1-8), same order as domains prop
  scores: number[];
}

interface Props {
  domains: Domain[];
  overlay?: RadarOverlay;
}

const MAX_LEVEL = 8;

function domainLevel(domain: Domain): number {
  return computeLevelInfo(computeTotalXP(domain.goals)).level;
}

export function RadarChart({ domains, overlay }: Props) {
  const cx = 140, cy = 130, r = 95;
  const n = domains.length;

  if (n < 3) {
    return (
      <svg viewBox="0 0 280 260" width="100%" style={{ maxWidth: 360, display: 'block', margin: '0 auto' }}>
        <text x="140" y="130" textAnchor="middle" fill="var(--muted)" fontSize="12">
          Ajoute ≥3 domaines
        </text>
      </svg>
    );
  }

  const angle = (i: number) => (Math.PI * 2 * i / n) - Math.PI / 2;
  const pt = (i: number, ratio: number) => ({
    x: cx + Math.cos(angle(i)) * r * ratio,
    y: cy + Math.sin(angle(i)) * r * ratio,
  });

  const gridLines = [0.25, 0.5, 0.75, 1].map((ratio) => {
    const pts = domains.map((_, i) => pt(i, ratio));
    return pts.map((p) => `${p.x},${p.y}`).join(' ');
  });

  const fillPoints = domains.map((d, i) => pt(i, Math.max(0.05, domainLevel(d) / MAX_LEVEL)));
  const overlayPoints = overlay
    ? overlay.scores.map((s, i) => pt(i, Math.max(0.05, Math.min(1, s / MAX_LEVEL))))
    : null;

  return (
    <div>
      <div style={{ padding: '4px 32px 0' }}>
        <svg viewBox="0 0 280 260" width="100%" style={{ maxWidth: 360, display: 'block', margin: '0 auto', overflow: 'visible' }}>
          {/* Grid rings */}
          {gridLines.map((pts, i) => (
            <polygon key={i} points={pts} fill="none" stroke="var(--border)" strokeWidth="1" />
          ))}
          {/* Level labels on top axis */}
          {[2, 4, 6, 8].map((lvl, i) => {
            const ratio = lvl / MAX_LEVEL;
            const p = pt(0, ratio);
            return <text key={i} x={p.x + 4} y={p.y + 3} fill="var(--muted)" fontSize="7" fontFamily="DM Sans" opacity="0.7">{lvl}</text>;
          })}
          {/* Axes */}
          {domains.map((_, i) => {
            const p = pt(i, 1);
            return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth="1" />;
          })}

          {/* Overlay (historical / friend) */}
          {overlayPoints && (
            <>
              <polygon
                points={overlayPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                fill={`${overlay!.color}18`}
                stroke={`${overlay!.color}80`}
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              {overlayPoints.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3} fill={overlay!.color} stroke="var(--bg)" strokeWidth="1.5" opacity={0.85} />
              ))}
            </>
          )}

          {/* User fill */}
          <polygon
            points={fillPoints.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="rgba(200,16,46,.1)"
            stroke="var(--primary)"
            strokeWidth="1.5"
          />
          {fillPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4} fill="var(--primary)" stroke="var(--bg)" strokeWidth="1.5" />
          ))}

          {/* Labels */}
          {domains.map((d, i) => {
            const p      = pt(i, 1.24);
            const anchor = p.x < cx - 6 ? 'end' : p.x > cx + 6 ? 'start' : 'middle';
            const level  = domainLevel(d);
            return (
              <g key={i}>
                <text x={p.x} y={p.y + 3} textAnchor={anchor} fill="var(--text)" fontSize="10" fontFamily="DM Sans" fontWeight="600">{d.emoji} {d.name}</text>
                <text x={p.x} y={p.y + 14} textAnchor={anchor} fill="var(--primary)" fontSize="8.5" fontFamily="DM Sans" fontWeight="700">Lvl {level}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', padding: '8px 14px 12px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.62rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />
          <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Toi</span>
        </div>
        {overlay && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.62rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: overlay.color }} />
            <span style={{ color: overlay.color, fontWeight: 700 }}>{overlay.label}</span>
          </div>
        )}
        {domains.map((d) => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.62rem', color: 'var(--muted2)' }}>
            {d.emoji} {d.name} <strong style={{ color: 'var(--primary)' }}>Lvl {domainLevel(d)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
