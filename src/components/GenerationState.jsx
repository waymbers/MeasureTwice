import { useState, useRef, useEffect } from 'react';
import {
  ShoppingCart, DollarSign, BookOpen, Download,
  AlertTriangle, Lightbulb, ExternalLink, HardHat,
  CheckCircle, Ruler, Package, Wrench, Star,
} from 'lucide-react';
import { generateProjectBible } from '../utils/projectBible';
import { exportPDF } from '../utils/pdfExport';
import { YokeDiagram, FramingDiagram, DeckingDiagram, FinishingDiagram } from './SvgDiagrams';

const RETAILER_COLORS = {
  'Home Depot': 'text-orange-400',
  "Lowe's":     'text-blue-400',
  'Amazon':     'text-yellow-400',
  'Trex.com':   'text-green-400',
};

function fmt(n) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }); }
function fmtFt(n) { return `${n.toFixed(1)}'`; }
function fmtSq(n) { return `${n.toFixed(0)} sq ft`; }

export default function GenerationState({ projectData }) {
  const [bible, setBible]         = useState(null);
  const [generating, setGenerating] = useState(true);
  const [exporting, setExporting]   = useState(false);
  const bibleRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const result = generateProjectBible(projectData);
      setBible(result);
      setGenerating(false);
    }, 1400);
    return () => clearTimeout(timer);
  }, [projectData]);

  async function handleExport() {
    setExporting(true);
    try {
      await exportPDF('project-bible-content', `MeasureTwice-${projectData.projectName || 'FieldManual'}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('PDF export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <div className="relative">
          <Wrench size={48} className="text-blue-500 animate-pulse" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full animate-ping" />
        </div>
        <div className="text-center">
          <p className="text-blue-300 font-mono font-bold text-lg">Drafting Your Project Bible…</p>
          <p className="text-slate-500 font-mono text-sm mt-1">Calculating materials • Sizing joists • Writing instructions</p>
        </div>
        <div className="w-64 bg-slate-800 rounded-full h-2">
          <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '70%' }} />
        </div>
      </div>
    );
  }

  if (!bible) return null;

  const { dimensions, shoppingList, lumberCost, hardwareCost, specialtyCost, totalEstimate, instructions } = bible;

  return (
    <div className="max-w-5xl mx-auto w-full px-4 pb-16">
      {/* Export button (fixed position) */}
      <div className="no-print fixed bottom-6 right-6 z-50">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-success rounded-xl px-5 py-3 flex items-center gap-2 text-sm shadow-lg shadow-green-900/40"
        >
          <Download size={16} />
          {exporting ? 'Generating PDF…' : 'Download Field Manual'}
        </button>
      </div>

      {/* The printable content area */}
      <div id="project-bible-content" ref={bibleRef} className="space-y-8 pt-4">

        {/* ── TITLE BLOCK ─────────────────────────────────────────── */}
        <div className="panel-card p-6 border-blue-500/50">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="section-header mb-2">Project Bible // Field Manual</div>
              <h1 className="text-2xl font-bold text-blue-200 font-mono tracking-tight">
                {projectData.projectName || 'Unnamed Project'}
              </h1>
              <div className="flex flex-wrap gap-4 mt-3">
                {[
                  ['W', fmtFt(dimensions.widthFt)],
                  ['D', fmtFt(dimensions.depthFt)],
                  ['H', fmtFt(dimensions.heightFt)],
                  ['AREA', fmtSq(dimensions.sqFt)],
                ].map(([label, val]) => (
                  <div key={label} className="flex flex-col">
                    <span className="text-xs text-slate-500 font-mono">{label}</span>
                    <span className="measurement text-lg">{val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 font-mono">MATERIAL</div>
              <div className="text-blue-300 font-mono font-bold">{projectData.material || 'Pressure-treated pine'}</div>
              <div className="text-xs text-slate-500 font-mono mt-2">CONSTRAINTS</div>
              <div className="text-slate-300 font-mono text-xs max-w-[220px]">{projectData.constraints || 'None specified'}</div>
              <div className="text-xs text-slate-500 font-mono mt-2">TARGET LOAD</div>
              <div className="text-slate-300 font-mono text-xs max-w-[220px]">{projectData.targetLoad || 'Not specified'}</div>
            </div>
          </div>

          {projectData.vision?.hasImage && projectData.vision.stylePreferences?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-blue-900/40">
              <span className="text-xs text-slate-500 font-mono">VISION-EXTRACTED STYLE: </span>
              {projectData.vision.stylePreferences.map(s => (
                <span key={s} className="inline-block px-2 py-0.5 bg-blue-900/40 border border-blue-700/40 rounded text-xs text-blue-300 font-mono mr-1">{s}</span>
              ))}
            </div>
          )}
        </div>

        {/* ── DISCLAIMER ──────────────────────────────────────────── */}
        <div className="disclaimer-box">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-red-300 font-mono block mb-1">LEGAL DISCLAIMER — READ BEFORE BUILDING</strong>
              This document is provided for general informational and planning purposes only. It does NOT constitute professional structural engineering advice.
              All load-bearing construction must be reviewed and approved by a licensed structural engineer and comply with your local building codes (IBC, IRC, or applicable local amendments).
              Obtain all required building permits before beginning construction. Failure to comply with local codes may result in fines, mandatory demolition, and void your homeowner's insurance.
              The authors of Measure Twice accept no liability for structural failures, personal injury, or property damage resulting from use of this document.
            </div>
          </div>
        </div>

        {/* ── SHOPPING LIST ───────────────────────────────────────── */}
        <div className="panel-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={16} className="text-blue-400" />
            <h2 className="section-header m-0 border-0 pb-0">Shopping List</h2>
            <span className="ml-auto text-xs text-amber-400 font-mono">
              ✓ Includes 15% Overage Factor
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="cost-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Cat.</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Unit Cost</th>
                  <th>Total</th>
                  <th>Retailer</th>
                </tr>
              </thead>
              <tbody>
                {shoppingList.map((item, i) => (
                  <tr key={i}>
                    <td className="text-slate-200 font-mono">{item.item}</td>
                    <td>
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                        item.category === 'Lumber'   ? 'bg-amber-900/40 text-amber-300' :
                        item.category === 'Hardware' ? 'bg-blue-900/40  text-blue-300'  :
                                                       'bg-purple-900/40 text-purple-300'
                      }`}>{item.category}</span>
                    </td>
                    <td className="measurement text-sm">{item.qty}</td>
                    <td className="text-slate-400 text-xs font-mono">{item.unit}</td>
                    <td className="text-slate-300 font-mono">{fmt(item.unitCost)}</td>
                    <td className="measurement">{fmt(item.qty * item.unitCost)}</td>
                    <td>
                      <a
                        href={item.retailerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1 text-xs font-mono hover:underline ${RETAILER_COLORS[item.retailer] || 'text-slate-400'}`}
                      >
                        {item.retailer}
                        <ExternalLink size={10} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── THE QUOTE ───────────────────────────────────────────── */}
        <div className="panel-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={16} className="text-green-400" />
            <h2 className="section-header m-0 border-0 pb-0">The Quote</h2>
          </div>

          <table className="cost-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Est. Cost</th>
                <th>% of Total</th>
                <th>Where to Buy</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="flex items-center gap-2"><Package size={14} className="text-amber-400" /> Lumber</td>
                <td className="measurement">{fmt(lumberCost)}</td>
                <td className="text-slate-400 font-mono">{((lumberCost / totalEstimate) * 100).toFixed(0)}%</td>
                <td className="text-slate-400 font-mono text-xs">
                  <a href="https://www.homedepot.com" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline inline-flex items-center gap-1">Home Depot<ExternalLink size={10}/></a>
                  {' / '}
                  <a href="https://www.lowes.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">Lowe's<ExternalLink size={10}/></a>
                </td>
              </tr>
              <tr>
                <td className="flex items-center gap-2"><Wrench size={14} className="text-blue-400" /> Hardware & Fasteners</td>
                <td className="measurement">{fmt(hardwareCost)}</td>
                <td className="text-slate-400 font-mono">{((hardwareCost / totalEstimate) * 100).toFixed(0)}%</td>
                <td className="text-slate-400 font-mono text-xs">
                  <a href="https://www.homedepot.com" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline inline-flex items-center gap-1">Home Depot<ExternalLink size={10}/></a>
                  {' / '}
                  <a href="https://www.lowes.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">Lowe's<ExternalLink size={10}/></a>
                </td>
              </tr>
              <tr>
                <td className="flex items-center gap-2"><Star size={14} className="text-purple-400" /> Specialty / Finishing</td>
                <td className="measurement">{fmt(specialtyCost)}</td>
                <td className="text-slate-400 font-mono">{((specialtyCost / totalEstimate) * 100).toFixed(0)}%</td>
                <td className="text-slate-400 font-mono text-xs">
                  <a href="https://www.amazon.com" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline inline-flex items-center gap-1">Amazon<ExternalLink size={10}/></a>
                </td>
              </tr>
              <tr className="border-t-2 border-blue-700/40">
                <td className="font-bold text-blue-200 font-mono">TOTAL ESTIMATE</td>
                <td className="measurement text-xl">{fmt(totalEstimate)}</td>
                <td className="text-green-400 text-xs font-mono">incl. 15% overage</td>
                <td className="text-slate-500 text-xs font-mono">Labor not included</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 pro-tip-box">
            <div className="flex items-start gap-2">
              <Lightbulb size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200 font-mono leading-relaxed">
                <strong>PRO TIP:</strong> Get quotes from 3 local lumber yards before buying big-box. Local mills often beat chain store prices by 10–20% on volume orders. Ask for "mill direct" pricing on quantities over 50 boards.
              </p>
            </div>
          </div>
        </div>

        {/* ── INSTRUCTIONS + DIAGRAMS ─────────────────────────────── */}
        <div className="panel-card p-5">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen size={16} className="text-blue-400" />
            <h2 className="section-header m-0 border-0 pb-0">Verbatim Build Instructions</h2>
          </div>

          {/* Phase diagrams + steps */}
          {instructions.map((phase, pi) => {
            const Diagram = [YokeDiagram, FramingDiagram, DeckingDiagram, FinishingDiagram][pi];
            return (
              <div key={pi} className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 rounded bg-blue-700 flex items-center justify-center text-xs font-bold text-white font-mono">{pi + 1}</div>
                  <h3 className="text-blue-300 font-mono font-bold text-sm tracking-wide">{phase.phase}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                  {/* Diagram */}
                  <div className="panel-card p-2 border-blue-700/30">
                    {Diagram && <Diagram widthFt={dimensions.widthFt} depthFt={dimensions.depthFt} />}
                  </div>
                  {/* Steps preview */}
                  <div className="md:col-span-2 space-y-3">
                    {phase.steps.slice(0, 3).map(step => (
                      <StepBlock key={step.n} step={step} />
                    ))}
                  </div>
                </div>
                {phase.steps.slice(3).map(step => (
                  <StepBlock key={step.n} step={step} className="mb-3" />
                ))}
              </div>
            );
          })}
        </div>

        {/* ── PRO TIP BOX: Cut Angles ─────────────────────────────── */}
        <div className="pro-tip-box">
          <div className="flex items-start gap-3">
            <Ruler size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 font-mono block text-sm mb-2">⭐ PRO TIP — CUT ANGLE REFERENCE CHART</strong>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ['Square (90°)', '0° / 90°', '4-sided'],
                  ['Hexagon', '30°', '6-sided'],
                  ['Octagon', '22.5°', '8-sided'],
                  ['Pentagon', '36°', '5-sided'],
                ].map(([shape, angle, sides]) => (
                  <div key={shape} className="bg-amber-900/20 border border-amber-700/30 rounded p-2">
                    <div className="text-amber-200 font-mono text-xs font-bold">{shape}</div>
                    <div className="measurement text-lg">{angle}</div>
                    <div className="text-amber-500 font-mono text-xs">{sides}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-amber-300/70 font-mono mt-3">
                Formula: Miter angle = 180° / (number of sides). For compound cuts (angled + sloped), use a compound miter saw and consult a cut angle calculator for dual-angle settings.
              </p>
            </div>
          </div>
        </div>

        {/* ── SIGN-OFF ─────────────────────────────────────────────── */}
        <div className="panel-card p-5 border-green-700/30">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-green-400" />
            <h2 className="section-header m-0 border-0 pb-0">Final Inspection Sign-Off</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              'Posts plumb (±1/4")',
              'Deck level / sloped from house',
              'All joist hangers fully nailed',
              'Railing posts solid (200-lb test)',
              'No proud screw heads',
              'Building permit posted',
              'Waterproofing applied',
              'Final measurements recorded',
              'Owner walkthrough complete',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <div className="w-4 h-4 border border-blue-600 rounded flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-blue-900/40 grid grid-cols-3 gap-4">
            {['Inspector Signature', 'Date', 'Permit #'].map(label => (
              <div key={label}>
                <div className="text-xs text-slate-500 font-mono mb-1">{label}</div>
                <div className="border-b border-slate-600 h-6" />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-600 font-mono pb-4">
          Generated by Measure Twice • {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} • For informational purposes only
        </div>

      </div>
    </div>
  );
}

function StepBlock({ step, className = '' }) {
  const isWarning = step.type === 'warning';
  const hasProTip = step.text.includes('PRO TIP');

  return (
    <div className={`animate-fade-in mb-3 ${className}`}>
      {isWarning ? (
        <div className="foreman-warning">
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <HardHat size={14} className="text-red-400" />
              <span className="text-xs text-red-300 font-mono font-bold tracking-wider">FOREMAN'S WARNING</span>
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <div className="step-number bg-red-700">{step.n}</div>
            <p className="text-sm font-mono text-red-200 leading-relaxed flex-1">{step.text.replace('⚠ FOREMAN\'S WARNING: ', '').replace('⚠ FOREMAN\'S WARNING — ', '')}</p>
          </div>
        </div>
      ) : (
        <div className={`flex gap-3 ${hasProTip ? 'pro-tip-box' : ''}`}>
          <div className="step-number flex-shrink-0">{step.n}</div>
          <p className="text-sm font-mono text-slate-200 leading-relaxed flex-1">{renderStepText(step.text)}</p>
        </div>
      )}
    </div>
  );
}

function renderStepText(text) {
  // Highlight ⭐ PRO TIP blocks and measurements
  const parts = text.split(/(⭐ PRO TIP[^.]*\.)/g);
  return parts.map((part, i) =>
    part.startsWith('⭐ PRO TIP') ? (
      <strong key={i} className="text-amber-300 font-bold">{part}</strong>
    ) : part
  );
}
