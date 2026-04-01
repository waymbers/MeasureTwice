import { CheckCircle } from 'lucide-react';

const STEPS = ['Survey', 'Analysis', 'Drafting', 'Field Bible'];

export default function ProgressBar({ currentStep }) {
  return (
    <div className="no-print w-full flex items-center justify-center py-4 px-4">
      <div className="flex items-center gap-0 w-full max-w-2xl">
        {STEPS.map((label, i) => {
          const isDone   = i < currentStep;
          const isActive = i === currentStep;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isDone    ? 'bg-green-600 border-green-600 text-white' :
                    isActive  ? 'bg-blue-600  border-blue-600  text-white ring-2 ring-blue-400/40' :
                                'bg-slate-900 border-slate-700  text-slate-500'
                  }`}
                >
                  {isDone ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span className={`text-xs font-mono font-bold tracking-wider whitespace-nowrap ${
                  isDone    ? 'text-green-500' :
                  isActive  ? 'text-blue-400'  :
                              'text-slate-600'
                }`}>
                  {label.toUpperCase()}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 transition-all duration-300 ${isDone ? 'bg-green-600' : 'bg-slate-700'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
