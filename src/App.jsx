import { useState } from 'react';
import { Ruler, HardHat } from 'lucide-react';
import ProgressBar from './components/ProgressBar';
import DiscoveryState from './components/DiscoveryState';
import VisionState from './components/VisionState';
import GenerationState from './components/GenerationState';

// Steps: 0=Survey, 1=Analysis, 2=Drafting, 3=Final Bible
export default function App() {
  const [step, setStep]             = useState(0);
  const [projectData, setProjectData] = useState(null);

  function handleDiscoveryComplete(data) {
    setProjectData(data);
    setStep(1);
  }

  function handleVisionComplete(data) {
    setProjectData(data);
    setStep(2);
    // short drafting "step" then advance to 3
    setTimeout(() => setStep(3), 1600);
  }

  return (
    <div className="blueprint-bg min-h-screen flex flex-col">
      {/* ── HEADER ────────────────────────────────────────────────── */}
      <header className="no-print border-b border-blue-900/50 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-700 flex items-center justify-center">
            <HardHat size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-blue-200 font-mono font-bold text-lg leading-none tracking-tight">MEASURE TWICE</h1>
            <p className="text-blue-500 font-mono text-xs tracking-widest">AI CONSTRUCTION FIELD MANUAL</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500 font-mono">
            <Ruler size={12} />
            v1.0
          </div>
        </div>
        <ProgressBar currentStep={step === 2 ? 2 : step === 3 ? 3 : step} />
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col">
        {step === 0 && (
          <DiscoveryState onComplete={handleDiscoveryComplete} />
        )}
        {step === 1 && projectData && (
          <VisionState projectData={projectData} onComplete={handleVisionComplete} />
        )}
        {step === 2 && (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <Ruler size={48} className="text-blue-500 animate-pulse" />
            <div className="text-center">
              <p className="text-blue-300 font-mono font-bold text-lg">Compiling Field Manual…</p>
              <p className="text-slate-500 font-mono text-sm mt-1">Finalizing materials • Writing instructions • Generating diagrams</p>
            </div>
          </div>
        )}
        {step === 3 && projectData && (
          <GenerationState projectData={projectData} />
        )}
      </main>
    </div>
  );
}
