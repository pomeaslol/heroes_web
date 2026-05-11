'use client';

import { Domain } from '@/models/domain';
import { computeDomainScore } from '@/models/domain';

interface Props {
  domains: Domain[];
}

const MAX_SCORE = 50; // score brut → normalisé sur 10

function normalize(score: number) {
  return Math.min(10, Math.max(0, score)) / 10;
}

export function RadarChart({ domains }: Props) {
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

  const gridLines = [0.2, 0.4, 0.6, 0.8, 1].map((ratio) => {
    const pts = domains.map((_, i) => pt(i, ratio));
    return pts.map((p) => `${p.x},${p.y}`).join(' ');
  });

  const scores = domains.map((d) => normalize(computeDomainScore(d)));
  const fillPoints = domains.map((d, i) => pt(i, normalize(computeDomainScore(d))));

  return (
    <div>
      <div style={{ padding: '4px 32px 0' }}>
      <svg viewBox="0 0 280 260" width="100%" style={{ maxWidth: 360, display: 'block', margin: '0 auto', overflow: 'visible' }}>
        {/* Grid */}
        {gridLines.map((pts, i) => (
          <polygon key={i} points={pts} fill="none" stroke="var(--border)" strokeWidth="1" />
        ))}
        {/* Axes */}
        {domains.map((_, i) => {
          const p = pt(i, 1);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth="1" />;
        })}
        {/* Fill */}
        <polygon
          points={fillPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="rgba(212,245,60,.08)"
          stroke="rgba(212,245,60,.5)"
          strokeWidth="1.5"
        />
        {/* Dots */}
        {fillPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill="var(--green)" stroke="var(--bg)" strokeWidth="1.5" />
        ))}
        {/* Labels */}
        {domains.map((d, i) => {
          const p = pt(i, 1.22);
          const anchor = p.x < cx - 6 ? 'end' : p.x > cx + 6 ? 'start' : 'middle';
          const score = computeDomainScore(d);
          return (
            <g key={i}>
              <text x={p.x} y={p.y + 4} textAnchor={anchor} fill="var(--green)" fontSize="10.5" fontFamily="DM Sans" fontWeight="600">
                {d.name}
              </text>
              <text x={p.x} y={p.y + 16} textAnchor={anchor} fill="var(--muted)" fontSize="9" fontFamily="DM Sans">
                {score} pts
              </text>
            </g>
          );
        })}
      </svg>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', padding: '8px 14px 12px' }}>
        {domains.map((d) => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.62rem', color: 'var(--muted2)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
            {d.emoji} {d.name}
            <strong style={{ color: 'var(--green)' }}>{computeDomainScore(d)}pts</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
