import { useState, useRef, useEffect, useCallback } from 'react';
import {
  HardHat, Ruler, Upload, Download, AlertTriangle, CheckCircle,
  ChevronRight, Zap, Package, DollarSign, FileText, Eye, Hammer,
  TriangleAlert, Clipboard, Camera, ArrowRight, Star, Shield,
  BookOpen, Wrench, BarChart2, Info, Calendar, Layers, TrendingUp,
  AlertCircle, MapPin, Scissors, FileOutput, Clock
} from 'lucide-react';

// ─── DYNAMIC IMPORTS (code-split heavy libraries) ─────────────────────────────
const getPDF  = () => Promise.all([import('jspdf'), import('html2canvas')]);
const getDOCX = () => import('docx');

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

const STATES = { DISCOVERY: 'discovery', VISION: 'vision', GENERATION: 'generation' };

const PROGRESS_STEPS = [
  { label: 'Survey', state: STATES.DISCOVERY },
  { label: 'Analysis', state: STATES.VISION },
  { label: 'Drafting', state: STATES.GENERATION },
  { label: 'Final Bible', state: 'done' },
];

// ─── NLP ENGINE ────────────────────────────────────────────────────────────────
const CITY_CLIMATE = {
  miami:'Warm / Southern', orlando:'Warm / Southern', tampa:'Warm / Southern',
  jacksonville:'Warm / Southern', atlanta:'Warm / Southern', houston:'Warm / Southern',
  dallas:'Warm / Southern', austin:'Warm / Southern', phoenix:'Warm / Southern',
  tucson:'Warm / Southern', 'las vegas':'Warm / Southern','los angeles':'Warm / Southern',
  'san diego':'Warm / Southern', nashville:'Warm / Southern', memphis:'Warm / Southern',
  charlotte:'Temperate / Coastal', 'new york':'Temperate / Coastal', nyc:'Temperate / Coastal',
  boston:'Temperate / Coastal', seattle:'Temperate / Coastal', portland:'Temperate / Coastal',
  'san francisco':'Temperate / Coastal', richmond:'Temperate / Coastal', raleigh:'Temperate / Coastal',
  chicago:'Cold / Midwest', detroit:'Cold / Midwest', cleveland:'Cold / Midwest',
  columbus:'Cold / Midwest', indianapolis:'Cold / Midwest', cincinnati:'Cold / Midwest',
  denver:'Cold / Midwest', pittsburgh:'Cold / Midwest', philadelphia:'Cold / Midwest',
  minneapolis:'Very Cold / Northern', milwaukee:'Very Cold / Northern',
  buffalo:'Very Cold / Northern', anchorage:'Very Cold / Northern',
  'salt lake city':'Very Cold / Northern', omaha:'Very Cold / Northern',
};

const CLIMATE_KW = {
  'Warm / Southern':     ['florida','texas','alabama','louisiana','mississippi','arizona','nevada','georgia','south carolina','tropical','gulf coast'],
  'Temperate / Coastal': ['california','oregon','washington state','new jersey','maryland','virginia','connecticut','coastal','pacific northwest'],
  'Cold / Midwest':      ['illinois','ohio','indiana','michigan','iowa','missouri','kansas','colorado','nebraska','zone 5','zone 6'],
  'Very Cold / Northern':['minnesota','wisconsin','montana','wyoming','idaho','maine','vermont','alaska','north dakota','south dakota','canada','zone 3','zone 4'],
};

// ─── PROJECT TYPE MAP ─────────────────────────────────────────────────────────
const TYPE_MAP = [
  { kws: ['raised garden bed','raised bed','garden bed','planter box','raised planter'], type: 'raised-bed' },
  { kws: ['treehouse','tree house','playhouse','play house'],                             type: 'treehouse'  },
  { kws: ['pergola','gazebo','pavilion','carport'],                                       type: 'pergola'    },
  { kws: ['shed','workshop','barn','storage shed','outbuilding'],                         type: 'shed'       },
  { kws: ['deck','patio','platform','porch','balcony','dock','terrace'],                  type: 'deck'       },
];

function getProjectType(name = '') {
  const tl = (name || '').toLowerCase();
  for (const { kws, type } of TYPE_MAP) {
    if (kws.some(k => tl.includes(k))) return type;
  }
  return 'deck';
}

function toInches(n, unitStr) {
  if (!unitStr) return n <= 30 ? n * 12 : n;
  return /feet?|foot|ft/i.test(unitStr) ? n * 12 : n;
}

