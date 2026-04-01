// Procedural SVG diagrams for each major assembly stage

export function YokeDiagram({ width = 300, height = 200 }) {
  const cx = width / 2, cy = height / 2;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 180 }}>
      <rect width={width} height={height} fill="#0a1628" />
      {/* Grid */}
      {Array.from({ length: 15 }, (_, i) => (
        <line key={`v${i}`} x1={i * 20} y1={0} x2={i * 20} y2={height} stroke="rgba(59,130,246,0.1)" strokeWidth={0.5} />
      ))}
      {Array.from({ length: 10 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={i * 20} x2={width} y2={i * 20} stroke="rgba(59,130,246,0.1)" strokeWidth={0.5} />
      ))}

      {/* Post footings */}
      {[60, cx, width - 60].map((x, i) => (
        <g key={i}>
          <rect x={x - 10} y={height - 30} width={20} height={25} fill="#1e3a5f" stroke="#3b82f6" strokeWidth={1.5} />
          <text x={x} y={height - 17} textAnchor="middle" fill="#60a5fa" fontSize={7} fontFamily="monospace">POST {i + 1}</text>
          {/* Post shaft */}
          <rect x={x - 4} y={cy - 10} width={8} height={height - cy - 20} fill="#2563eb" stroke="#3b82f6" strokeWidth={1} />
        </g>
      ))}

      {/* Beam */}
      <rect x={40} y={cy - 15} width={width - 80} height={14} fill="#1e40af" stroke="#3b82f6" strokeWidth={1.5} rx={2} />
      <text x={cx} y={cy - 5} textAnchor="middle" fill="#93c5fd" fontSize={8} fontFamily="monospace">MAIN BEAM</text>

      {/* Yoke brackets */}
      {[60, cx, width - 60].map((x, i) => (
        <g key={i}>
          <path d={`M${x - 10},${cy} L${x - 14},${cy - 14} L${x - 6},${cy - 14}`} fill="none" stroke="#fbbf24" strokeWidth={1.5} />
          <path d={`M${x + 10},${cy} L${x + 14},${cy - 14} L${x + 6},${cy - 14}`} fill="none" stroke="#fbbf24" strokeWidth={1.5} />
        </g>
      ))}

      {/* Dimension lines */}
      <line x1={40} y1={20} x2={width - 40} y2={20} stroke="#fbbf24" strokeWidth={0.8} markerEnd="url(#arrow)" />
      <text x={cx} y={16} textAnchor="middle" fill="#fbbf24" fontSize={8} fontFamily="monospace">SPAN ← → SPAN</text>

      {/* Label */}
      <text x={8} y={12} fill="#3b82f6" fontSize={7} fontFamily="monospace" letterSpacing={1}>YOKE ASSEMBLY</text>
    </svg>
  );
}

export function FramingDiagram({ width = 300, height = 220, depthFt = 16 }) {
  const joistCount = Math.round(depthFt * 1.5); // approx 16" OC
  const spacing = (width - 60) / Math.max(joistCount - 1, 1);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 200 }}>
      <rect width={width} height={height} fill="#0a1628" />
      {Array.from({ length: 16 }, (_, i) => (
        <line key={`v${i}`} x1={i * 20} y1={0} x2={i * 20} y2={height} stroke="rgba(59,130,246,0.1)" strokeWidth={0.5} />
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={i * 20} x2={width} y2={i * 20} stroke="rgba(59,130,246,0.1)" strokeWidth={0.5} />
      ))}

      {/* Rim joists (perimeter) */}
      <rect x={30} y={50} width={width - 60} height={height - 100} fill="none" stroke="#2563eb" strokeWidth={3} />

      {/* Interior joists */}
      {Array.from({ length: Math.min(joistCount - 2, 8) }, (_, i) => {
        const x = 30 + spacing * (i + 1);
        return (
          <line key={i} x1={x} y1={50} x2={x} y2={height - 50} stroke="#3b82f6" strokeWidth={1.5} />
        );
      })}

      {/* Blocking mid-span */}
      <line x1={30} y1={(50 + height - 50) / 2} x2={width - 30} y2={(50 + height - 50) / 2} stroke="#60a5fa" strokeWidth={1} strokeDasharray="4,3" />
      <text x={width / 2} y={(50 + height - 50) / 2 - 3} textAnchor="middle" fill="#60a5fa" fontSize={7} fontFamily="monospace">BLOCKING (MID-SPAN)</text>

      {/* OC label */}
      <text x={30 + spacing * 0.5} y={40} textAnchor="middle" fill="#fbbf24" fontSize={7} fontFamily="monospace">16" O.C.</text>
      <line x1={30} y1={42} x2={30 + spacing} y2={42} stroke="#fbbf24" strokeWidth={0.8} />
      <line x1={30} y1={38} x2={30} y2={46} stroke="#fbbf24" strokeWidth={0.8} />
      <line x1={30 + spacing} y1={38} x2={30 + spacing} y2={46} stroke="#fbbf24" strokeWidth={0.8} />

      {/* Labels */}
      <text x={8} y={12} fill="#3b82f6" fontSize={7} fontFamily="monospace" letterSpacing={1}>FRAMING PLAN</text>
      <text x={width - 8} y={height - 4} textAnchor="end" fill="#475569" fontSize={6} fontFamily="monospace">TOP VIEW</text>
    </svg>
  );
}

