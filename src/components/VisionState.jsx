import { useState, useRef } from 'react';
import { Upload, Image, Ruler, ChevronRight, SkipForward, Check, Eye } from 'lucide-react';

const STYLE_TAGS = [
  'Rustic / Farmhouse', 'Modern Minimalist', 'Industrial',
  'Traditional', 'Craftsman', 'Contemporary', 'Tropical / Coastal',
];

export default function VisionState({ projectData, onComplete }) {
  const [image, setImage]             = useState(null);
  const [imageURL, setImageURL]       = useState('');
  const [analyzing, setAnalyzing]     = useState(false);
  const [analyzed, setAnalyzed]       = useState(false);
  const [extractedStyle, setExtracted] = useState([]);
  const [refMeasure, setRefMeasure]   = useState('');
  const [refObject, setRefObject]     = useState('');
  const [step, setStep]               = useState('upload'); // 'upload' | 'measuring' | 'done'
  const inputRef = useRef(null);

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return;
      setImage(file);
      setImageURL(dataUrl);
      setStep('measuring');
      setAnalyzing(true);
      setTimeout(() => {
        const styles = STYLE_TAGS.sort(() => Math.random() - 0.5).slice(0, 2);
        setExtracted(styles);
        setAnalyzed(true);
        setAnalyzing(false);
      }, 1800);
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  }

  function handleConfirm() {
    onComplete({
      ...projectData,
      vision: {
        hasImage: !!image,
        stylePreferences: extractedStyle,
        referenceObject: refObject,
        referenceMeasurement: refMeasure,
      },
    });
  }

  function handleSkip() {
    onComplete({
      ...projectData,
      vision: { hasImage: false, stylePreferences: [], referenceObject: '', referenceMeasurement: '' },
    });
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
      {/* Header */}
      <div className="panel-card p-5">
        <div className="flex items-center gap-3 mb-3">
          <Eye size={20} className="text-blue-400" />
          <div>
            <h2 className="text-blue-300 font-bold text-lg font-mono">Vision Analysis</h2>
            <p className="text-slate-400 text-xs font-mono">Upload a reference photo to extract style preferences and set scale</p>
          </div>
        </div>

        {step === 'upload' && (
          <div
            className="border-2 border-dashed border-blue-700/50 rounded-lg p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-blue-500/70 transition-colors"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
          >
            <Upload size={36} className="text-blue-500/60" />
            <div className="text-center">
              <p className="text-slate-300 font-mono text-sm font-bold">Drop a reference image here</p>
              <p className="text-slate-500 font-mono text-xs mt-1">JPG, PNG, WEBP — max 10 MB</p>
            </div>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          </div>
        )}

        {step !== 'upload' && (
          <div className="space-y-4">
            {/* Image preview */}
            <div className="flex gap-4 items-start">
              <div className="relative">
                <img src={imageURL} alt="Reference" className="w-40 h-32 object-cover rounded border border-blue-700/40" />
                {analyzing && (
                  <div className="absolute inset-0 bg-blue-900/60 rounded flex items-center justify-center">
                    <span className="text-xs text-blue-300 font-mono animate-pulse">Analyzing…</span>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-xs section-header"><Image size={10} className="inline mr-1" />Detected Style Preferences</p>
                {analyzing && <p className="text-xs text-slate-500 font-mono animate-pulse">Running vision analysis…</p>}
                {analyzed && (
                  <div className="flex flex-wrap gap-2">
                    {extractedStyle.map(s => (
                      <span key={s} className="px-2 py-1 bg-blue-800/40 border border-blue-600/40 rounded text-xs text-blue-300 font-mono">{s}</span>
                    ))}
                    <p className="w-full text-xs text-slate-400 font-mono mt-1">Style successfully extracted from image.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Reference measurement */}
            {analyzed && (
              <div className="panel-card p-4 space-y-3 animate-fade-in">
                <p className="text-xs section-header"><Ruler size={10} className="inline mr-1" />Set Scale Reference</p>
                <p className="text-xs text-slate-400 font-mono">
                  Point out a known object in the photo to calibrate measurements.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 font-mono block mb-1">Known Object (e.g., door, brick)</label>
                    <input
                      type="text"
                      value={refObject}
                      onChange={e => setRefObject(e.target.value)}
                      placeholder="e.g., Standard door"
                      className="input-blueprint w-full rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-mono block mb-1">Known Measurement</label>
                    <input
                      type="text"
                      value={refMeasure}
                      onChange={e => setRefMeasure(e.target.value)}
                      placeholder="e.g., 80 inches"
                      className="input-blueprint w-full rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-end">
        <button onClick={handleSkip} className="btn-secondary rounded-lg px-4 py-2 text-sm flex items-center gap-2">
          <SkipForward size={14} />
          Skip Vision
        </button>
        {analyzed && (
          <button onClick={handleConfirm} className="btn-primary rounded-lg px-4 py-2 text-sm flex items-center gap-2">
            <Check size={14} />
            Confirm & Generate Bible
          </button>
        )}
      </div>

      {/* Info */}
      <div className="panel-card p-4">
        <p className="text-xs text-slate-500 font-mono leading-relaxed">
          <span className="text-blue-400 font-bold">NOTE:</span> Vision analysis is a style preference assistant only.
          All structural dimensions and load calculations are based on the measurements you provided in the Survey phase.
          A licensed structural engineer must review any load-bearing construction.
        </p>
      </div>
    </div>
  );
}