function parseAll(text, existing = {}) {
  const tl = text.toLowerCase();
  const up = {};

  // Dimensions: "10x12", "10 by 12 feet", "10 × 16"
  if (!existing.width || !existing.depth) {
    const m = text.match(/(\d+(?:\.\d+)?)\s*(?:feet?|foot|ft|')?\s*(?:by|x|×|\*)\s*(\d+(?:\.\d+)?)\s*(feet?|foot|ft|inches?|")?/i);
    if (m) {
      const unit = m[3] || (parseFloat(m[1]) <= 30 && parseFloat(m[2]) <= 30 ? 'ft' : 'in');
      if (!existing.width)  up.width  = String(Math.round(toInches(parseFloat(m[1]), unit)));
      if (!existing.depth)  up.depth  = String(Math.round(toInches(parseFloat(m[2]), unit)));
    }
  }

  // Width alone: "12 feet wide", "width of 10"
  if (!existing.width && !up.width) {
    const m = text.match(/(\d+(?:\.\d+)?)\s*(feet?|foot|ft|in(?:ches?)?|")?\s*wide/i)
           || text.match(/width\s*(?:is|of|[:=])?\s*(\d+(?:\.\d+)?)\s*(feet?|foot|ft|in(?:ches?)?|")?/i);
    if (m) up.width = String(Math.round(toInches(parseFloat(m[1]), m[2])));
  }

  // Depth/length alone: "14 feet long", "depth of 16"
  if (!existing.depth && !up.depth) {
    const m = text.match(/(\d+(?:\.\d+)?)\s*(feet?|foot|ft|in(?:ches?)?|")?\s*(?:long|deep)/i)
           || text.match(/(?:length|depth)\s*(?:is|of|[:=])?\s*(\d+(?:\.\d+)?)\s*(feet?|foot|ft|in(?:ches?)?|")?/i);
    if (m) up.depth = String(Math.round(toInches(parseFloat(m[1]), m[2])));
  }

  // Height
  if (!existing.height) {
    if (/ground.?level|at.?grade|at-grade|on.?the.?ground|no.?stairs?/i.test(tl)) {
      up.height = '6';
    } else if (/waist.?high|waist.?level/i.test(tl)) {
      up.height = '36';
    } else if (/knee.?high/i.test(tl)) {
      up.height = '24';
    } else {
      const m = text.match(/(\d+(?:\.\d+)?)\s*(feet?|foot|ft|in(?:ches?)?|")?\s*(?:off|above|high|tall|elevated|off\s+(?:the\s+)?ground)/i)
             || text.match(/height\s*(?:is|of|[:=])?\s*(\d+(?:\.\d+)?)\s*(feet?|foot|ft|in(?:ches?)?|")?/i);
      if (m) up.height = String(Math.round(toInches(parseFloat(m[1]), m[2])));
    }
  }

  // Project name + project type from type keywords
  if (!existing.projectName || !existing.projectType) {
    for (const { kws, type } of TYPE_MAP) {
      const matched = kws.find(k => tl.includes(k));
      if (matched) {
        if (!existing.projectName) {
          const safe = matched.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
          const pfx  = text.match(new RegExp(`([\\w]+\\s+)?${safe}`, 'i'));
          const raw  = pfx ? pfx[0].trim() : matched;
          up.projectName = raw.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
        }
        if (!existing.projectType) up.projectType = type;
        break;
      }
    }
  }

  // Climate
  if (!existing.climate) {
    for (const [city, zone] of Object.entries(CITY_CLIMATE)) {
      if (tl.includes(city)) { up.climate = zone; break; }
    }
    if (!up.climate) {
      for (const [zone, kws] of Object.entries(CLIMATE_KW)) {
        if (kws.some(k => tl.includes(k))) { up.climate = zone; break; }
      }
    }
  }

  // Constraints
  if (!existing.constraints) {
    if (/no\s+constraint|none|flat\s+(?:ground|yard)|level\s+(?:lot|yard|ground|site)|straightforward/i.test(tl)) {
      up.constraints = 'None';
    } else {
      const bits = [];
      if (/around\s+(?:a\s+)?tree|existing\s+tree/i.test(tl)) bits.push('Around existing tree');
      if (/corner|against\s+(?:a\s+)?(?:wall|fence|house)/i.test(tl)) bits.push('Corner/adjacent to structure');
      const sm = tl.match(/(\d+(?:\.\d+)?)\s*(?:inch|foot|ft|"|\')?\s*(?:drop|slope|fall|grade)/i);
      if (/slop|hill|uneven|grade drop|incline/i.test(tl)) bits.push(sm ? `Sloped — ${sm[1]}${/foot|ft/.test(sm[0]) ? "'" : '"'} drop` : 'Sloped ground');
      if (/attach|ledger|tied\s+to\s+(?:the\s+)?house/i.test(tl)) bits.push('Attached to house');
      if (/pool|hot\s*tub|spa/i.test(tl)) bits.push('Pool/spa adjacent');
      if (bits.length > 0) up.constraints = bits.join(', ');
    }
  }

  // Load
  if (!existing.targetLoad) {
    const np = tl.match(/(\d+)\s*(?:adult|person|people|guest)/i);
    if (np) up.targetLoad = `Adults — up to ${np[1]} people`;
    else if (/adult|entertain|party|gather|family/i.test(tl)) up.targetLoad = 'Adults — entertaining/family use';
    else if (/kid|child|children|play|playset/i.test(tl)) up.targetLoad = 'Children — play equipment';
    else if (/planter|garden|pot|plant|raised\s+bed/i.test(tl)) up.targetLoad = 'Heavy planters/garden containers';
    else if (/hot\s*tub|spa|jacuzzi/i.test(tl)) up.targetLoad = 'Hot tub / spa (engineered footings required)';
    else if (/grill|bbq|outdoor\s+kitchen/i.test(tl)) up.targetLoad = 'Outdoor kitchen / grill';
  }

  return up;
}

function getMissing(answers) {
  const m = [];
  if (!answers.width || !answers.depth) m.push('dimensions');
  return m;
}

function getInlineTips(answers) {
  const tips = [];
  const W = parseFloat(answers.width), D = parseFloat(answers.depth), H = parseFloat(answers.height);
  const sqFt = W && D ? (W / 12) * (D / 12) : 0;
  if (sqFt > 200) tips.push('⚡ TIP: At ' + sqFt.toFixed(0) + ' sq ft, a building permit is required in most US jurisdictions. Your Project Bible includes the full code advisory.');
  if (H > 30)     tips.push('⚡ TIP: Heights above 30" require code-compliant guardrails (min 36" high per IRC R312). Post and rail materials are included automatically.');
  if (W > 144)    tips.push('⚡ TIP: Width > 12\' exceeds standard 2×8 joist span — a mid-span center beam is added to your materials list automatically.');
  if (answers.targetLoad && /hot\s*tub/i.test(answers.targetLoad)) tips.push('⚡ TIP: Hot tubs weigh 4,000–6,000 lbs when full. Your build needs engineered footings — consult a structural engineer before permitting.');
  if (answers.constraints && /tree/i.test(answers.constraints)) tips.push('⚡ TIP: Root zones extend ~1.5× the canopy radius. Use post anchors (not poured footings) within that zone to protect roots and maintain drainage.');
  if (answers.climate === 'Very Cold / Northern') tips.push('⚡ TIP: Your frost depth is 60" — your footings go 66" deep. Rent a power auger unless you enjoy shoveling.');
  return tips;
}

function buildBotResponse(updates, allAnswers, turnCount) {
  const lines = [];
  const missing = getMissing(allAnswers);
  const tips = getInlineTips(allAnswers);

  // Summarize what was extracted this turn
  const got = [];
  if (updates.projectName) got.push(`project: "${updates.projectName}"`);
  if (updates.width && updates.depth) {
    const sqFt = ((parseFloat(updates.width) / 12) * (parseFloat(updates.depth) / 12)).toFixed(0);
    got.push(`${inchesToFeetInches(updates.width)} × ${inchesToFeetInches(updates.depth)} footprint (${sqFt} sq ft)`);
  } else {
    if (updates.width)  got.push(`width: ${inchesToFeetInches(updates.width)}`);
    if (updates.depth)  got.push(`depth: ${inchesToFeetInches(updates.depth)}`);
  }
  if (updates.height)      got.push(`${inchesToFeetInches(updates.height)} off grade`);
  if (updates.climate)     got.push(`climate: ${updates.climate}`);
  if (updates.constraints) got.push(`site: ${updates.constraints}`);
  if (updates.targetLoad)  got.push(`load: ${updates.targetLoad}`);
  if (got.length > 0) lines.push('✓  ' + got.join('  ·  '));

  // Append inline tips
  tips.forEach(t => lines.push(t));

  if (missing.length === 0) {
    const defaults = [];
    if (!allAnswers.height)      defaults.push('height: 36" (standard deck — update if different)');
    if (!allAnswers.constraints) defaults.push('site constraints: none assumed');
    if (!allAnswers.targetLoad)  defaults.push('load: general use');
    if (!allAnswers.climate)     defaults.push('climate: Temperate/Coastal — update in the bible if needed');
    if (defaults.length > 0) lines.push('📐 Locked with inferred defaults: ' + defaults.join(', ') + '.');
    lines.push('✅ All specs captured. Generating your Project Bible — shopping list, cut list, assembly diagrams, timeline, and export to PDF or DOCX.');
    return { text: lines.join('\n\n'), ready: true };
  }

  // Ask for what's still genuinely missing
  if (missing.includes('dimensions')) {
    if (turnCount >= 2) {
      lines.push('I just need the size to proceed. Try: "12 feet wide, 16 feet long" — or just "12x16". That\'s all I need.');
    } else if (turnCount === 1) {
      lines.push('Still need the footprint size. What\'s the width and the depth (or length)? Even a rough estimate works — e.g. "about 10×12".');
    } else {
      lines.push('What are the dimensions? Width and depth/length is all I need to get started. Something like "12 feet wide by 16 feet long", "10×14", or even "roughly 200 square feet" works.');
    }
  }

  return { text: lines.join('\n\n'), ready: false };
}

// Feature #8 — Regional Climate Advisor
const CLIMATE_DATA = {
  'Warm / Southern':     { frostDepth: 6,  permitSqFt: 200, windZone: 'High (80–130 mph)',    seismic: 'Low–Mod', footingNote: 'Minimum 12" depth; no frost concern' },
  'Temperate / Coastal': { frostDepth: 18, permitSqFt: 200, windZone: 'Moderate (70–90 mph)', seismic: 'Varies',  footingNote: 'Minimum 24" depth recommended' },
  'Cold / Midwest':      { frostDepth: 42, permitSqFt: 120, windZone: 'Moderate (70–80 mph)', seismic: 'Low',     footingNote: 'Minimum 48" below frost line required' },
  'Very Cold / Northern':{ frostDepth: 60, permitSqFt: 100, windZone: 'Low–Mod (60–80 mph)',  seismic: 'Low',     footingNote: 'Minimum 66" depth; engineered footings recommended' },
};

// Feature #7 — Material Tier multipliers
const TIER_MULTIPLIERS = {
  budget:   { label: 'BUDGET',   mult: 0.78, desc: 'Pressure-treated pine, standard hardware',          color: '#f59e0b' },
  standard: { label: 'STANDARD', mult: 1.00, desc: 'Cedar, joist hangers, structural screws',             color: '#4a9eff' },
  premium:  { label: 'PREMIUM',  mult: 1.42, desc: 'Composite/Redwood, hidden fasteners, stainless',     color: '#6ee7b7' },
};

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

function calcMaterials(data, tier = 'standard') {
  const H      = parseFloat(data.height) || 36;
  const W      = parseFloat(data.width)  || 96;
  const D      = parseFloat(data.depth)  || 144;
  const mult   = TIER_MULTIPLIERS[tier].mult;
  const OV     = 1.15;
  const sqFt   = (W / 12) * (D / 12);
  const perimFt = 2 * ((W / 12) + (D / 12));
  const type   = data.projectType || getProjectType(data.projectName);

  // ── RAISED BED / PLANTER BOX ────────────────────────────────────────────────
  if (type === 'raised-bed') {
    const boards    = Math.ceil(perimFt / 8 * OV) * 2;
    const cornPosts = 4 + Math.ceil((perimFt - 16) / 8);
    const screws    = Math.ceil(sqFt / 15);
    return {
      sqFt: sqFt.toFixed(1),
      items: [
        { category: 'Lumber',    name: tier === 'premium' ? '2×12 Cedar Side Boards (8ft)' : '2×10 Pressure-Treated Boards (8ft)', qty: boards,                       unit: 'pcs',   unitCost: +(14.50 * mult).toFixed(2), link: 'https://www.homedepot.com/s/2x10+pressure+treated' },
        { category: 'Lumber',    name: '4×4 Corner / Brace Posts (3ft)',                                                             qty: cornPosts,                    unit: 'pcs',   unitCost: +(8.99  * mult).toFixed(2), link: 'https://www.homedepot.com/s/4x4+post+stake' },
        { category: 'Hardware',  name: 'Galvanized Structural Screws 3" (1lb)',                                                      qty: screws,                       unit: 'lbs',   unitCost: +(12.99 * mult).toFixed(2), link: 'https://www.homedepot.com/s/galvanized+deck+screws' },
        { category: 'Hardware',  name: 'Galvanized Corner Brackets (flat plate)',                                                    qty: 4,                            unit: 'pcs',   unitCost: +(3.49  * mult).toFixed(2), link: 'https://www.homedepot.com/s/corner+bracket+galvanized' },
        { category: 'Specialty', name: 'Landscape Weed-Barrier Fabric',                                                             qty: Math.ceil(sqFt / 50),         unit: 'rolls', unitCost: +(18.49 * mult).toFixed(2), link: 'https://www.lowes.com/search?searchTerm=landscape+fabric' },
        { category: 'Specialty', name: 'Pea Gravel Drainage Base (50lb bag)',                                                       qty: Math.ceil(sqFt / 20),         unit: 'bags',  unitCost: +(6.99  * mult).toFixed(2), link: 'https://www.homedepot.com/s/pea+gravel+50lb' },
        { category: 'Specialty', name: 'Raised Bed Soil Mix (1.5 cu ft bag)',                                                       qty: Math.ceil(sqFt * 0.5),        unit: 'bags',  unitCost: +(11.97 * mult).toFixed(2), link: 'https://www.lowes.com/search?searchTerm=raised+bed+soil' },
      ],
    };
  }

  // ── PERGOLA / GAZEBO / PAVILION / CARPORT ───────────────────────────────────
  if (type === 'pergola') {
    const posts      = Math.ceil((perimFt / 8) + 2);
    const postBags   = posts * 2;
    const beams      = Math.ceil((D / 48) * 2 * OV);
    const rafters    = Math.ceil((W / 24) * OV);
    const screws     = Math.ceil(sqFt / 20);
    const rafterTies = Math.ceil(rafters * 2 * OV);
    return {
      sqFt: sqFt.toFixed(1),
      items: [
        { category: 'Lumber',    name: tier === 'premium' ? '6×6 Cedar Posts (10ft)' : '4×4 Posts (10ft)',              qty: posts,                        unit: 'pcs',  unitCost: +(24.00 * mult).toFixed(2), link: 'https://www.homedepot.com/s/4x4+post' },
        { category: 'Lumber',    name: tier === 'premium' ? '2×10 Cedar Beams (12ft)' : '2×8 Beams (10ft)',             qty: beams,                        unit: 'pcs',  unitCost: +(22.50 * mult).toFixed(2), link: 'https://www.homedepot.com/s/2x8+beam+lumber' },
        { category: 'Lumber',    name: tier === 'premium' ? '2×8 Cedar Rafters (12ft)' : '2×6 Rafters (10ft)',          qty: rafters,                      unit: 'pcs',  unitCost: +(14.75 * mult).toFixed(2), link: 'https://www.homedepot.com/s/2x6+rafter' },
        { category: 'Hardware',  name: 'Structural Deck Screws 3" (1lb)',                                                qty: screws,                       unit: 'lbs',  unitCost: +(14.99 * mult).toFixed(2), link: 'https://www.homedepot.com/s/structural+deck+screws' },
        { category: 'Hardware',  name: 'Rafter Ties / H-Clips (LUS26)',                                                 qty: rafterTies,                   unit: 'pcs',  unitCost: +(2.29  * mult).toFixed(2), link: 'https://www.lowes.com/search?searchTerm=rafter+tie+LUS26' },
        { category: 'Specialty', name: 'Post Base Anchors (ABA44)',                                                     qty: posts,                        unit: 'pcs',  unitCost: +(8.99  * mult).toFixed(2), link: 'https://www.homedepot.com/s/post+base+ABA44' },
        { category: 'Specialty', name: 'Quikrete Fast-Setting (50lb)',                                                  qty: postBags,                     unit: 'bags', unitCost: +(9.98  * mult).toFixed(2), link: 'https://www.homedepot.com/s/quikrete+fast+setting' },
        { category: 'Specialty', name: tier === 'premium' ? 'Cedar Penetrating Oil (1gal)' : 'Exterior Wood Sealant (1gal)', qty: Math.ceil(sqFt / 200), unit: 'gal',  unitCost: +(32.99 * mult).toFixed(2), link: 'https://www.lowes.com/search?searchTerm=exterior+wood+sealant' },
      ],
    };
  }

  // ── SHED / WORKSHOP / BARN ──────────────────────────────────────────────────
  if (type === 'shed') {
    const skids      = Math.ceil(D / 48) + 1;
    const floorJsts  = Math.ceil(W / 16 * OV);
    const subfloor   = Math.ceil(sqFt / 32);
    const studs      = Math.ceil(perimFt * 12 / 16 * OV);
    const sheathing  = Math.ceil(perimFt * (H / 12) / 32);
    const roofRafts  = Math.ceil(W / 24) * 2;
    const roofSheath = Math.ceil(sqFt * 1.2 / 32);
    return {
      sqFt: sqFt.toFixed(1),
      items: [
        { category: 'Lumber',    name: '4×6 PT Foundation Skids (16ft)',                                                            qty: skids,                        unit: 'pcs',     unitCost: +(42.00 * mult).toFixed(2), link: 'https://www.homedepot.com/s/4x6+pressure+treated+skid' },
        { category: 'Lumber',    name: '2×6 Floor Joists (10ft)',                                                                   qty: Math.ceil(floorJsts),         unit: 'pcs',     unitCost: +(12.50 * mult).toFixed(2), link: 'https://www.homedepot.com/s/2x6+floor+joist' },
        { category: 'Lumber',    name: '3/4" T&G Plywood Subfloor (4×8)',                                                          qty: subfloor,                      unit: 'sheets',  unitCost: +(52.00 * mult).toFixed(2), link: 'https://www.homedepot.com/s/3/4+tongue+groove+plywood' },
        { category: 'Lumber',    name: '2×4 Wall Studs 8ft (KD)',                                                                  qty: Math.ceil(studs),              unit: 'pcs',     unitCost: +(6.48  * mult).toFixed(2), link: 'https://www.homedepot.com/s/2x4+stud+8ft' },
        { category: 'Lumber',    name: tier === 'premium' ? 'LP SmartSide Panel (4×8)' : '7/16" OSB Sheathing (4×8)',             qty: Math.ceil(sheathing),          unit: 'sheets',  unitCost: +(28.50 * mult).toFixed(2), link: 'https://www.homedepot.com/s/osb+sheathing+4x8' },
        { category: 'Lumber',    name: '2×6 Roof Rafters (12ft)',                                                                  qty: roofRafts,                     unit: 'pcs',     unitCost: +(15.99 * mult).toFixed(2), link: 'https://www.homedepot.com/s/2x6+roof+rafter' },
        { category: 'Lumber',    name: '1/2" CDX Roof Sheathing (4×8)',                                                           qty: roofSheath,                     unit: 'sheets',  unitCost: +(38.00 * mult).toFixed(2), link: 'https://www.homedepot.com/s/1/2+cdx+plywood' },
        { category: 'Hardware',  name: 'Framing Nails 3.5" (1lb)',                                                                 qty: Math.ceil(sqFt / 30),          unit: 'lbs',     unitCost: +(9.99  * mult).toFixed(2), link: 'https://www.homedepot.com/s/framing+nails+3.5' },
        { category: 'Specialty', name: tier === 'premium' ? 'Architectural Shingles (100 sq ft/sq)' : 'Asphalt 3-Tab Shingles (100 sq ft/sq)', qty: Math.ceil(sqFt * 1.2 / 100), unit: 'squares', unitCost: +(104.00 * mult).toFixed(2), link: 'https://www.homedepot.com/s/asphalt+shingles' },
        { category: 'Specialty', name: 'Construction Adhesive PL400 (10oz)',                                                       qty: Math.ceil(sqFt / 40),          unit: 'tubes',   unitCost: +(6.99  * mult).toFixed(2), link: 'https://www.homedepot.com/s/PL400+construction+adhesive' },
      ],
    };
  }

  // ── TREEHOUSE / PLAYHOUSE ───────────────────────────────────────────────────
  if (type === 'treehouse') {
    const beams      = Math.ceil((D / 48) * 2 * OV);
    const joists     = Math.ceil(W / 16 * OV);
    const deckBoards = Math.ceil(sqFt / (5.5 / 12 * D / 12) * OV);
    const railPosts  = Math.ceil(perimFt / 4);
    const railBoards = Math.ceil(perimFt * 2);
    return {
      sqFt: sqFt.toFixed(1),
      items: [
        { category: 'Hardware',  name: 'Treehouse Attachment Bolts (TABs, 1-1/2" dia)',                                             qty: 4,                            unit: 'pcs', unitCost: +(89.00 * mult).toFixed(2), link: 'https://www.homedepot.com/s/treehouse+attachment+bolt' },
        { category: 'Hardware',  name: '1/2"×8" Structural Lag Screws',                                                             qty: 8,                            unit: 'pcs', unitCost: +(4.99  * mult).toFixed(2), link: 'https://www.homedepot.com/s/lag+screw+1/2+structural' },
        { category: 'Lumber',    name: '4×6 Support Beams (10ft)',                                                                  qty: beams,                        unit: 'pcs', unitCost: +(32.00 * mult).toFixed(2), link: 'https://www.homedepot.com/s/4x6+beam+lumber' },
        { category: 'Lumber',    name: '2×8 Platform Joists (10ft)',                                                                qty: joists,                       unit: 'pcs', unitCost: +(18.75 * mult).toFixed(2), link: 'https://www.homedepot.com/s/2x8+joist' },
        { category: 'Lumber',    name: tier === 'premium' ? '5/4×6 Cedar Decking (10ft)' : '2×6 PT Decking (8ft)',                 qty: deckBoards,                   unit: 'pcs', unitCost: +(14.50 * mult).toFixed(2), link: 'https://www.homedepot.com/s/2x6+decking' },
        { category: 'Lumber',    name: '4×4 Railing Posts (6ft)',                                                                   qty: railPosts,                    unit: 'pcs', unitCost: +(18.99 * mult).toFixed(2), link: 'https://www.homedepot.com/s/4x4+post' },
        { category: 'Lumber',    name: '2×4 Rail Boards (8ft)',                                                                     qty: railBoards,                   unit: 'pcs', unitCost: +(6.48  * mult).toFixed(2), link: 'https://www.homedepot.com/s/2x4+stud+8ft' },
        { category: 'Hardware',  name: 'Structural Deck Screws 3" (1lb)',                                                           qty: Math.ceil(sqFt / 20),         unit: 'lbs', unitCost: +(14.99 * mult).toFixed(2), link: 'https://www.homedepot.com/s/deck+screws' },
        { category: 'Hardware',  name: 'Heavy-Duty Joist Hangers HU28',                                                             qty: Math.ceil(joists * 2),        unit: 'pcs', unitCost: +(2.49  * mult).toFixed(2), link: 'https://www.lowes.com/search?searchTerm=joist+hanger+HU28' },
        { category: 'Specialty', name: tier === 'premium' ? 'Child-Safe Penetrating Oil (1gal)' : 'Exterior Wood Sealant (1gal)', qty: Math.ceil(sqFt / 200),        unit: 'gal', unitCost: +(34.99 * mult).toFixed(2), link: 'https://www.lowes.com/search?searchTerm=deck+sealant' },
      ],
    };
  }

  // ── DECK / PATIO / PLATFORM / PORCH / DOCK (default) ──────────────────────
  const deckingBoards = Math.ceil((sqFt / (5.5 / 12 * (D / 12))) * OV);
  const joists        = Math.ceil((W / 16) * OV);
  const beams         = Math.ceil((D / 48) * 2 * OV);
  const posts         = Math.ceil((perimFt / 6) + 2);
  const postBags      = posts * 2;
  const screws_lbs    = Math.ceil((sqFt / 25) * OV);
  const joist_hangers = Math.ceil(joists * 2 * OV);
  const ledger_bolts  = Math.ceil((D / 16) * OV);

  const n = {
    budget:   { decking: '2×6 SPF Decking (8ft)',          joist: '2×8 SPF Joists (10ft)',      beam: '4×6 SPF Beams (8ft)',    post: '4×4 Posts (10ft)',  screws: 'Deck Screws 1lb',                   hanger: 'Joist Hangers LU26',       bolt: '1/2" Carriage Bolts',           anchor: 'Post Base ABA44',          concrete: 'Quikrete Fast-Set (50lb)',          sealant: 'Basic Deck Sealant (1gal)' },
    standard: { decking: '2×6 Cedar Decking Boards (8ft)', joist: '2×8 Cedar Joists (10ft)',    beam: '4×6 Beams (8ft)',        post: '4×4 Posts (10ft)',  screws: 'Structural Deck Screws (1lb)',       hanger: 'Joist Hangers (LU26)',     bolt: '1/2" Carriage Bolts + Nuts',    anchor: 'Post Base Anchors (ABA44)',concrete: 'Quikrete Fast-Setting (50lb)',      sealant: 'Waterproof Deck Sealant (1gal)' },
    premium:  { decking: '5/4×6 Composite Decking (16ft)', joist: '2×10 Treated Joists (12ft)', beam: '4×8 LVL Beams (8ft)',    post: '6×6 Posts (10ft)',  screws: 'Stainless Hidden Fasteners (100ct)', hanger: 'Triple-Zinc Hangers LU28', bolt: '5/8" Stainless Carriage Bolts', anchor: 'HD Galv Post Base ABA66',  concrete: 'Structural Concrete 4000psi (50lb)', sealant: 'Penetrating Oil Finish (1gal)' },
  }[tier];

  return {
    sqFt: sqFt.toFixed(1),
    items: [
      { category: 'Lumber',   name: n.decking, qty: deckingBoards,           unit: 'pcs',  unitCost: +(12.50 * mult).toFixed(2), link: 'https://www.homedepot.com/s/2x6+decking' },
      { category: 'Lumber',   name: n.joist,   qty: joists,                  unit: 'pcs',  unitCost: +(18.75 * mult).toFixed(2), link: 'https://www.homedepot.com/s/2x8+joist' },
      { category: 'Lumber',   name: n.beam,    qty: beams,                   unit: 'pcs',  unitCost: +(28.00 * mult).toFixed(2), link: 'https://www.lowes.com/search?searchTerm=4x6+beam' },
      { category: 'Lumber',   name: n.post,    qty: posts,                   unit: 'pcs',  unitCost: +(22.00 * mult).toFixed(2), link: 'https://www.homedepot.com/s/4x4+post' },
      { category: 'Hardware', name: n.screws,  qty: screws_lbs,              unit: 'lbs',  unitCost: +(14.99 * mult).toFixed(2), link: 'https://www.homedepot.com/s/deck+screws' },
      { category: 'Hardware', name: n.hanger,  qty: joist_hangers,           unit: 'pcs',  unitCost: +(1.89  * mult).toFixed(2), link: 'https://www.lowes.com/search?searchTerm=joist+hanger+LU26' },
      { category: 'Hardware', name: n.bolt,    qty: ledger_bolts,            unit: 'pcs',  unitCost: +(0.85  * mult).toFixed(2), link: 'https://www.homedepot.com/s/carriage+bolt+1/2' },
      { category: 'Specialty',name: n.anchor,  qty: posts,                   unit: 'pcs',  unitCost: +(8.99  * mult).toFixed(2), link: 'https://www.homedepot.com/s/post+base+ABA44' },
      { category: 'Specialty',name: n.concrete,qty: postBags,                unit: 'bags', unitCost: +(9.98  * mult).toFixed(2), link: 'https://www.homedepot.com/s/quikrete+fast+setting' },
      { category: 'Specialty',name: n.sealant, qty: Math.ceil(sqFt / 200),  unit: 'gal',  unitCost: +(34.99 * mult).toFixed(2), link: 'https://www.lowes.com/search?searchTerm=deck+sealant' },
    ],
  };
}

// ─── STEP GENERATORS (per project type) ──────────────────────────────────────

function _stepsRaisedBed(data) {
  const W    = parseFloat(data.width)  || 48;
  const D    = parseFloat(data.depth)  || 96;
  const H    = parseFloat(data.height) || 12;
  const soilCuFt = Math.ceil((W / 12) * (D / 12) * (H / 12) * 1.25);
  const soilBags = Math.ceil(soilCuFt / 1.5);
  return [
    {
      phase: 'SITE SELECTION & LAYOUT', icon: '📍',
      steps: [
        { num: 1, title: 'Choose & Mark Your Location', isWarning: false,
          desc: `Select a spot with at least 6 hours of direct sunlight (vegetables need full sun; herbs tolerate partial shade). Mark your ${inchesToFeetInches(W)} × ${inchesToFeetInches(D)} footprint with stakes and string. Check that the ground is within 2" of level across the full footprint.\n\n⚡ TIP: Orient the long axis east-west to maximize even light exposure across the full bed width. Avoid low spots — even perfectly drained beds sitting in chronic wet soil will cause root rot and structural wood decay over time.` },
        { num: 2, title: 'Clear & Prep the Ground', isWarning: false,
          desc: `Remove all sod and deep-rooted weeds within the footprint — they WILL push through landscape fabric if left in place. Grade to within 1" of level using a 4ft level on a straight 2×4.\n\n⚡ TIP: If your slope drops more than 2" across the footprint, add diagonal cross-braces inside the lower corner to prevent the frame from racking outward under soil pressure. Soil weight is deceiving — a 4×8 bed filled 12" deep holds nearly 1,000 lbs.` },
      ],
    },
    {
      phase: 'FRAME CONSTRUCTION', icon: '🪚',
      steps: [
        { num: 3, title: 'Cut Side Boards', isWarning: false,
          desc: `Cut two long-side boards to ${inchesToFeetInches(D)} and two short-side boards to ${inchesToFeetInches(W)}. Use 2×10 or 2×12 lumber for best root development depth. For beds deeper than 12", stack two courses of boards.\n\n⚡ TIP: Pressure-treated lumber marked "CA-B" (ground contact) is safe for food gardens — the old arsenic-based CCA treatment was banned in 2004. Cedar and redwood are naturally rot-resistant with no treatment required. Either is an excellent choice.` },
        { num: 4, title: 'Assemble the Corner Frame', isWarning: false,
          desc: `Drive 4×4 corner posts 3–4" into the ground at each corner for stability. Fasten boards to each post with (2) 3" galvanized screws per board-end. For beds longer than 8ft (yours is ${inchesToFeetInches(D)}), add a mid-span brace post on each long side.\n\n⚡ TIP: Pre-drill all screw holes at board ends — pressure-treated and cedar lumber both split easily near end grain without pilot holes. Use a 3/32" bit for 3" screws.` },
        { num: 5, title: "FOREMAN'S WARNING: Long Boards Will Bow Without Mid-Span Bracing", isWarning: true,
          desc: `Your ${inchesToFeetInches(W)} × ${inchesToFeetInches(D)} bed filled to ${H}" depth holds significant lateral soil pressure. Without mid-span posts on the long sides OR galvanized cross-tie rods, boards WILL bow outward within 1–2 seasons. Fix it now: (1) add mid-span posts on both long sides, OR (2) run a galvanized threaded rod across the width at mid-span with washers and nuts on each end. Retrofit after filling is much harder.` },
      ],
    },
    {
      phase: 'DRAINAGE & LINER', icon: '💧',
      steps: [
        { num: 6, title: 'Install Weed-Barrier Fabric', isWarning: false,
          desc: `Cut and lay landscape weed-barrier fabric across the bottom of the frame. Overlap seams by 6" and staple the edges 4–6" up the inside walls. DO NOT use plastic sheeting — it blocks drainage and kills roots within one season.\n\n⚡ TIP: Use fabric rated at 3+ oz per sq yard. The cheap 1.5 oz rolls sold in garden centers deteriorate in 1–2 years and allow weeds through. The extra $10 for heavier fabric is a 10-year investment.` },
        { num: 7, title: 'Add Drainage Gravel Layer', isWarning: false,
          desc: `Pour 2–3" of pea gravel across the bottom before adding soil. This drainage layer prevents waterlogging and extends the life of the wood frame by keeping the base from staying saturated.\n\n⚡ TIP: In sandy, well-draining soil locations, the gravel layer is optional. For average suburban soil — which is typically clay-heavy — this step alone can double the productive lifespan of the bed.` },
      ],
    },
    {
      phase: 'FILL & FINISHING', icon: '🌱',
      steps: [
        { num: 8, title: 'Fill with Raised Bed Soil Mix', isWarning: false,
          desc: `Use a blend: 60% topsoil, 30% compost, 10% perlite or coarse sand. Fill to 1–2" below the top edge. At ${H}" depth, your bed needs approximately ${soilCuFt} cu ft of mix — about ${soilBags} bags at 1.5 cu ft each.\n\n⚡ TIP: "Mel's Mix" (⅓ peat moss, ⅓ vermiculite, ⅓ blended compost) is the gold standard for raised beds — more expensive upfront but requires no amendment for years. For food growing, always verify compost is OMRI-listed or organically certified.` },
        { num: 9, title: 'Install Cap Rail (Recommended)', isWarning: false,
          desc: `Screw a 2×4 or 2×6 flat cap rail on top of the frame using 2" exterior screws. This gives a clean finished edge, a place to sit while planting, and keeps soil from washing out during heavy rain.\n\n⚡ TIP: Before screwing the cap rail down, staple 1/4" galvanized hardware cloth across the entire bottom of the bed interior if gophers or moles are present. This is the most effective permanent pest barrier available — retrofitting after filling is essentially impossible.` },
      ],
    },
  ];
}

function _stepsPergola(data) {
  const W        = parseFloat(data.width)  || 144;
  const D        = parseFloat(data.depth)  || 192;
  const cd       = CLIMATE_DATA[data.climate] || CLIMATE_DATA['Temperate / Coastal'];
  const frostDig = cd.frostDepth + 12;
  return [
    {
      phase: 'SITE PREPARATION', icon: '📍',
      steps: [
        { num: 1, title: 'Layout & Post Hole Locations', isWarning: false,
          desc: `Mark the ${inchesToFeetInches(W)} × ${inchesToFeetInches(D)} footprint. Minimum posts at all four corners. For spans over 12ft, add intermediate posts every 8ft. Pull batter board strings and verify diagonals match (${Math.sqrt(W*W+D*D).toFixed(1)}") to confirm square.\n\n⚡ TIP: For a house-attached pergola, the ledger board on the house replaces one beam line. Use 1/2" × 3-1/2" LedgerLOK screws into the rim joist at 16" O.C., not into siding. Flash the ledger connection with step flashing to prevent moisture intrusion behind the siding.` },
        { num: 2, title: "FOREMAN'S WARNING: Call 811 Before You Dig", isWarning: true,
          desc: `CALL 811 at least 3 business days before digging any post holes. This is federal law. Buried gas, electric, water, and telecom lines run through most residential yards. Hitting one means electrocution risk and a $10,000+ utility repair bill — not counting project downtime or permit complications.` },
      ],
    },
    {
      phase: 'FOOTING & POST INSTALLATION', icon: '🏗️',
      steps: [
        { num: 3, title: 'Excavate & Pour Post Footings', isWarning: false,
          desc: `Dig to ${frostDig}" depth for your climate zone (${data.climate || 'Temperate / Coastal'}). ${cd.footingNote}. Use tube forms. Dry-pour Quikrete Fast-Set, brace posts plumb on two adjacent faces, and do not disturb for 48 hours.\n\n⚡ TIP: Pergola posts carry significant wind uplift load — especially once shade cloth or vines are added. Use 6×6 posts for any span over 10ft. 4×4 posts on large pergolas visibly flex in moderate wind and give a cheap feel to an otherwise quality build.` },
        { num: 4, title: 'Set Posts in Adjustable Post Bases', isWarning: false,
          desc: `Set posts in adjustable post base anchors (ABU44/ABU66) to elevate post end grain 1" above the concrete surface. Secure with (4) 1/2" × 5" structural bolts per base. Verify plumb on all four faces with a 4ft level.\n\n⚡ TIP: The 1" elevation above concrete is not decorative — end grain sitting in standing water is the #1 cause of post rot. Posts sitting on concrete rot from the inside out over 8–12 years with no visible warning until they fail. The adjustable base makes them last 30+ years with periodic sealant.` },
      ],
    },
    {
      phase: 'BEAM INSTALLATION', icon: '🔩',
      steps: [
        { num: 5, title: 'Install Double Beams Across Post Tops', isWarning: false,
          desc: `Set 2×8 or 2×10 double beams across post tops using post cap hardware (BC46 or BC66). Fasten each beam to the post cap with (2) 1/2" × 7" carriage bolts. For decorative end profiles, cut beam ends with a jigsaw BEFORE installation.\n\n⚡ TIP: Pre-cut all beam end profiles identically using a cardboard template. Consistent profiles are the mark of craftsmanship — even a simple angled cut looks far more intentional than a square raw end.` },
        { num: 6, title: "FOREMAN'S WARNING: Beam Cantilever Limits", isWarning: true,
          desc: `Beams can overhang past the outer posts, but ONLY up to 2× the beam depth. For 2×8 beams, max cantilever = 16" past post center. For 2×10, max = 20". Exceeding these limits causes shear failure at the post connection — the beam splits at the support point under load.` },
      ],
    },
    {
      phase: 'RAFTER & LATTICE INSTALLATION', icon: '⚒️',
      steps: [
        { num: 7, title: 'Install Rafters at 16"–24" O.C.', isWarning: false,
          desc: `Set 2×6 rafters perpendicular to the beams at 16–24" O.C. Secure with rafter tie hardware (LUS26 or H-clips) at every beam connection. Extend rafters 6–12" past the outer beam for a traditional overhang.\n\n⚡ TIP: Cut a "birdsmouth" notch on each rafter end where it bears on the beam — this gives full contact bearing instead of a point load. It's a one-time skill investment (15 minutes to learn from a video) and dramatically increases frame rigidity.` },
        { num: 8, title: 'Install Lattice / Cross-Purlins', isWarning: false,
          desc: `Install 2×4 purlins on top of the rafters at 12–16" O.C. for a lattice appearance. Notch purlins where they cross rafters with a chisel for a flush, integrated look. Purlins also become the support anchor for shade cloth or climbing plants.\n\n⚡ TIP: If you plan to grow heavy vines (wisteria, roses, grapes), install eyebolts or wire run guides at the purlin level now. Mature wisteria can add 300–500 lbs of dead load — wire guides distribute that load far better than plant stems wrapping around lumber.` },
      ],
    },
    {
      phase: 'FINISHING & PROTECTION', icon: '✨',
      steps: [
        { num: 9, title: 'Sand & Apply Exterior Finish', isWarning: false,
          desc: `Sand all surfaces — 80-grit then 120-grit. Apply penetrating oil or semitransparent stain rated for vertical surfaces. Two coats, 24 hours apart. Pay extra attention to beam ends — end grain absorbs 3× more finish than face grain.\n\n⚡ TIP: Apply on an overcast day between 55–75°F. Direct sun skins sealant over before it penetrates and causes peeling within a year. "Vertical surface" rated products are specifically formulated to not run off vertical members before penetrating.` },
        { num: 10, title: "FOREMAN'S WARNING: Wind Load Final Check", isWarning: true,
          desc: `BEFORE DECLARING DONE: Pull-test every post — any rocking = re-pour. Check all rafter tie hardware. Apply 200 lbs static load to the center beam span and observe. Your climate zone (${data.climate || 'Temperate / Coastal'}) carries ${cd.windZone} design wind load — ensure all post-to-beam and beam-to-rafter connections use rated hardware, not just screws.` },
      ],
    },
  ];
}

function _stepsShed(data) {
  const W    = parseFloat(data.width)  || 144;
  const D    = parseFloat(data.depth)  || 144;
  const H    = parseFloat(data.height) || 96;
  const sqFt = ((W / 12) * (D / 12)).toFixed(0);
  const cd   = CLIMATE_DATA[data.climate] || CLIMATE_DATA['Temperate / Coastal'];
  return [
    {
      phase: 'SITE CLEARING & FOUNDATION', icon: '🏗️',
      steps: [
        { num: 1, title: 'Clear, Level & Prep Site', isWarning: false,
          desc: `Clear the ${inchesToFeetInches(W)} × ${inchesToFeetInches(D)} footprint — all sod, roots, and debris removed. Grade within 1" of level. Add 4–6" of compacted crushed gravel over the full footprint for permanent drainage under the floor system.\n\n⚡ TIP: Mark the gravel pad 1ft oversize all around — you'll need that clearance for wall framing and sheathing installation. A tight footprint makes every step harder than it needs to be.` },
        { num: 2, title: 'Set Pressure-Treated Foundation Skids', isWarning: false,
          desc: `Lay 4×6 PT skids across the leveled footprint, spaced every 4ft. Level each skid within 1/4" and verify they are level relative to each other by spanning a long board between them.\n\n⚡ TIP: Treat ALL cut ends of pressure-treated lumber with copper-naphthenate before assembly. Factory PT treatment only penetrates the outer 1/4" — fresh-cut ends are completely unprotected and will rot from the inside out within 5 years if left untreated.` },
        { num: 3, title: "FOREMAN'S WARNING: Verify Permit Requirements", isWarning: true,
          desc: `STOP BEFORE BUILDING: Your structure is ${sqFt} sq ft. Most US jurisdictions require a building permit for sheds over 100–200 sq ft. Contact your local building department BEFORE starting. Unpermitted structures may be required to be demolished at your full expense — total loss with zero recourse. Many homeowner's insurance policies also deny claims on unpermitted structures.` },
      ],
    },
    {
      phase: 'FLOOR FRAMING', icon: '📐',
      steps: [
        { num: 4, title: 'Install Floor Joists', isWarning: false,
          desc: `Set 2×6 floor joists across the skids at 16" O.C. Use joist hangers or toenail at 45°. Install blocking between joists mid-span for any run over 8ft.\n\n⚡ TIP: Crown your floor joists — sit each joist on edge and sight down it. The natural slight bow should point UP. A crowned floor joist in a shed is invisible; a floor that sags under tool weight will ruin the user experience.` },
        { num: 5, title: 'Install Subfloor', isWarning: false,
          desc: `Lay 3/4" tongue-and-groove plywood subfloor. Stagger all panel seams — never let four corners meet at one point. Apply construction adhesive to every joist top before nailing. Use ring-shank nails or subfloor screws at 8" O.C. on edges, 12" in the field.\n\n⚡ TIP: Keep fasteners minimum 3/8" from all panel edges — closer splits plywood regardless of species. Mark a light pencil line on each panel edge before fastening so you automatically stay back from the edge.` },
      ],
    },
    {
      phase: 'WALL FRAMING', icon: '🪚',
      steps: [
        { num: 6, title: 'Frame Walls Flat, Then Tilt Up', isWarning: false,
          desc: `Build walls flat on the subfloor deck, then tilt plumb. Bottom plate: pressure-treated 2×4. Top plate: double 2×4 for load transfer. Studs at 16" O.C. Mark all door and window openings in the layout plan before cutting.\n\n⚡ TIP: Frame both long walls first. Tilt them up, brace with 2×4 kickers to stakes in the ground. Then frame the shorter end walls to fit BETWEEN the long walls — this locks the entire structure and eliminates most measurement error.` },
        { num: 7, title: 'Apply Wall Sheathing', isWarning: false,
          desc: `Fasten OSB or LP SmartSide panels to the wall framing — run panels vertically to eliminate blocking at horizontal seams and maximize shear strength in one step. Leave 1/2" gap at the bottom plate, 1/8" between panels.\n\n⚡ TIP: Apply sheathing to each wall while still flat on the deck, before tilting up. This is significantly faster and produces straighter results. Leave only the corner joints open until after tilt-up so panels don't interfere with the tilt.` },
        { num: 8, title: "FOREMAN'S WARNING: Anchor Every Wall to Foundation", isWarning: true,
          desc: `EVERY WALL MUST be mechanically anchored to the skid foundation — hurricane ties or foundation anchor bolts at maximum 4ft intervals. An unanchored shed in a 60 mph wind becomes a projectile. It will hit your neighbor's car, your fence, or a person. There is no code jurisdiction in the US where unanchored shed walls are acceptable.` },
      ],
    },
    {
      phase: 'ROOF FRAMING & SHEATHING', icon: '🏠',
      steps: [
        { num: 9, title: 'Frame Gable Roof', isWarning: false,
          desc: `For a standard gable: cut 2×6 rafter pairs at 24" O.C. with 4:12 pitch (4" rise per 12" run). Assemble pairs with a 2×8 ridge board at the peak. Install hurricane ties at every rafter-to-wall-plate connection — these are code-required in most jurisdictions.\n\n⚡ TIP: Build a rafter jig from two scrap pieces at the correct pitch angle. Use it to mark and cut every rafter precisely alike. Without a jig, variation accumulates and you'll fight ridge board alignment for hours. A 10-minute jig saves 2 hours of frustration.` },
        { num: 10, title: 'Install Roof Sheathing', isWarning: false,
          desc: `Lay 1/2" CDX plywood on rafters, perpendicular to rafters with staggered seams. Nail at 6" O.C. on edges, 12" in field. Then install: drip edge → 15lb roofing felt → shingles (always bottom to top, each course overlapping the one below by 6").\n\n⚡ TIP: Apply a bead of roofing sealant under the eave drip edge where it meets the sheathing. This gap is the #1 ice dam entry point in ${data.climate === 'Very Cold / Northern' || data.climate === 'Cold / Midwest' ? 'your climate zone' : 'colder climates'}. Five minutes with a caulk gun prevents costly interior water damage.` },
      ],
    },
    {
      phase: 'DOORS, TRIM & FINISHING', icon: '✨',
      steps: [
        { num: 11, title: 'Hang Door & Install Trim', isWarning: false,
          desc: `Use a pre-hung door unit for fastest results. Install exterior door trim (J-channel or wood casing). Caulk all exterior trim seams with paintable exterior caulk. Use a pressure-treated 2×6 on edge as the door threshold — the standard pine threshold included with pre-hung units rots in 2–3 outdoor seasons.\n\n⚡ TIP: Set the door for a 1/8" clearance gap on all sides before fastening. Check that it swings and latches freely. Doors installed tight will bind seasonally as the frame moves with moisture and temperature cycles.` },
        { num: 12, title: "FOREMAN'S WARNING: Final Inspection Checklist", isWarning: true,
          desc: `BEFORE DECLARING DONE: Every hurricane tie installed and nailed? Ridge board fully fastened at all rafter connections? All wall-to-floor anchors secure? Doors and windows operate freely? All exterior caulk seams completed? Check the roof from inside with a flashlight — look for visible daylight at the ridge or any rafter end. Any daylight = a leak path to fix before first rain.` },
      ],
    },
  ];
}

function _stepsTreehouse(data) {
  const W = parseFloat(data.width)  || 96;
  const D = parseFloat(data.depth)  || 120;
  const H = parseFloat(data.height) || 72;
  return [
    {
      phase: 'TREE ASSESSMENT & SAFETY PLANNING', icon: '🌳',
      steps: [
        { num: 1, title: 'Assess Tree Health — Hire an Arborist', isWarning: false,
          desc: `Verify the tree is structurally sound: no fungal growth at the base, no hollow sections (tap and listen for dead sound), firm bark all around, no dead branches in the canopy. Best species: oak, maple, Douglas fir, pine. Avoid: willow, birch, box elder (fast growing, brittle, prone to sudden branch failure).\n\n⚡ TIP: One hour with a certified arborist costs ~$150. They assess load capacity, hidden rot, and disease risk — information you cannot get any other way. This is the single highest-ROI investment you can make on a treehouse build.` },
        { num: 2, title: "FOREMAN'S WARNING: Never Use Multiple Rigid Attachment Points", isWarning: true,
          desc: `CRITICAL: Do NOT use multiple bolts or lag screws that all bear rigidly against a living tree. As the tree grows 1–2" in diameter per decade, rigid multi-point connections shear and split the trunk from inside over 5–7 years — with no visible warning until catastrophic failure. REQUIRED: Use Treehouse Attachment Bolts (TABs) designed with lateral movement allowance, OR design a single-point support with knee braces that rest against the tree without through-bolting it.` },
      ],
    },
    {
      phase: 'ANCHOR SYSTEM INSTALLATION', icon: '⚓',
      steps: [
        { num: 3, title: 'Install Treehouse Attachment Bolts (TABs)', isWarning: false,
          desc: `Drill a 1-3/4" hole 12–18" deep perpendicular into the trunk at beam height. Drive the TAB hardware into the hole. Tighten snug + exactly 1/4 turn with a wrench — DO NOT overtighten. The tree heals around a properly installed TAB over several growing seasons.\n\n⚡ TIP: Both TABs must be at IDENTICAL heights — even 1/4" off and one TAB carries the full load while the other hangs in tension. Use a self-leveling laser or water level to match heights across the tree before drilling.` },
        { num: 4, title: 'Set Primary Support Beams', isWarning: false,
          desc: `Set 4×6 beams across the installed TABs using the bracket hardware. The bracket is designed to allow lateral sway — do not rigidize this connection. Leave a 3/4"–1" clearance gap between the beam and the trunk wherever they pass alongside each other.\n\n⚡ TIP: The gap between beam and trunk is structural, not aesthetic. A beam bearing against the trunk causes bark compression, cambium damage, and disease entry. Trees must be able to sway independently of the structure they're supporting.` },
      ],
    },
    {
      phase: 'PLATFORM FRAMING', icon: '🏗️',
      steps: [
        { num: 5, title: 'Frame the Floor Platform', isWarning: false,
          desc: `Install 2×8 joists perpendicular to the main beam using heavy-duty joist hangers (HU28). Add outer rim joists and double the rim on the entry side for added load. Your ${inchesToFeetInches(W)} × ${inchesToFeetInches(D)} platform uses approximately ${Math.ceil(W / 16)} floor joists.\n\n⚡ TIP: For a children's play platform, design for 4× anticipated live load. If 4 kids (~400 lbs) will use this, engineer for 1,600 lbs concentrated load minimum. HU28 hangers are rated at 2,100 lbs each vs. 850 lbs for standard LU26 — use the right hardware.` },
        { num: 6, title: 'Install Decking', isWarning: false,
          desc: `Set 2×6 PT or cedar decking at 1/8" gap. Pre-drill every board near the ends to prevent splitting. Use (2) 3" structural screws per joist crossing. Leave a 1-1/2" clearance gap around the tree trunk — trees grow 1–2" in diameter per decade.\n\n⚡ TIP: Mark the trunk clearance circle with a pencil and chalk line before running boards. One of the most common treehouse mistakes is running decking tight to the trunk — within 3–5 years the board cracks and pulls fasteners from the framing.` },
      ],
    },
    {
      phase: 'RAILINGS & ACCESS', icon: '🪜',
      steps: [
        { num: 7, title: 'Install Code-Compliant Safety Railings', isWarning: false,
          desc: `Rail posts at every corner plus maximum every 4ft of perimeter. All post connections: through-bolts, never screws alone. Guardrail height: minimum 36" for platforms up to 12ft high; 42" for higher platforms per IRC R312. Through-bolt every post with (2) 1/2" structural bolts.\n\n⚡ TIP: Test every rail opening with a 4" sphere (a standard tennis ball works). Any gap wider than 4" is a code violation and a strangulation hazard for children under 5. This takes 3 minutes to verify and is non-negotiable on any play structure.` },
        { num: 8, title: 'Install Ladder or Access Stairs', isWarning: false,
          desc: `For your ${inchesToFeetInches(H)} platform height: ${parseFloat(H) <= 120 ? `a fixed ladder with 10"–12" rung spacing is appropriate. Angle the ladder 10–15° from vertical — this dramatically reduces forearm fatigue during descent and is significantly safer for children than a true vertical ladder.` : `a ship's ladder (50–70° angle) is strongly preferred at this height. Space rungs 10"–12" O.C. with handrails on both sides of the ladder.`}\n\n⚡ TIP: Vertical ladders are marketed as space-saving but children cannot safely see their feet during descent. A 10° tilt from vertical costs zero extra materials and is meaningfully safer — use it every time.` },
        { num: 9, title: "FOREMAN'S WARNING: No Exposed Hardware Above Deck Level", isWarning: true,
          desc: `MANDATORY: EVERY bolt head, screw head, and sharp corner above deck surface must be countersunk or capped. Children fall on play structures — hardware at knee/elbow height causes lacerations requiring stitches. Countersink all screws flush with wood. Install bolt caps on all through-bolts. Run your bare forearm across every surface before sign-off; if it snags you, it will definitely injure a child at full speed.` },
      ],
    },
    {
      phase: 'FINISHING & SAFETY AUDIT', icon: '🔍',
      steps: [
        { num: 10, title: 'Sand All Edges & Apply Child-Safe Finish', isWarning: false,
          desc: `Round every exposed edge with 60-grit sandpaper — especially all railings, ladder rungs, and decking edges. Apply a child-safe exterior penetrating oil (zero-VOC when cured). Avoid film-building finishes (paint, varnish) that chip into splinters.\n\n⚡ TIP: Your final QA: run your bare arm firmly across EVERY surface while crouching (child's eye level). If anything snags or scratches you, it will injure a child. The sanding pass is not decorative — it is the primary safety gate for this structure.` },
        { num: 11, title: "FOREMAN'S WARNING: Mandatory Load Test + Annual Inspection", isWarning: true,
          desc: `BEFORE ANY CHILD USES IT: Load-test with 4 adults standing and applying bounce loads simultaneously in the center of the platform. Check all TAB connections for any movement (there should be zero). Verify every joist hanger is fully nailed and every post is bolted tight. CRITICAL: Schedule and perform an annual structural inspection every year. Trees grow and shift load distribution on hardware every season. This is an ongoing maintenance commitment, not optional.` },
      ],
    },
  ];
}

function _stepsDeck(data) {
  const H  = parseFloat(data.height) || 36;
  const W  = parseFloat(data.width)  || 96;
  const D  = parseFloat(data.depth)  || 144;
  const cd = CLIMATE_DATA[data.climate] || CLIMATE_DATA['Temperate / Coastal'];
  const frostDig = cd.frostDepth + 12;
  return [
    {
      phase: 'SITE PREPARATION', icon: '📍',
      steps: [
        { num: 1, title: 'Layout & Batterboards', isWarning: false,
          desc: `Mark your ${inchesToFeetInches(W)} × ${inchesToFeetInches(D)} footprint using batter boards and mason line. Pull diagonal measurements corner-to-corner — both diagonals MUST match. Tolerance: ±1/4". Your diagonal = ${Math.sqrt(W*W+D*D).toFixed(1)}".\n\n⚡ TIP: Mark batter boards 2–3 ft beyond the actual corner so you can pull the string, measure, and re-set without disturbing the stakes. Never over-drive the nails — the string groove needs to be removable during excavation.` },
        { num: 2, title: 'Excavate Post Holes', isWarning: false,
          desc: `Dig to frost line + 12". Your climate zone (${data.climate || 'Temperate / Coastal'}) requires minimum ${frostDig}" depth. ${cd.footingNote}. Diameter: 12" for 4×4 posts, 16" for 6×6.\n\n⚡ TIP: Rent a power auger for anything over 3 holes — hand-digging past 24" is brutal and often imprecise. Flare the bottom of each hole by 2–3" with a post-hole digger or bar to create a "bell" footing that resists frost heave.` },
        { num: 3, title: "FOREMAN'S WARNING: Call 811 Before You Dig", isWarning: true,
          desc: `CALL 811 — "Call Before You Dig" — at least 3 business days before breaking ground. Hitting a buried utility line causes electrocution, gas explosions, and fines that end projects permanently. This is federal law. No exceptions, no workarounds.` },
      ],
    },
    {
      phase: 'FOOTING & POST INSTALLATION', icon: '🏗️',
      steps: [
        { num: 4, title: 'Set Post Footings', isWarning: false,
          desc: `Drain 6" gravel in each hole, set post, pour dry Quikrete Fast-Set around it, then add water per bag instructions. Brace posts plumb on two adjacent faces. Do NOT disturb for 48 hours minimum.\n\n⚡ TIP: The dry-pour method is code-acceptable for post footings and far easier than mixing in a trough. One 50lb bag per 10" of hole depth is a reliable rule of thumb. Use a scrap 2×4 to tamp concrete against the hole wall after adding water.` },
        { num: 5, title: 'Cut Posts to Height', isWarning: false,
          desc: `Once cured (48 hrs min), snap a chalk line at finished beam height. Cut all posts to ${inchesToFeetInches(H - 9)} above ground (accounting for beam depth + decking thickness). Use a speed square to mark all 4 faces before cutting — this keeps the cut perfectly square.\n\n⚡ TIP: Cut posts in place rather than pre-cutting before pouring. Concrete settling, imprecise hole depths, and slight grade variations make pre-cut posts a gamble. Cut in-place with a reciprocating saw and your chalk line.` },
        { num: 6, title: "FOREMAN'S WARNING: Post Plumb is Non-Negotiable", isWarning: true,
          desc: `STRUCTURAL INTEGRITY ALERT: Out-of-plumb posts transfer eccentric loads and WILL fail under heavy load or lateral force. Check plumb on all four sides with a 4ft level. Max deviation: 1/8" per 3ft of height. Re-pour if needed — there is no acceptable workaround.` },
      ],
    },
    {
      phase: 'BEAM & JOIST FRAMING', icon: '🔩',
      steps: [
        { num: 7, title: 'Install Beams', isWarning: false,
          desc: `Set 4×6 beams across post tops using post cap hardware. Secure with (2) 1/2" × 7" carriage bolts per connection — pre-drill 9/16" to prevent splitting. Stagger bolt pattern: top bolt 1.5" from edge, bottom bolt 3" below top bolt. Torque to 40 ft-lbs.\n\n⚡ TIP: Use a drill guide to keep bolt holes perfectly perpendicular. Angled bolts create stress concentrations that split posts over time. Use a flat washer between nut and wood — bare nut-to-wood crushes fibers under load.` },
        { num: 8, title: 'Install Rim Joists (Band Board)', isWarning: false,
          desc: `Set 2×8 rim joists on edge across beam ends, flush with the outer face of the beams. Toenail (3) 3" structural screws per connection. Every other measurement keys off the rim joist, so get it level. Use a laser level or water level across all four corners.\n\n⚡ TIP: Crown the rim joist — a bowed rim that crowns upward acts like an arch under load. One that crowns downward becomes a sag point. Sight down the board before nailing; flip it if needed.` },
        { num: 9, title: "FOREMAN'S WARNING: Joist Span Limits", isWarning: true,
          desc: `DO NOT exceed 2×8 joist span of 12ft without a mid-span beam. Your project is ${inchesToFeetInches(W)} wide — ${parseFloat(W)/12 > 12 ? '⚠️ YOU NEED A CENTER BEAM. Install a mid-span 4×8 beam before proceeding. Skipping this causes catastrophic floor bounce under load.' : '✅ within safe 2×8 span limits.'}` },
        { num: 10, title: 'Lay Out & Install Interior Joists', isWarning: false,
          desc: `Mark 16" O.C. layout on both rim joists — mark the X on the same side every time. Install LU26 joist hangers at each mark. Drop joists in, fasten per hanger spec (typically 10 10d nails each side). Crown UP — orient the natural bow toward the sky.\n\n⚡ TIP: Mark the crown with a pencil C on top of each joist before staging. Once in hangers the mark is hidden — one upside-down joist means a low spot in the finished deck. Two minutes of marking saves a day of remediation.` },
      ],
    },
    {
      phase: 'DECKING INSTALLATION', icon: '🪵',
      steps: [
        { num: 11, title: 'First Decking Board — Starter Course', isWarning: false,
          desc: `Start at the most visible edge. Overhang: 1"–1.5" past rim joist. Pre-drill two (5/32") holes per joist crossing. Drive (2) 3" structural screws countersunk flush. This board sets alignment for every board after it — take your time.\n\n⚡ TIP: Rip the factory edge of your first board on a table saw or with a track saw — a dead-straight starter course is essential. An 1/8" wander on Board 1 compounds to a full inch of drift by Board 30.` },
        { num: 12, title: 'Spacing & Running the Field', isWarning: false,
          desc: `Use a 16d nail (1/8" gap) between boards for drainage and expansion. Every 4 boards, check alignment against the far rim joist. Snap a chalk line every 10 boards to verify.\n\n⚡ TIP: "Rack" boards deliberately (micro-rotate in the hangers) when alignment drifts — spread corrections over 3–4 boards rather than trying to correct in one board. Sudden corrections are always visible.` },
        { num: 13, title: "FOREMAN'S WARNING: Wet vs. Dry Lumber Spacing", isWarning: true,
          desc: `Pressure-treated lumber from the yard is WET. It shrinks ~1/4" per 4" width as it dries over 6–12 months. Wet PT: butt boards TIGHT (no gap) — the gap appears naturally. Kiln-dried or composite: use 1/8" spacer. Wrong spacing on wet PT = gaps wide enough to drop a finger through by next summer.` },
        { num: 14, title: 'Trim Decking to Final Line', isWarning: false,
          desc: `Snap a chalk line 1.25" past the rim joist edge. Set circular saw depth to cut through decking without nicking joists. One smooth pass along the line.\n\n⚡ TIP: Clamp a straight 2×4 as a saw guide along the chalk line for a perfectly straight cut — a freehand pass on wet lumber always wobbles. The trim cut is the first thing every visitor sees.` },
      ],
    },
    {
      phase: 'FINISHING & SEALING', icon: '✨',
      steps: [
        { num: 15, title: 'Sanding & Prep', isWarning: false,
          desc: `Belt-sand raised grain and board edges — 60-grit start, 100-grit finish. Blow off all dust. Surface must be DRY (moisture content < 15%) for sealant adhesion.\n\n⚡ TIP: Skip sanding on composite decking — the factory surface is already sealant-ready. For pressure-treated lumber, wait 3–6 months before sealing; fresh PT is too wet to absorb sealant and it peels off within one season.` },
        { num: 16, title: 'Apply Waterproof Sealant', isWarning: false,
          desc: `Apply with a 1/2" nap roller for field areas, brush for corners and edges. Work with the grain. Two coats: first coat applied generously (sit 30 min, wipe excess). Second coat at 90° to first. Dry time: 24–48 hrs foot traffic, 72 hrs furniture.\n\n⚡ TIP: Apply on a dry, overcast day between 55–75°F. Direct sun skins sealant over before it penetrates — causes peeling within a year.` },
        { num: 17, title: "FOREMAN'S WARNING: Final Structural Inspection", isWarning: true,
          desc: `BEFORE YOU DECLARE DONE: Get under the structure. Every joist hanger — all nails installed? Every post base — bolts torqued? Pull on each post — any wobble = problem. Load-test: 4 adults standing in the center simultaneously. Any sag > 1/2" = undersized framing. Never occupy any elevated structure until this inspection is complete and passed.` },
      ],
    },
  ];
}

function generateSteps(data) {
  const type = data.projectType || getProjectType(data.projectName);
  if (type === 'raised-bed') return _stepsRaisedBed(data);
  if (type === 'pergola')    return _stepsPergola(data);
  if (type === 'shed')       return _stepsShed(data);
  if (type === 'treehouse')  return _stepsTreehouse(data);
  return _stepsDeck(data);
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
  const OPEN = `🔧 MEASURE TWICE — Field Intelligence System v2.0\n\nTell me about your project in plain language — I'll figure out the rest.\n\nExamples:\n• "backyard deck, 12 feet wide by 16 long, about 3 feet off the ground, Chicago"\n• "treehouse for my kids, 8×10 feet, 6 feet up, sloped yard"\n• "raised garden bed, 4 wide 8 long, ground level, heavy planters"\n\n⚡ TIP: The more context you drop in one shot, the fewer follow-ups I'll need. Size is the only thing I can't infer — everything else gets smart-defaulted if you skip it.`;

  const [messages,   setMessages]   = useState([{ id: 0, from: 'bot', text: OPEN }]);
  const [inputVal,   setInputVal]   = useState('');
  const [answers,    setAnswers]     = useState({});
  const [isTyping,   setIsTyping]   = useState(false);
  const [done,       setDone]       = useState(false);
  const [turnCount,  setTurnCount]  = useState(0);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const val = inputVal.trim();
    if (!val || isTyping || done) return;

    setMessages(m => [...m, { id: Date.now(), from: 'user', text: val }]);
    setInputVal('');
    setIsTyping(true);

    const updates    = parseAll(val, answers);
    const newAnswers = { ...answers, ...updates };
    setAnswers(newAnswers);

    const delay = 500 + Math.random() * 350;
    setTimeout(() => {
      const { text, ready } = buildBotResponse(updates, newAnswers, turnCount);
      setMessages(m => [...m, { id: Date.now(), from: 'bot', text }]);
      setIsTyping(false);

      if (ready) {
        const final = {
          projectName: 'My Project',
          height:      '36',
          constraints: 'None',
          targetLoad:  'General use',
          climate:     'Temperate / Coastal',
          ...newAnswers,
        };
        setDone(true);
        setTimeout(() => onComplete(final), 900);
      } else {
        setTurnCount(t => t + 1);
        inputRef.current?.focus();
      }
    }, delay);
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full px-4 py-4">
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0 pr-1"
        style={{ maxHeight: 'calc(100vh - 180px)' }}>
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`relative overflow-hidden max-w-[85%] rounded-lg px-4 py-3 text-sm font-mono whitespace-pre-line leading-relaxed ${
              msg.from === 'user'
                ? 'bg-[#1e4d7a] text-white border border-[#4a9eff] chat-bubble-out'
                : 'bg-[#0d1f3c] text-[#a0c4ff] border border-[#1e3a5f] chat-bubble-in'
            }`}>
              {msg.text}
              <div className={`wave-shimmer${msg.from === 'user' ? ' wave-shimmer-user' : ''}`} />
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-lg px-4 py-3">
              <div className="typing-indicator flex items-center gap-1"><span /><span /><span /></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {!done && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder="Describe your project in plain language…"
            disabled={isTyping || done}
            autoFocus
            className="flex-1 bg-[#0d1f3c] border border-[#1e3a5f] text-white font-mono text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-[#4a9eff] placeholder-[#4a7aaa] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isTyping || done || !inputVal.trim()}
            className="bg-[#4a9eff] hover:bg-[#3a8eef] disabled:opacity-40 text-white font-bold px-5 py-3 rounded-lg transition-colors"
          >
            <ArrowRight size={18} />
          </button>
        </form>
      )}
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
  const bibleRef  = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');
  const [tier,     setTier]     = useState('standard');
  const [activeTab, setActiveTab] = useState('overview');

  const materials = calcMaterials(projectData, tier);
  const steps     = generateSteps(projectData);
  const cd        = CLIMATE_DATA[projectData.climate] || CLIMATE_DATA['Temperate / Coastal'];
  const totalCost = materials.items.reduce((s, i) => s + i.qty * i.unitCost, 0);

  // ─── PDF export (lazy-loaded jspdf + html2canvas) ─────────────────────────
  const handleExportPDF = async () => {
    setExporting(true);
    setExportMsg('Rendering document…');
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await getPDF();
      const el     = bibleRef.current;
      const canvas = await html2canvas(el, { scale: 1.5, backgroundColor: '#0a1628', useCORS: true, logging: false, windowWidth: 900 });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW  = pdf.internal.pageSize.getWidth();
      const pageH  = pdf.internal.pageSize.getHeight();
      const imgH   = (canvas.height * pageW) / canvas.width;
      let yPos = 0;
      while (yPos < imgH) {
        if (yPos > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -yPos, pageW, imgH, undefined, 'FAST');
        yPos += pageH;
      }
      pdf.save(`${(projectData.projectName || 'Project').replace(/\s+/g, '_')}_Field_Manual.pdf`);
      setExportMsg('');
    } catch (err) {
      console.error('PDF export error:', err);
      setExportMsg('PDF failed — use Ctrl+P to print.');
    } finally {
      setExporting(false);
    }
  };

  // ─── DOCX export (lazy-loaded docx) ───────────────────────────────────────
  const handleExportDOCX = async () => {
    setExporting(true);
    setExportMsg('Building DOCX…');
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await getDOCX();
      const paras = [];
      paras.push(new Paragraph({ text: projectData.projectName || 'My Project', heading: HeadingLevel.TITLE }));
      paras.push(new Paragraph({ text: `Dimensions: ${inchesToFeetInches(projectData.width)} W × ${inchesToFeetInches(projectData.depth)} D × ${inchesToFeetInches(projectData.height)} H` }));
      paras.push(new Paragraph({ text: `Climate: ${projectData.climate || 'Temperate / Coastal'} · Tier: ${TIER_MULTIPLIERS[tier].label}` }));
      paras.push(new Paragraph({ text: `Est. Cost: $${totalCost.toFixed(2)}` }));
      paras.push(new Paragraph({ text: '' }));
      paras.push(new Paragraph({ text: 'SHOPPING LIST', heading: HeadingLevel.HEADING_1 }));
      for (const item of materials.items) {
        paras.push(new Paragraph({ text: `• ${item.name}  ×${item.qty} ${item.unit}  @ $${item.unitCost}/${item.unit}  = $${(item.qty * item.unitCost).toFixed(2)}` }));
      }
      paras.push(new Paragraph({ text: '' }));
      paras.push(new Paragraph({ text: 'ASSEMBLY INSTRUCTIONS', heading: HeadingLevel.HEADING_1 }));
      for (const phase of steps) {
        paras.push(new Paragraph({ text: phase.phase, heading: HeadingLevel.HEADING_2 }));
        for (const step of phase.steps) {
          paras.push(new Paragraph({ text: `Step ${step.num}: ${step.title}`, heading: HeadingLevel.HEADING_3 }));
          paras.push(new Paragraph({ text: step.desc }));
        }
      }
      const doc = new Document({ sections: [{ properties: {}, children: paras }] });
      const blob = await Packer.toBlob(doc);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${(projectData.projectName || 'Project').replace(/\s+/g, '_')}_Field_Manual.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg('');
    } catch (err) {
      console.error('DOCX export error:', err);
      setExportMsg('DOCX failed. Try PDF instead.');
    } finally {
      setExporting(false);
    }
  };

  const TABS = [
    { id: 'overview',  label: 'OVERVIEW',  icon: <Layers size={14} /> },
    { id: 'cutlist',   label: 'CUT LIST',  icon: <Scissors size={14} /> },
    { id: 'timeline',  label: 'TIMELINE',  icon: <Calendar size={14} /> },
    { id: 'climate',   label: 'CLIMATE',   icon: <MapPin size={14} /> },
  ];

  // Cut-list derived from materials
  const cutList = [
    { label: 'Decking boards',  count: materials.items.find(i => i.category === 'Lumber' && i.name.includes('Decking'))?.qty || 0,  dims: `${inchesToFeetInches(projectData.depth)} lengths` },
    { label: 'Joists',          count: materials.items.find(i => i.name.includes('Joist'))?.qty || 0,                                dims: `${inchesToFeetInches(parseFloat(projectData.depth) - 3)}" clear span` },
    { label: 'Rim joists',      count: 2,                                                                                             dims: inchesToFeetInches(projectData.width) + ' + ' + inchesToFeetInches(projectData.depth) },
    { label: 'Beams',           count: materials.items.find(i => i.name.includes('Beam'))?.qty || 0,                                 dims: inchesToFeetInches(projectData.width) },
    { label: 'Posts',           count: materials.items.find(i => i.name.includes('Post'))?.qty || 0,                                 dims: `${inchesToFeetInches(parseFloat(projectData.height) + cd.frostDepth + 12)} each (incl. buried)` },
  ];

  // Timeline estimate
  const sqFt  = parseFloat(materials.sqFt);
  const days  = Math.max(3, Math.ceil(sqFt / 60));
  const tl    = [
    { day: 'Day 1',                  task: 'Layout, call 811, mark post locations, rent auger' },
    { day: 'Day 2',                  task: `Dig ${materials.items.find(i => i.name.includes('Post'))?.qty || 0} post holes (${cd.frostDepth + 12}" deep), pour concrete, set posts plumb` },
    { day: 'Day 3',                  task: 'Cut posts to height, set beams, install rim joists' },
    { day: 'Day 4',                  task: 'Install all interior joists at 16" O.C., install blocking' },
    { day: days <= 5 ? 'Day 5' : 'Day 5–' + days, task: 'Run decking field, trim edges, sand, seal (2 coats)' },
    { day: 'Day ' + (days + 1),      task: 'Final structural inspection, load test, permit sign-off' },
  ];

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-6">
      {/* Header */}
      <div className="text-center mb-5">
        <div className="flex items-center justify-center gap-3 mb-2">
          <HardHat size={32} className="text-[#4a9eff]" />
          <h1 className="text-3xl font-bold font-mono text-white tracking-wider">PROJECT BIBLE</h1>
        </div>
        <div className="text-[#4a9eff] font-mono font-bold text-xl measurement-text mb-1">
          {projectData.projectName || 'UNTITLED PROJECT'}
        </div>
        <div className="text-[#4a7aaa] font-mono text-sm">
          {inchesToFeetInches(projectData.width)} W × {inchesToFeetInches(projectData.depth)} D × {inchesToFeetInches(projectData.height)} H
          {' · '}{materials.sqFt} sq ft{' · '}
          <span className="text-[#4a9eff]">${totalCost.toFixed(2)}</span>
        </div>
        {projectData.constraints && projectData.constraints.toLowerCase() !== 'none' && (
          <div className="text-[#f59e0b] font-mono text-xs mt-1">⚠️ SITE: {projectData.constraints}</div>
        )}
      </div>

      {/* Material Tier Toggle */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {Object.entries(TIER_MULTIPLIERS).map(([key, t]) => (
          <button key={key} onClick={() => setTier(key)}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all border ${tier === key ? 'border-current text-current bg-[#0d1f3c]' : 'border-[#1e3a5f] text-[#4a7aaa] hover:border-[#4a7aaa]'}`}
            style={{ color: tier === key ? t.color : undefined }}>
            {t.label}
          </button>
        ))}
        <span className="text-[#4a7aaa] font-mono text-xs ml-2">{TIER_MULTIPLIERS[tier].desc}</span>
      </div>

      {/* Export buttons */}
      <div className="flex gap-3 mb-5">
        <button onClick={handleExportPDF} disabled={exporting}
          className="flex-1 bg-linear-to-r from-[#1e5fcc] to-[#4a9eff] hover:from-[#2a6fd6] hover:to-[#5aabff] disabled:opacity-50 text-white font-mono font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all">
          <Download size={18} />
          {exporting && exportMsg.includes('PDF') ? exportMsg : 'PDF'}
        </button>
        <button onClick={handleExportDOCX} disabled={exporting}
          className="flex-1 bg-[#0d1f3c] border border-[#1e3a5f] hover:border-[#4a9eff] text-[#a0c4ff] font-mono font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all">
          <FileOutput size={18} />
          {exporting && exportMsg.includes('DOCX') ? exportMsg : 'DOCX'}
        </button>
      </div>
      {exportMsg && !exporting && <div className="text-[#f59e0b] font-mono text-xs text-center mb-3">{exportMsg}</div>}

      {/* Tab bar */}
      <div className="flex gap-1 mb-5 bg-[#06101e] rounded-xl p-1 border border-[#1e3a5f]">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-mono text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-[#1e3a5f] text-[#4a9eff]' : 'text-[#4a7aaa] hover:text-white'}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Tab content — PDF capture area */}
      <div ref={bibleRef} className="space-y-6 bg-[#0d1f3c] border border-[#1e3a5f] rounded-xl p-6">

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
        {activeTab === 'overview' && (<>
          {/* Specs grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm font-mono">
            {[
              ['PROJECT',          projectData.projectName,                                        'text-white'],
              ['DIMENSIONS',       `${projectData.width}" × ${projectData.depth}" × ${projectData.height}"`, 'text-[#6ee7b7] measurement-text'],
              ['AREA',             `${materials.sqFt} sq ft`,                                     'text-white measurement-text'],
              ['TARGET LOAD',      projectData.targetLoad,                                         'text-white'],
              ['SITE',             projectData.constraints,                                        'text-[#f59e0b]'],
              ['EST. COST',        `$${totalCost.toFixed(2)}`,                                     'text-[#4a9eff] measurement-text'],
            ].map(([label, val, cls]) => (
              <div key={label} className="bg-[#06101e] rounded-lg p-3 border border-[#1e3a5f]">
                <div className="text-[#4a7aaa] text-xs mb-1">{label}</div>
                <div className={`font-bold ${cls}`}>{val}</div>
              </div>
            ))}
          </div>

          {projectData.style && (
            <div className="bg-[#06101e] border border-[#1e3a5f] rounded-xl p-4">
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

          <ProTipBox tip={`Your diagonal distance is ${Math.sqrt(parseFloat(projectData.width)**2 + parseFloat(projectData.depth)**2).toFixed(2)}" — if both layout diagonals match this number, your corners are perfectly square (3-4-5 rule at scale).`} />
          <ProTipBox tip={`For 45° miter cuts use your saw's default stop. For an octagonal structure use 22.5° (360° ÷ 8 sides ÷ 2). Mark these on your cut list before heading to the saw.`} />

          {/* Assembly Diagrams */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <BarChart2 size={24} className="text-[#4a9eff]" />
              <h3 className="text-xl font-mono font-bold text-white tracking-wider">ASSEMBLY DIAGRAMS</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[YokeDiagram, FramingDiagram, DeckingDiagram, FinishingDiagram].map((Comp, i) => (
                <div key={i} className="bg-[#06101e] border border-[#1e3a5f] rounded-xl p-3">
                  <Comp data={projectData} />
                </div>
              ))}
            </div>
          </div>

          <ShoppingList materials={materials} />
          <InstructionSteps steps={steps} />
          <Disclaimer />
        </>)}

        {/* ── CUT LIST TAB ────────────────────────────────────────────── */}
        {activeTab === 'cutlist' && (<>
          <div className="flex items-center gap-3 mb-4">
            <Scissors size={24} className="text-[#4a9eff]" />
            <h3 className="text-xl font-mono font-bold text-white tracking-wider">CUT LIST</h3>
          </div>
          <div className="space-y-2">
            {cutList.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-3 bg-[#06101e] border border-[#1e3a5f] rounded-lg px-4 py-3 font-mono text-sm">
                <div className="text-white font-bold">{row.label}</div>
                <div className="text-[#4a9eff] text-center font-bold measurement-text">× {row.count}</div>
                <div className="text-[#a0c4ff] text-right">{row.dims}</div>
              </div>
            ))}
          </div>
          <div className="bg-[#06101e] border border-[#f59e0b] rounded-xl p-4 mt-4">
            <div className="text-[#f59e0b] font-mono font-bold text-sm mb-2">⚠️ MARK BEFORE YOU CUT</div>
            <ul className="text-[#a0c4ff] font-mono text-xs space-y-1 list-disc list-inside">
              <li>Mark crown direction (↑) on every joist before cutting</li>
              <li>Label each post A–{String.fromCharCode(64 + (materials.items.find(i => i.name.includes('Post'))?.qty || 4))} for traceability</li>
              <li>Add 1/4" kerf allowance per cut when summing lengths</li>
              <li>Diagonal = {Math.sqrt(parseFloat(projectData.width)**2 + parseFloat(projectData.depth)**2).toFixed(1)}" — write this on your ledger board before layout</li>
            </ul>
          </div>
        </>)}

        {/* ── TIMELINE TAB ────────────────────────────────────────────── */}
        {activeTab === 'timeline' && (<>
          <div className="flex items-center gap-3 mb-4">
            <Calendar size={24} className="text-[#4a9eff]" />
            <h3 className="text-xl font-mono font-bold text-white tracking-wider">BUILD TIMELINE</h3>
          </div>
          <div className="text-[#4a7aaa] font-mono text-xs mb-4">
            Estimated {days + 1} days · {materials.sqFt} sq ft at ~60 sq ft/day for 1–2 person crew
          </div>
          <div className="space-y-2">
            {tl.map((row, i) => (
              <div key={i} className="flex gap-4 bg-[#06101e] border border-[#1e3a5f] rounded-lg px-4 py-3 font-mono text-sm">
                <div className="text-[#4a9eff] font-bold w-20 shrink-0 measurement-text">{row.day}</div>
                <div className="text-[#a0c4ff]">{row.task}</div>
              </div>
            ))}
          </div>
          <ProTipBox tip="Concrete cure time is the single biggest schedule variable. Plan 48 hrs minimum (72 hrs in temps below 50°F) before loading posts. Build flexibility into Days 2–3 for weather or rental equipment delays." />
        </>)}

        {/* ── CLIMATE TAB ─────────────────────────────────────────────── */}
        {activeTab === 'climate' && (<>
          <div className="flex items-center gap-3 mb-4">
            <MapPin size={24} className="text-[#4a9eff]" />
            <h3 className="text-xl font-mono font-bold text-white tracking-wider">CLIMATE ADVISORY</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-sm">
            {[
              ['Zone',           projectData.climate || 'Temperate / Coastal'],
              ['Frost Depth',    `${cd.frostDepth}"`],
              ['Footing Min.',   `${cd.frostDepth + 12}" below grade`],
              ['Footing Note',   cd.footingNote],
              ['Permit Trigger', `>${cd.permitSqFt} sq ft`],
              ['Wind Zone',      cd.windZone],
              ['Seismic',        cd.seismic],
            ].map(([label, val]) => (
              <div key={label} className="bg-[#06101e] border border-[#1e3a5f] rounded-lg p-3">
                <div className="text-[#4a7aaa] text-xs mb-1">{label}</div>
                <div className="text-white font-bold">{val}</div>
              </div>
            ))}
          </div>
          {parseFloat(materials.sqFt) > cd.permitSqFt && (
            <div className="bg-[#1a0a00] border border-[#f59e0b] rounded-xl p-4 mt-2">
              <div className="text-[#f59e0b] font-mono font-bold text-sm mb-1">⚠️ PERMIT REQUIRED</div>
              <div className="text-[#fcd34d] font-mono text-xs">
                Your {materials.sqFt} sq ft project exceeds the {cd.permitSqFt} sq ft permit threshold for this climate zone.
                Contact your local building department before breaking ground.
                Unpermitted structures can result in fines, forced removal, and void homeowner's insurance.
              </div>
            </div>
          )}
          <ProTipBox tip={`In ${projectData.climate || 'Temperate / Coastal'} zones, footings must extend ${cd.frostDepth + 12}" below grade. Shallow footings heave frost-cycle after frost-cycle until the structure is visibly out of level — a mistake that costs thousands to correct.`} />
        </>)}

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