export function DeckingDiagram({ width = 300, height = 200 }) {
  const boardCount = 10;
  const bh = (height - 80) / boardCount;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 190 }}>
      <rect width={width} height={height} fill="#0a1628" />
      {Array.from({ length: 16 }, (_, i) => (
        <line key={`v${i}`} x1={i * 20} y1={0} x2={i * 20} y2={height} stroke="rgba(59,130,246,0.1)" strokeWidth={0.5} />
      ))}
      {Array.from({ length: 11 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={i * 20} x2={width} y2={i * 20} stroke="rgba(59,130,246,0.1)" strokeWidth={0.5} />
      ))}

      {/* Deck boards */}
      {Array.from({ length: boardCount }, (_, i) => (
        <g key={i}>
          <rect x={30} y={40 + i * bh} width={width - 60} height={bh - 2} fill={i % 2 === 0 ? '#1a3a5c' : '#152d4a'} stroke="#3b82f6" strokeWidth={0.8} />
          {/* Nail pattern */}
          {[60, width / 2, width - 60].map((nx, j) => (
            <circle key={j} cx={nx} cy={40 + i * bh + bh / 2} r={1.5} fill="#fbbf24" />
          ))}
        </g>
      ))}

      {/* Gap indicator */}
      <line x1={30} y1={40 + bh - 1} x2={30} y2={40 + bh + 1} stroke="#ef4444" strokeWidth={1} />
      <text x={14} y={40 + bh * 1.5} textAnchor="middle" fill="#ef4444" fontSize={6} fontFamily="monospace">1/8"</text>
      <text x={14} y={40 + bh * 1.5 + 8} textAnchor="middle" fill="#ef4444" fontSize={6} fontFamily="monospace">GAP</text>

      {/* Labels */}
      <text x={8} y={12} fill="#3b82f6" fontSize={7} fontFamily="monospace" letterSpacing={1}>DECKING LAYOUT</text>
      <text x={width - 8} y={height - 4} textAnchor="end" fill="#475569" fontSize={6} fontFamily="monospace">2x6 BOARDS</text>
    </svg>
  );
}

export function FinishingDiagram({ width = 300, height = 200 }) {
  const cx = width / 2;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 190 }}>
      <rect width={width} height={height} fill="#0a1628" />
      {Array.from({ length: 16 }, (_, i) => (
        <line key={`v${i}`} x1={i * 20} y1={0} x2={i * 20} y2={height} stroke="rgba(59,130,246,0.1)" strokeWidth={0.5} />
      ))}
      {Array.from({ length: 11 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={i * 20} x2={width} y2={i * 20} stroke="rgba(59,130,246,0.1)" strokeWidth={0.5} />
      ))}

      {/* Railing posts */}
      {[50, width - 50].map((x, i) => (
        <g key={i}>
          <rect x={x - 5} y={60} width={10} height={height - 100} fill="#1e3a5f" stroke="#3b82f6" strokeWidth={1.5} />
        </g>
      ))}

      {/* Top rail */}
      <rect x={45} y={58} width={width - 90} height={8} fill="#1e40af" stroke="#3b82f6" strokeWidth={1.5} rx={1} />

      {/* Balusters */}
      {Array.from({ length: 7 }, (_, i) => {
        const x = 60 + i * ((width - 120) / 6);
        return <rect key={i} x={x - 2} y={66} width={4} height={height - 126} fill="#2563eb" stroke="#3b82f6" strokeWidth={0.8} />;
      })}

      {/* Bottom rail */}
      <rect x={45} y={height - 62} width={width - 90} height={8} fill="#1e40af" stroke="#3b82f6" strokeWidth={1.5} rx={1} />

      {/* Stair indicator */}
      {[0, 1, 2].map(i => (
        <rect key={i} x={cx - 20 + i * 14} y={height - 40 + i * 6} width={14} height={6} fill="#1e3a5f" stroke="#3b82f6" strokeWidth={1} />
      ))}
      <text x={cx} y={height - 10} textAnchor="middle" fill="#60a5fa" fontSize={7} fontFamily="monospace">STAIR NOSING</text>

      {/* Handrail height call-out */}
      <line x1={width - 28} y1={58} x2={width - 28} y2={height - 62} stroke="#fbbf24" strokeWidth={0.8} strokeDasharray="2,2" />
      <text x={width - 10} y={(58 + height - 62) / 2} textAnchor="middle" fill="#fbbf24" fontSize={7} fontFamily="monospace" transform={`rotate(-90,${width - 10},${(58 + height - 62) / 2})`}>36" MIN</text>

      {/* Labels */}
      <text x={8} y={12} fill="#3b82f6" fontSize={7} fontFamily="monospace" letterSpacing={1}>RAILING + FINISHING</text>
      <text x={width - 8} y={height - 4} textAnchor="end" fill="#475569" fontSize={6} fontFamily="monospace">CODE: IRC R312</text>
    </svg>
  );
}
