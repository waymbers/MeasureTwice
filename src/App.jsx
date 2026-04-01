import { useState, useRef, useEffect, useCallback } from 'react';
import {
  HardHat, Ruler, Upload, Download, AlertTriangle, CheckCircle,
  ChevronRight, Zap, Package, DollarSign, FileText, Eye, Hammer,
  TriangleAlert, Clipboard, Camera, ArrowRight, Star, Shield,
  BookOpen, Wrench, BarChart2, Info
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

const STATES = { DISCOVERY: 'discovery', VISION: 'vision', GENERATION: 'generation' };

const PROGRESS_STEPS = [
  { label: 'Survey', state: STATES.DISCOVERY },
  { label: 'Analysis', state: STATES.VISION },
  { label: 'Drafting', state: STATES.GENERATION },
  { label: 'Final Bible', state: 'done' },
];

const DISCOVERY_QUESTIONS = [
  {
    id: 'projectName',
    question: "What's the name of your project? (e.g., \"Backyard Deck\", \"Treehouse\", \"Raised Garden Bed\")",
    placeholder: 'Project name...',
    type: 'text',
  },
  {
    id: 'height',
    question: "What's the target HEIGHT of the structure? (in inches)",
    placeholder: 'e.g., 36 (inches)',
    type: 'number',
    unit: 'inches',
  },
  {
    id: 'width',
    question: "What's the target WIDTH? (in inches)",
    placeholder: 'e.g., 96 (inches)',
    type: 'number',
    unit: 'inches',
  },
  {
    id: 'depth',
    question: "What's the target DEPTH / LENGTH? (in inches)",
    placeholder: 'e.g., 144 (inches)',
    type: 'number',
    unit: 'inches',
  },
  {
    id: 'constraints',
    question: "Any environmental constraints? (e.g., \"Around a tree\", \"In a corner\", \"Sloped ground — 6 inch drop\", \"None\")",
    placeholder: 'Describe site conditions...',
    type: 'text',
  },
  {
    id: 'targetLoad',
    question: "Who or what is this structure supporting? (e.g., \"Adults — up to 4 people\", \"Heavy planter boxes\", \"Kids play equipment\")",
    placeholder: 'Target load / users...',
    type: 'text',
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function inchesToFeetInches(inches) {
  const n = parseFloat(inches);
  if (isNaN(n)) return `${inches}"`;
  const ft = Math.floor(n / 12);
  const inch = n % 12;
  if (ft === 0) return `${inch}"`;
  if (inch === 0) return `${ft}'`;
  return `${ft}'-${inch}"`;
}

function calcMaterials(data) {
  const H = parseFloat(data.height) || 36;
  const W = parseFloat(data.width) || 96;
  const D = parseFloat(data.depth) || 144;
  const OVERAGE = 1.15;

  const sqFt = (W / 12) * (D / 12);
  const perimeterFt = 2 * ((W / 12) + (D / 12));
  const heightFt = H / 12;

  const deckingBoards = Math.ceil((sqFt / ((5.5 / 12) * (D / 12))) * OVERAGE);
  const joists = Math.ceil((W / 16) * OVERAGE);
  const beams = Math.ceil((D / 48) * 2 * OVERAGE);
  const posts = Math.ceil((perimeterFt / 6) + 2);
  const postBags = posts * 2;
  const screws_lbs = Math.ceil((sqFt / 25) * OVERAGE);
  const joist_hangers = Math.ceil(joists * 2 * OVERAGE);
  const ledger_bolts = Math.ceil((D / 16) * OVERAGE);

  return {
    sqFt: sqFt.toFixed(1),
    items: [
      { category: 'Lumber', name: '2×6 Decking Boards (8ft)', qty: deckingBoards, unit: 'pcs', unitCost: 12.50, link: 'https://www.homedepot.com/s/2x6+decking' },
      { category: 'Lumber', name: '2×8 Joists (10ft)', qty: joists, unit: 'pcs', unitCost: 18.75, link: 'https://www.homedepot.com/s/2x8+joist' },
      { category: 'Lumber', name: '4×6 Beams (8ft)', qty: beams, unit: 'pcs', unitCost: 28.00, link: 'https://www.lowes.com/search?searchTerm=4x6+beam' },
      { category: 'Lumber', name: '4×4 Posts (10ft)', qty: posts, unit: 'pcs', unitCost: 22.00, link: 'https://www.homedepot.com/s/4x4+post' },
      { category: 'Hardware', name: 'Structural Deck Screws (1 lb box)', qty: screws_lbs, unit: 'lbs', unitCost: 14.99, link: 'https://www.homedepot.com/s/deck+screws' },
      { category: 'Hardware', name: 'Joist Hangers (LU26)', qty: joist_hangers, unit: 'pcs', unitCost: 1.89, link: 'https://www.lowes.com/search?searchTerm=joist+hanger+LU26' },
      { category: 'Hardware', name: '1/2" Carriage Bolts + Nuts', qty: ledger_bolts, unit: 'pcs', unitCost: 0.85, link: 'https://www.homedepot.com/s/carriage+bolt+1/2' },
      { category: 'Specialty', name: 'Post Base Anchors (ABA44)', qty: posts, unit: 'pcs', unitCost: 8.99, link: 'https://www.homedepot.com/s/post+base+ABA44' },
      { category: 'Specialty', name: 'Quikrete Fast-Setting Concrete (50lb)', qty: postBags, unit: 'bags', unitCost: 9.98, link: 'https://www.homedepot.com/s/quikrete+fast+setting' },
      { category: 'Specialty', name: 'Waterproof Deck Sealant (1 gal)', qty: Math.ceil(sqFt / 200), unit: 'gal', unitCost: 34.99, link: 'https://www.lowes.com/search?searchTerm=deck+sealant' },
    ]
  };
}

function generateSteps(data, materials) {
  const H = parseFloat(data.height) || 36;
  const W = parseFloat(data.width) || 96;
  const D = parseFloat(data.depth) || 144;

  return [
    {
      phase: 'SITE PREPARATION',
      icon: '📍',
      steps: [
        {
          num: 1,
          title: 'Layout & Batterboards',
          desc: `Mark your ${inchesToFeetInches(W)} × ${inchesToFeetInches(D)} footprint using batter boards and mason line. Pull diagonal measurements — they MUST be equal (3-4-5 triangle method or measure corner-to-corner). Tolerance: ±1/4".`,
          isWarning: false,
        },
        {
          num: 2,
          title: 'Excavate Post Holes',
          desc: `Dig post holes at each corner and every 6ft along the perimeter. Depth: frost line + 12" (minimum 24" in most US climates — check local codes). Diameter: 12" for 4×4 posts. Use a clamshell digger or rent a power auger.`,
          isWarning: false,
        },
        {
          num: 3,
          title: 'FOREMAN\'S WARNING: Call 811 Before You Dig',
          desc: `CALL 811 — "Call Before You Dig" — at least 3 business days before breaking ground. Hitting a buried utility line causes electrocution, gas explosions, and massive fines. This is not optional. It's federal law in the US.`,
          isWarning: true,
        },
      ],
    },
    {
      phase: 'FOOTING & POST INSTALLATION',
      icon: '🏗️',
      steps: [
        {
          num: 4,
          title: 'Set Post Footings',
          desc: `Mix Quikrete Fast-Set (dry pour method works for post footings). Pour 6" of gravel for drainage, then set post. Pour dry concrete mix around post, add water per bag instructions. Brace posts plumb (use a level on two adjacent faces). Do NOT disturb for 4 hours minimum.`,
          isWarning: false,
        },
        {
          num: 5,
          title: 'Cut Posts to Height',
          desc: `Once concrete cures (24 hrs minimum), snap a chalk line at finished beam height. Cut all posts to ${inchesToFeetInches(H - 9)}" above ground (accounting for beam + decking). Use a reciprocating saw or circular saw with a guide. KEEP CUTS SQUARE — use a speed square to mark all 4 faces before cutting.`,
          isWarning: false,
        },
        {
          num: 6,
          title: 'FOREMAN\'S WARNING: Post Plumb is Non-Negotiable',
          desc: `STRUCTURAL INTEGRITY ALERT: Out-of-plumb posts transfer eccentric loads and WILL cause failure under heavy load or seismic activity. Check plumb with a 4ft level on all four sides. Maximum allowable deviation: 1/8" per 3ft of height. Re-pour if needed.`,
          isWarning: true,
        },
      ],
    },
    {
      phase: 'BEAM & JOIST FRAMING',
      icon: '🔩',
      steps: [
        {
          num: 7,
          title: 'Install Beams',
          desc: `Set 4×6 beams across post tops. Use post cap hardware (ABA44 anchors). Secure with (2) 1/2" × 7" carriage bolts per connection — pre-drill with a 9/16" bit to prevent splitting. Stagger bolt patterns: top bolt 1-1/2" from edge, bottom bolt 3" from top bolt. Torque to 40 ft-lbs.`,
          isWarning: false,
        },
        {
          num: 8,
          title: 'Install Rim Joists (Band Board)',
          desc: `Set 2×8 rim joists on edge across the beam ends, flush with outer face of beams. Toenail with (3) 3" structural screws per connection. The rim joist forms the perimeter frame — keep it perfectly level (use a water level or laser level across all four corners).`,
          isWarning: false,
        },
        {
          num: 9,
          title: 'FOREMAN\'S WARNING: Joist Span Limits',
          desc: `DO NOT exceed 2×8 joist span of 12ft without a mid-span beam. Your project is ${inchesToFeetInches(W)} wide — ${parseFloat(W)/12 > 12 ? "⚠️ YOU NEED A CENTER BEAM — install a mid-span 4×8 beam before proceeding." : "✅ within safe 2×8 span limits."}  Exceeding span tables causes catastrophic floor bounce and eventual collapse.`,
          isWarning: true,
        },
        {
          num: 10,
          title: 'Lay Out & Install Interior Joists',
          desc: `Mark joist layout at 16" O.C. on both rim joists (use a tape measure and pencil — mark the X on the same side every time). Install LU26 joist hangers at each mark. Drop joists into hangers, fasten per hanger manufacturer specs (typically (10) 10d joist hanger nails each side). Crown side UP — joists naturally bow slightly; always orient the bow toward the sky.`,
          isWarning: false,
        },
      ],
    },
    {
      phase: 'DECKING INSTALLATION',
      icon: '🪵',
      steps: [
        {
          num: 11,
          title: 'First Decking Board — Starter Course',
          desc: `Start at the most visible edge (typically the edge you approach from). Lay the first 2×6 flat with factory edge facing out. Overhang: 1" to 1-1/2" past rim joist. Pre-drill 2 holes per joist crossing (5/32" bit) to prevent splitting. Drive (2) 3" structural deck screws per crossing, countersunk flush.`,
          isWarning: false,
        },
        {
          num: 12,
          title: 'Spacing & Running the Field',
          desc: `Use a 16d nail (1/8" gap) or dedicated deck-spacing tool between boards for drainage and expansion. PRO TIP: Every 4 boards, check your parallel alignment with the far rim joist — "rack" boards slightly if drifting. Snap a chalk line every 10 boards to keep it honest.`,
          isWarning: false,
        },
        {
          num: 13,
          title: 'FOREMAN\'S WARNING: Wet vs. Dry Lumber Spacing',
          desc: `MATERIAL SCIENCE ALERT: Pressure-treated lumber from the yard is WET. It will shrink ~1/4" per 4" of width as it dries. If using wet PT lumber, butt boards tight (no gap) — the gap will appear naturally as it dries. If using kiln-dried or pre-dried material, use 1/8" spacer. Using wrong spacing on wet lumber = gaps you can put your finger through in 6 months.`,
          isWarning: true,
        },
        {
          num: 14,
          title: 'Trim Decking to Final Line',
          desc: `Once all boards are down, snap a chalk line ${parseFloat(W)/12 > 8 ? '1.25"' : '1"'} past the rim joist edge (your overhang). Set circular saw depth to just cut through the decking without hitting joists. Run the saw along the chalk line in one smooth pass. A good edge makes everything look professional.`,
          isWarning: false,
        },
      ],
    },
    {
      phase: 'FINISHING & SEALING',
      icon: '✨',
      steps: [
        {
          num: 15,
          title: 'Sanding & Prep',
          desc: `Belt-sand any raised grain, rough spots, or small ridges where boards meet. Start with 60-grit, finish with 100-grit. Blow off all sawdust with compressed air or a leaf blower. The surface must be DRY (moisture content < 15%) before applying sealant.`,
          isWarning: false,
        },
        {
          num: 16,
          title: 'Apply Waterproof Sealant',
          desc: `Apply deck sealant with a roller (1/2" nap) for field areas, brush for corners and edges. Work with the grain. Two coats: first coat soaks in (apply generously, let sit 30 min, wipe excess). Second coat at 90° to first. Dry time: 24-48 hrs before foot traffic, 72 hrs before furniture.`,
          isWarning: false,
        },
        {
          num: 17,
          title: 'FOREMAN\'S WARNING: Final Structural Inspection',
          desc: `BEFORE YOU DECLARE DONE: Get under the structure. Check every joist hanger — all nails installed? Check every post base — bolts torqued? Pull on each post — any wobble = problem. Load-test by having 4 adults stand in the center simultaneously. Any unusual deflection (> 1/2" sag) means undersized framing. NEVER skip this step on any structure humans will occupy.`,
          isWarning: true,
        },
      ],
    },
  ];
}

// ─── SVG DIAGRAMS ─────────────────────────────────────────────────────────────

function YokeDiagram({ data }) {
  const W = Math.min(parseFloat(data.width) || 96, 200);
  const D = Math.min(parseFloat(data.depth) || 144, 200);
  const scale = 200 / Math.max(W, D);
  const sw = W * scale;
  const sd = D * scale;

  return (
    <svg viewBox="0 0 260 220" className="w-full h-48" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="260" height="220" fill="#0a1628" rx="4" />
      <text x="130" y="18" fill="#4a9eff" textAnchor="middle" fontSize="11" fontFamily="monospace" fontWeight="bold">FOOTING LAYOUT PLAN</text>
      {/* Ground rectangle */}
      <rect x={(260 - sw) / 2} y="30" width={sw} height={sd} fill="none" stroke="#4a9eff" strokeWidth="1.5" strokeDasharray="4 2" />
      {/* Posts at corners */}
      {[
        [(260 - sw) / 2, 30], [(260 + sw) / 2, 30],
        [(260 - sw) / 2, 30 + sd], [(260 + sw) / 2, 30 + sd]
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="6" fill="#ff6b35" stroke="#ff4500" strokeWidth="1.5" />
          <text x={x} y={y + 14} fill="#aaa" textAnchor="middle" fontSize="7" fontFamily="monospace">POST</text>
        </g>
      ))}
      {/* Dimension labels */}
      <text x="130" y={30 + sd + 18} fill="#4a9eff" textAnchor="middle" fontSize="9" fontFamily="monospace" fontWeight="bold">{data.width}"W</text>
      <text x={(260 - sw) / 2 - 12} y={30 + sd / 2} fill="#4a9eff" textAnchor="middle" fontSize="9" fontFamily="monospace" fontWeight="bold" transform={`rotate(-90, ${(260 - sw) / 2 - 12}, ${30 + sd / 2})`}>{data.depth}"D</text>
      {/* Diagonal lines */}
      <line x1={(260 - sw) / 2} y1="30" x2={(260 + sw) / 2} y2={30 + sd} stroke="#4a9eff" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
      <line x1={(260 + sw) / 2} y1="30" x2={(260 - sw) / 2} y2={30 + sd} stroke="#4a9eff" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
      <text x="130" y={30 + sd / 2 + 4} fill="#4a9eff" textAnchor="middle" fontSize="8" fontFamily="monospace">DIAG: {Math.sqrt(W*W + D*D).toFixed(1)}"</text>
      <text x="130" y="210" fill="#555" textAnchor="middle" fontSize="8" fontFamily="monospace">FIG 1 — POST LAYOUT & FOOTING PLAN</text>
    </svg>
  );
}

function FramingDiagram({ data }) {
  const W = Math.min(parseFloat(data.width) || 96, 180);
  const scale = 180 / Math.max(parseFloat(data.width) || 96, parseFloat(data.depth) || 144);
  const sw = (parseFloat(data.width) || 96) * scale;
  const sd = Math.min((parseFloat(data.depth) || 144) * scale, 140);
  const joistsCount = Math.floor(sw / (16 * scale)) + 1;

  return (
    <svg viewBox="0 0 260 220" className="w-full h-48" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="260" height="220" fill="#0a1628" rx="4" />
      <text x="130" y="18" fill="#4a9eff" textAnchor="middle" fontSize="11" fontFamily="monospace" fontWeight="bold">FRAMING PLAN — TOP VIEW</text>
      {/* Rim joists */}
      <rect x={(260 - sw) / 2} y="30" width={sw} height={sd} fill="none" stroke="#6ee7b7" strokeWidth="3" />
      {/* Interior joists */}
      {Array.from({ length: joistsCount }).map((_, i) => {
        const x = (260 - sw) / 2 + (i + 1) * (sw / (joistsCount + 1));
        return (
          <line key={i} x1={x} y1="30" x2={x} y2={30 + sd}
            stroke="#6ee7b7" strokeWidth="1.5" strokeDasharray="none" opacity="0.7" />
        );
      })}
      {/* Joist spacing label */}
      <text x="130" y={30 + sd + 16} fill="#6ee7b7" textAnchor="middle" fontSize="8" fontFamily="monospace">16" O.C. JOIST SPACING</text>
      {/* Arrows */}
      <text x={(260 - sw) / 2 - 5} y={30 + sd / 2 + 3} fill="#4a9eff" textAnchor="end" fontSize="8" fontFamily="monospace">←</text>
      <text x={(260 + sw) / 2 + 5} y={30 + sd / 2 + 3} fill="#4a9eff" textAnchor="start" fontSize="8" fontFamily="monospace">→</text>
      <text x="130" y={30 + sd + 28} fill="#4a9eff" textAnchor="middle" fontSize="8" fontFamily="monospace">{data.width}"</text>
      <text x="130" y="210" fill="#555" textAnchor="middle" fontSize="8" fontFamily="monospace">FIG 2 — JOIST FRAMING PLAN</text>
    </svg>
  );
}

function DeckingDiagram({ data }) {
  const sw = 180;
  const sd = 120;
  const boardWidth = 8;
  const gap = 2;
  const rows = Math.floor(sd / (boardWidth + gap));

  return (
    <svg viewBox="0 0 260 220" className="w-full h-48" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="260" height="220" fill="#0a1628" rx="4" />
      <text x="130" y="18" fill="#4a9eff" textAnchor="middle" fontSize="11" fontFamily="monospace" fontWeight="bold">DECKING LAYOUT — ISOMETRIC</text>
      {/* Board rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <rect key={i}
          x="40" y={30 + i * (boardWidth + gap)}
          width={sw} height={boardWidth}
          fill={i % 2 === 0 ? '#8B6914' : '#A0792A'}
          stroke="#5a4010" strokeWidth="0.5" rx="0.5" />
      ))}
      {/* Screws */}
      {Array.from({ length: rows }).map((_, i) =>
        [60, 100, 140, 180].map((x) => (
          <circle key={`${i}-${x}`} cx={x} cy={30 + i * (boardWidth + gap) + boardWidth / 2}
            r="1.5" fill="#333" stroke="#888" strokeWidth="0.3" />
        ))
      )}
      <text x="130" y={30 + rows * (boardWidth + gap) + 16} fill="#f59e0b" textAnchor="middle" fontSize="8" fontFamily="monospace">1/8" GAP BETWEEN BOARDS</text>
      <text x="130" y={30 + rows * (boardWidth + gap) + 28} fill="#4a9eff" textAnchor="middle" fontSize="8" fontFamily="monospace">2×6 DECKING — {data.width}" TOTAL WIDTH</text>
      <text x="130" y="210" fill="#555" textAnchor="middle" fontSize="8" fontFamily="monospace">FIG 3 — DECKING INSTALLATION</text>
    </svg>
  );
}

function FinishingDiagram({ data }) {
  const H = Math.min(parseFloat(data.height) || 36, 80);
  const scale = 80 / H;
  const sh = H * scale;

  return (
    <svg viewBox="0 0 260 220" className="w-full h-48" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="260" height="220" fill="#0a1628" rx="4" />
      <text x="130" y="18" fill="#4a9eff" textAnchor="middle" fontSize="11" fontFamily="monospace" fontWeight="bold">SIDE ELEVATION — FINISHED</text>
      {/* Ground line */}
      <line x1="20" y1="175" x2="240" y2="175" stroke="#666" strokeWidth="2" strokeDasharray="5 3" />
      <text x="130" y="188" fill="#666" textAnchor="middle" fontSize="8" fontFamily="monospace">GRADE</text>
      {/* Posts */}
      <rect x="50" y={175 - sh - 20} width="12" height={sh + 20} fill="#8B6914" stroke="#5a4010" strokeWidth="1" />
      <rect x="198" y={175 - sh - 20} width="12" height={sh + 20} fill="#8B6914" stroke="#5a4010" strokeWidth="1" />
      {/* Beam */}
      <rect x="50" y={175 - sh - 20} width="160" height="10" fill="#A0792A" stroke="#5a4010" strokeWidth="1" />
      {/* Decking surface */}
      <rect x="45" y={175 - sh - 26} width="170" height="6" fill="#C49A2A" stroke="#8B6914" strokeWidth="1" />
      {/* Height dimension */}
      <line x1="32" y1="175" x2="32" y2={175 - sh} stroke="#4a9eff" strokeWidth="1" markerEnd="url(#arrow)" />
      <text x="25" y={175 - sh / 2 + 4} fill="#4a9eff" textAnchor="middle" fontSize="9" fontFamily="monospace" fontWeight="bold" transform={`rotate(-90, 25, ${175 - sh / 2 + 4})`}>{data.height}"</text>
      {/* Footing below grade */}
      <ellipse cx="56" cy="175" rx="10" ry="4" fill="#555" stroke="#4a9eff" strokeWidth="0.5" strokeDasharray="2 2" />
      <ellipse cx="204" cy="175" rx="10" ry="4" fill="#555" stroke="#4a9eff" strokeWidth="0.5" strokeDasharray="2 2" />
      <text x="130" y="210" fill="#555" textAnchor="middle" fontSize="8" fontFamily="monospace">FIG 4 — SIDE ELEVATION & FINAL HEIGHT</text>
    </svg>
  );
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function ProgressBar({ currentState }) {
  const currentIdx = PROGRESS_STEPS.findIndex(s => s.state === currentState);
  const pct = ((currentIdx) / (PROGRESS_STEPS.length - 1)) * 100;

  return (
    <div className="w-full px-4 py-3 bg-[#0d1f3c] border-b border-[#1e3a5f]">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between mb-2">
          {PROGRESS_STEPS.map((step, i) => (
            <div key={step.label} className="flex flex-col items-center" style={{ width: '25%' }}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-all duration-500 ${
                i <= currentIdx
                  ? 'bg-[#4a9eff] text-white shadow-lg shadow-blue-500/30'
                  : 'bg-[#1a2f4e] text-[#4a7aaa] border border-[#1e3a5f]'
              }`}>
                {i < currentIdx ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span className={`text-[10px] font-mono font-bold tracking-wider ${
                i <= currentIdx ? 'text-[#4a9eff]' : 'text-[#4a7aaa]'
              }`}>{step.label.toUpperCase()}</span>
            </div>
          ))}
        </div>
        <div className="w-full bg-[#1a2f4e] rounded-full h-1.5">
          <div className="bg-gradient-to-r from-[#1e5fcc] to-[#4a9eff] h-1.5 rounded-full progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function DiscoveryState({ onComplete }) {
  const [messages, setMessages] = useState([
    { id: 0, from: 'bot', text: "🔧 MEASURE TWICE — Field Intelligence System\n\nI'm going to help you build a professional construction guide. Answer the following questions and I'll generate your complete Project Bible." },
  ]);
  const [qIndex, setQIndex] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [answers, setAnswers] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [done, setDone] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (qIndex < DISCOVERY_QUESTIONS.length && !isTyping) {
      setIsTyping(true);
      const t = setTimeout(() => {
        const q = DISCOVERY_QUESTIONS[qIndex];
        setMessages(m => [...m, { id: Date.now(), from: 'bot', text: `📋 Q${qIndex + 1}/${DISCOVERY_QUESTIONS.length}: ${q.question}` }]);
        setIsTyping(false);
        inputRef.current?.focus();
      }, 600);
      return () => clearTimeout(t);
    }
  }, [qIndex, isTyping]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = inputVal.trim();
    if (!val || isTyping || done) return;

    const q = DISCOVERY_QUESTIONS[qIndex];
    const newAnswers = { ...answers, [q.id]: val };
    setAnswers(newAnswers);
    setMessages(m => [...m, { id: Date.now(), from: 'user', text: val }]);
    setInputVal('');

    if (qIndex + 1 >= DISCOVERY_QUESTIONS.length) {
      setDone(true);
      setIsTyping(true);
      setTimeout(() => {
        setMessages(m => [...m, { id: Date.now(), from: 'bot', text: `✅ Survey complete! I've captured all dimensions for "${val === newAnswers.targetLoad ? newAnswers.projectName : val}". Proceeding to Vision Analysis...` }]);
        setIsTyping(false);
        setTimeout(() => onComplete(newAnswers), 1200);
      }, 800);
    } else {
      setQIndex(i => i + 1);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full px-4 py-6">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm font-mono whitespace-pre-line ${
              msg.from === 'user'
                ? 'bg-[#1e4d7a] text-white border border-[#4a9eff] chat-bubble-out'
                : 'bg-[#0d1f3c] text-[#a0c4ff] border border-[#1e3a5f] chat-bubble-in'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-lg px-4 py-3">
              <div className="typing-indicator flex items-center gap-1">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {!done && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type={DISCOVERY_QUESTIONS[qIndex]?.type === 'number' ? 'number' : 'text'}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder={DISCOVERY_QUESTIONS[qIndex]?.placeholder || ''}
            disabled={isTyping || done}
            className="flex-1 bg-[#0d1f3c] border border-[#1e3a5f] text-white font-mono text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-[#4a9eff] placeholder-[#4a7aaa] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isTyping || done || !inputVal.trim()}
            className="bg-[#4a9eff] hover:bg-[#3a8eef] disabled:opacity-40 text-white font-bold px-5 py-3 rounded-lg transition-colors flex items-center gap-2"
          >
            <ArrowRight size={18} />
          </button>
        </form>
      )}

      <div className="mt-3 text-center">
        <span className="text-[#4a7aaa] text-xs font-mono">
          QUESTION {Math.min(qIndex + 1, DISCOVERY_QUESTIONS.length)} OF {DISCOVERY_QUESTIONS.length}
        </span>
      </div>
    </div>
  );
}

// Returns a safe blob URL for a user-uploaded File, or null.
// URL.createObjectURL always produces a blob: URI (same-origin opaque identifier).
// The returned URL is safe to use in img.src — blob: URIs cannot execute scripts.
function useBlobUrl(file) {
  const urlRef = useRef(null);
  useEffect(() => {
    if (!file) { urlRef.current = null; return; }
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    return () => { URL.revokeObjectURL(url); urlRef.current = null; };
  }, [file]);
  // Return the synchronous URL only when file is set; the ref is populated by the effect above,
  // but for the initial render we can safely derive it inline since we own the File object.
  if (!file) return null;
  if (!urlRef.current) {
    urlRef.current = URL.createObjectURL(file);
  }
  return urlRef.current;
}

function VisionState({ projectData, onComplete }) {
  const [phase, setPhase] = useState('upload'); // upload | analyzing | scale | done
  const [imageFile, setImageFile] = useState(null);
  const [styleExtract, setStyleExtract] = useState(null);
  const [scaleMeasure, setScaleMeasure] = useState('');
  const fileInputRef = useRef(null);

  const imageUrl = useBlobUrl(imageFile);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    setPhase('analyzing');

    // Simulate AI vision analysis
    setTimeout(() => {
      setStyleExtract({
        style: ['Modern Farmhouse', 'Industrial', 'Classic Craftsman', 'Contemporary', 'Rustic Lodge'][Math.floor(Math.random() * 5)],
        material: ['Pressure-Treated Pine', 'Cedar', 'Composite Decking', 'Redwood', 'Douglas Fir'][Math.floor(Math.random() * 5)],
        finish: ['Natural Wood Stain', 'Dark Walnut', 'Gray Weathered', 'Teak Oil', 'Semi-transparent Sealant'][Math.floor(Math.random() * 5)],
        railing: ['Cable Railing', 'Horizontal Slat', 'Traditional Baluster', 'Glass Panel', 'None'][Math.floor(Math.random() * 5)],
        confidence: (75 + Math.random() * 20).toFixed(0),
      });
      setPhase('scale');
    }, 2500);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  };

  const handleSkip = () => {
    onComplete({ ...projectData, style: null, scaleMeasure: null });
  };

  const handleScaleSubmit = (e) => {
    e.preventDefault();
    setPhase('done');
    setTimeout(() => {
      onComplete({ ...projectData, style: styleExtract, scaleMeasure });
    }, 600);
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-6">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Eye size={28} className="text-[#4a9eff]" />
          <h2 className="text-2xl font-bold font-mono text-white tracking-wider">VISION ANALYSIS</h2>
        </div>
        <p className="text-[#4a7aaa] font-mono text-sm">Upload an inspiration photo to extract style preferences</p>
      </div>

      {phase === 'upload' && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="border-2 border-dashed border-[#1e3a5f] hover:border-[#4a9eff] rounded-xl p-12 text-center cursor-pointer transition-colors bg-[#0d1f3c]"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera size={48} className="mx-auto mb-4 text-[#4a7aaa]" />
          <p className="text-white font-mono font-bold text-lg mb-2">DROP INSPIRATION PHOTO HERE</p>
          <p className="text-[#4a7aaa] font-mono text-sm mb-4">or click to browse files</p>
          <p className="text-[#4a7aaa] font-mono text-xs">JPG, PNG, WEBP accepted</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => handleFile(e.target.files[0])}
          />
        </div>
      )}

      {phase === 'analyzing' && (
        <div className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-xl p-8 text-center">
          {imageUrl && <img src={imageUrl} alt="Reference" className="max-h-48 mx-auto mb-6 rounded-lg object-contain" />}
          <div className="typing-indicator flex items-center justify-center gap-2 mb-4">
            <span /><span /><span />
          </div>
          <p className="text-[#4a9eff] font-mono font-bold">ANALYZING VISUAL SIGNATURE...</p>
          <p className="text-[#4a7aaa] font-mono text-sm mt-2">Extracting style, materials, and proportions</p>
        </div>
      )}

      {phase === 'scale' && styleExtract && (
        <div className="space-y-4">
          {imageUrl && <img src={imageUrl} alt="Reference" className="max-h-40 w-full object-contain rounded-lg" />}
          <div className="bg-[#0d1f3c] border border-[#4a9eff] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle size={18} className="text-[#4a9eff]" />
              <span className="text-[#4a9eff] font-mono font-bold text-sm">VISION ANALYSIS — {styleExtract.confidence}% CONFIDENCE</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['STYLE', styleExtract.style],
                ['MATERIAL', styleExtract.material],
                ['FINISH', styleExtract.finish],
                ['RAILING', styleExtract.railing],
              ].map(([label, value]) => (
                <div key={label} className="bg-[#152a47] rounded-lg p-3">
                  <div className="text-[#4a7aaa] font-mono text-xs mb-1">{label}</div>
                  <div className="text-white font-mono font-bold text-sm">{value}</div>
                </div>
              ))}
            </div>
          </div>
          <form onSubmit={handleScaleSubmit} className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-xl p-5">
            <p className="text-white font-mono font-bold mb-1">SCALE CALIBRATION</p>
            <p className="text-[#4a7aaa] font-mono text-sm mb-3">To set the scale, enter one known measurement from the photo (e.g., "door height = 80 inches")</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={scaleMeasure}
                onChange={e => setScaleMeasure(e.target.value)}
                placeholder='e.g., "fence post = 48 inches"'
                className="flex-1 bg-[#152a47] border border-[#1e3a5f] text-white font-mono text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#4a9eff] placeholder-[#4a7aaa]"
              />
              <button type="submit" className="bg-[#4a9eff] hover:bg-[#3a8eef] text-white font-bold px-5 py-2.5 rounded-lg transition-colors font-mono text-sm">
                CONFIRM
              </button>
            </div>
          </form>
        </div>
      )}

      {phase === 'done' && (
        <div className="bg-[#0d1f3c] border border-[#4a9eff] rounded-xl p-8 text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-[#4a9eff]" />
          <p className="text-white font-mono font-bold text-lg">ANALYSIS LOCKED</p>
          <p className="text-[#4a7aaa] font-mono text-sm mt-2">Generating your Project Bible...</p>
        </div>
      )}

      {phase === 'upload' && (
        <button onClick={handleSkip} className="mt-4 w-full text-[#4a7aaa] hover:text-white font-mono text-sm py-2 transition-colors">
          Skip Vision Analysis → Generate Bible Immediately
        </button>
      )}
    </div>
  );
}

function ShoppingList({ materials }) {
  const categories = [...new Set(materials.items.map(i => i.category))];
  const total = materials.items.reduce((s, i) => s + i.qty * i.unitCost, 0);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Package size={24} className="text-[#4a9eff]" />
        <h3 className="text-xl font-mono font-bold text-white tracking-wider">SHOPPING LIST</h3>
        <span className="bg-[#1e3a5f] text-[#4a9eff] text-xs font-mono px-2 py-1 rounded">15% OVERAGE INCLUDED</span>
      </div>
      <p className="text-[#4a7aaa] font-mono text-sm mb-4">Coverage Area: <span className="text-white font-bold measurement-text">{materials.sqFt} sq ft</span></p>

      {categories.map(cat => (
        <div key={cat} className="mb-4">
          <div className="text-[#4a9eff] font-mono font-bold text-sm mb-2 uppercase tracking-widest border-b border-[#1e3a5f] pb-1">{cat}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-[#4a7aaa] text-xs">
                  <th className="text-left py-1 pr-4">ITEM</th>
                  <th className="text-right py-1 pr-4">QTY</th>
                  <th className="text-right py-1 pr-4">UNIT $</th>
                  <th className="text-right py-1 pr-4">TOTAL</th>
                  <th className="text-right py-1">LINK</th>
                </tr>
              </thead>
              <tbody>
                {materials.items.filter(i => i.category === cat).map((item, idx) => (
                  <tr key={idx} className="border-t border-[#1e2a3e] hover:bg-[#152a47] transition-colors">
                    <td className="py-2 pr-4 text-white">{item.name}</td>
                    <td className="py-2 pr-4 text-right text-[#6ee7b7] font-bold measurement-text">{item.qty} {item.unit}</td>
                    <td className="py-2 pr-4 text-right text-[#a0c4ff]">${item.unitCost.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-right text-white font-bold">${(item.qty * item.unitCost).toFixed(2)}</td>
                    <td className="py-2 text-right">
                      <a href={item.link} target="_blank" rel="noopener noreferrer"
                        className="text-[#4a9eff] hover:text-[#7ab8ff] text-xs underline">
                        Buy →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="bg-[#152a47] border border-[#4a9eff] rounded-lg p-4 flex justify-between items-center mt-4">
        <span className="text-white font-mono font-bold text-lg flex items-center gap-2">
          <DollarSign size={20} className="text-[#4a9eff]" />
          ESTIMATED TOTAL
        </span>
        <span className="text-[#4a9eff] font-mono font-bold text-2xl measurement-text">${total.toFixed(2)}</span>
      </div>
      <p className="text-[#4a7aaa] font-mono text-xs mt-2">* Prices are estimates. Verify with local suppliers. Prices vary by region.</p>
    </div>
  );
}

function InstructionSteps({ steps }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <FileText size={24} className="text-[#4a9eff]" />
        <h3 className="text-xl font-mono font-bold text-white tracking-wider">VERBATIM INSTRUCTIONS</h3>
      </div>
      {steps.map(phase => (
        <div key={phase.phase} className="mb-6">
          <div className="flex items-center gap-3 mb-3 bg-[#152a47] rounded-lg px-4 py-2">
            <span className="text-2xl">{phase.icon}</span>
            <span className="text-white font-mono font-bold tracking-wider">{phase.phase}</span>
          </div>
          <div className="space-y-3">
            {phase.steps.map(step => (
              step.isWarning ? (
                <div key={step.num} className="foreman-warning rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <TriangleAlert size={24} className="text-white mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-white font-mono font-bold text-sm mb-1 uppercase tracking-widest">
                        ⚠️ STEP {step.num} — {step.title}
                      </div>
                      <p className="text-white/90 font-mono text-sm leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={step.num} className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-[#1e4d7a] text-[#4a9eff] rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 mt-0.5">
                      {step.num}
                    </div>
                    <div>
                      <div className="text-[#4a9eff] font-mono font-bold text-sm mb-1">{step.title}</div>
                      <p className="text-[#a0c4ff] font-mono text-sm leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProTipBox({ tip }) {
  return (
    <div className="pro-tip-box rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <Star size={20} className="text-[#4a9eff] mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-[#4a9eff] font-mono font-bold text-sm mb-1">⚡ PRO TIP</div>
          <p className="text-white font-mono text-sm leading-relaxed">{tip}</p>
        </div>
      </div>
    </div>
  );
}

function Disclaimer() {
  return (
    <div className="bg-[#1a0f0f] border border-[#7f1d1d] rounded-xl p-5 mb-6">
      <div className="flex items-start gap-3">
        <Shield size={24} className="text-[#ef4444] mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-[#ef4444] font-mono font-bold text-sm mb-2 uppercase tracking-widest">⚖️ LEGAL DISCLAIMER — READ BEFORE BUILDING</div>
          <p className="text-[#fca5a5] font-mono text-xs leading-relaxed">
            <strong>This document is for informational and planning purposes only.</strong> It does not constitute professional engineering advice. 
            All structural designs involving load-bearing members, elevated platforms, soil-anchored footings, or structures exceeding 200 sq ft or 30 inches above grade 
            <strong> may require a building permit and review by a licensed structural engineer</strong> in your jurisdiction.
            <br /><br />
            Always consult your local building department before construction. Failure to obtain required permits may result in fines, required demolition, 
            and voided homeowner's insurance. The creators of this application assume NO liability for construction decisions made based on this output.
            Local codes, soil conditions, wind loads, and seismic zones vary — what is safe in one location may be inadequate in another.
          </p>
        </div>
      </div>
    </div>
  );
}

function GenerationState({ projectData }) {
  const bibleRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const materials = calcMaterials(projectData);
  const steps = generateSteps(projectData, materials);

  const handleExport = async () => {
    setExporting(true);
    try {
      const el = bibleRef.current;
      const canvas = await html2canvas(el, {
        scale: 1.5,
        backgroundColor: '#0a1628',
        useCORS: true,
        logging: false,
        windowWidth: 900,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * pageW) / canvas.width;

      let yPos = 0;
      while (yPos < imgH) {
        if (yPos > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -yPos, imgW, imgH, undefined, 'FAST');
        yPos += pageH;
      }

      pdf.save(`${(projectData.projectName || 'Project').replace(/\s+/g, '_')}_Field_Manual.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('PDF export failed. Try printing using browser print (Ctrl+P).');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <HardHat size={32} className="text-[#4a9eff]" />
          <h1 className="text-3xl font-bold font-mono text-white tracking-wider">PROJECT BIBLE</h1>
        </div>
        <div className="text-[#4a9eff] font-mono font-bold text-xl measurement-text mb-1">
          {projectData.projectName || 'UNTITLED PROJECT'}
        </div>
        <div className="text-[#4a7aaa] font-mono text-sm">
          {inchesToFeetInches(projectData.width)} W × {inchesToFeetInches(projectData.depth)} D × {inchesToFeetInches(projectData.height)} H
        </div>
        {projectData.constraints && projectData.constraints.toLowerCase() !== 'none' && (
          <div className="text-[#f59e0b] font-mono text-xs mt-1">⚠️ SITE CONSTRAINT: {projectData.constraints}</div>
        )}
      </div>

      {/* Export button */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full bg-gradient-to-r from-[#1e5fcc] to-[#4a9eff] hover:from-[#2a6fd6] hover:to-[#5aabff] disabled:opacity-50 text-white font-mono font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-3 mb-6 transition-all shadow-lg shadow-blue-500/20"
      >
        <Download size={20} />
        {exporting ? 'GENERATING PDF...' : '📥 DOWNLOAD FIELD MANUAL (PDF)'}
      </button>

      {/* Bible content */}
      <div ref={bibleRef} className="space-y-6 blueprint-paper rounded-xl p-6">
        {/* Cover info */}
        <div className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-xl p-5 mb-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm font-mono">
            <div>
              <div className="text-[#4a7aaa] text-xs mb-1">PROJECT</div>
              <div className="text-white font-bold">{projectData.projectName}</div>
            </div>
            <div>
              <div className="text-[#4a7aaa] text-xs mb-1">DIMENSIONS (W×D×H)</div>
              <div className="text-[#6ee7b7] font-bold measurement-text">{projectData.width}" × {projectData.depth}" × {projectData.height}"</div>
            </div>
            <div>
              <div className="text-[#4a7aaa] text-xs mb-1">TARGET LOAD</div>
              <div className="text-white font-bold">{projectData.targetLoad}</div>
            </div>
            <div>
              <div className="text-[#4a7aaa] text-xs mb-1">SITE CONSTRAINTS</div>
              <div className="text-[#f59e0b] font-bold">{projectData.constraints}</div>
            </div>
            <div>
              <div className="text-[#4a7aaa] text-xs mb-1">SQUARE FOOTAGE</div>
              <div className="text-white font-bold measurement-text">{materials.sqFt} sq ft</div>
            </div>
            <div>
              <div className="text-[#4a7aaa] text-xs mb-1">EST. MATERIAL COST</div>
              <div className="text-[#4a9eff] font-bold measurement-text">${materials.items.reduce((s, i) => s + i.qty * i.unitCost, 0).toFixed(2)}</div>
            </div>
          </div>
        </div>

        {projectData.style && (
          <div className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-xl p-4 mb-2">
            <div className="text-[#4a9eff] font-mono font-bold text-sm mb-3">📸 VISION ANALYSIS RESULTS</div>
            <div className="grid grid-cols-2 gap-3 text-sm font-mono">
              {Object.entries(projectData.style).filter(([k]) => k !== 'confidence').map(([k, v]) => (
                <div key={k}>
                  <span className="text-[#4a7aaa] uppercase text-xs">{k}: </span>
                  <span className="text-white font-bold">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pro Tips */}
        <ProTipBox tip={`For any angles: A standard 45° miter (half of 90°) cuts are handled by your miter saw's default stop. For octagonal or hexagonal structures, you'll need **22.5°** cuts (360° ÷ 8 sides ÷ 2 = 22.5°). Set your miter saw to 22.5° for perfect octagon joins. Mark this angle in bold on your cut list BEFORE heading to the saw.`} />
        <ProTipBox tip={`Your project dimensions: ${projectData.width}" W × ${projectData.depth}" D. The diagonal distance is ${Math.sqrt(parseFloat(projectData.width)**2 + parseFloat(projectData.depth)**2).toFixed(2)}" — use this to verify square during layout. If both diagonals match, your layout is perfectly square (Pythagorean theorem: a²+b²=c²).`} />

        {/* SVG Diagrams */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-4">
            <BarChart2 size={24} className="text-[#4a9eff]" />
            <h3 className="text-xl font-mono font-bold text-white tracking-wider">ASSEMBLY DIAGRAMS</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-xl p-3">
              <YokeDiagram data={projectData} />
            </div>
            <div className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-xl p-3">
              <FramingDiagram data={projectData} />
            </div>
            <div className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-xl p-3">
              <DeckingDiagram data={projectData} />
            </div>
            <div className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-xl p-3">
              <FinishingDiagram data={projectData} />
            </div>
          </div>
        </div>

        {/* Shopping List */}
        <ShoppingList materials={materials} />

        {/* Instructions */}
        <InstructionSteps steps={steps} />

        {/* Disclaimer */}
        <Disclaimer />
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [appState, setAppState] = useState(STATES.DISCOVERY);
  const [projectData, setProjectData] = useState(null);

  const handleDiscoveryComplete = (answers) => {
    setProjectData(answers);
    setAppState(STATES.VISION);
  };

  const handleVisionComplete = (data) => {
    setProjectData(data);
    setAppState(STATES.GENERATION);
  };

  const progressState = appState === STATES.GENERATION ? 'done' : appState;

  return (
    <div className="blueprint-bg min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="bg-[#06101e] border-b border-[#1e3a5f] px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HardHat size={24} className="text-[#4a9eff]" />
            <span className="text-white font-mono font-bold text-lg tracking-widest">MEASURE TWICE</span>
          </div>
          <div className="flex items-center gap-2">
            <Ruler size={16} className="text-[#4a7aaa]" />
            <span className="text-[#4a7aaa] font-mono text-xs tracking-wider">FIELD INTELLIGENCE SYSTEM v1.0</span>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <ProgressBar currentState={progressState} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {appState === STATES.DISCOVERY && (
          <DiscoveryState onComplete={handleDiscoveryComplete} />
        )}
        {appState === STATES.VISION && (
          <VisionState projectData={projectData} onComplete={handleVisionComplete} />
        )}
        {appState === STATES.GENERATION && (
          <GenerationState projectData={projectData} />
        )}
      </main>
    </div>
  );
}
