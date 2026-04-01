import { useState, useRef, useEffect } from 'react';
import { Bot, User, ChevronRight, HardHat, Ruler } from 'lucide-react';

const QUESTIONS = [
  {
    id: 'projectName',
    field: 'projectName',
    prompt: "👷 Welcome to **Measure Twice** — the AI Field Manual generator. Let's get started.\n\nWhat's the **name of your project**? (e.g., \"Backyard Deck\", \"Treehouse\", \"Garden Pergola\")",
    placeholder: 'e.g., Backyard Cedar Deck',
    type: 'text',
  },
  {
    id: 'height',
    field: 'height',
    prompt: "Great! Now let's nail down the **core dimensions**.\n\n📐 What is the **Height** of the structure? (in inches or feet, e.g., \"30 inches\", \"8 ft\")",
    placeholder: 'e.g., 30 inches or 8 ft',
    type: 'text',
  },
  {
    id: 'width',
    field: 'width',
    prompt: "📐 What is the **Width** (left to right)?",
    placeholder: 'e.g., 12 ft or 144 inches',
    type: 'text',
  },
  {
    id: 'depth',
    field: 'depth',
    prompt: "📐 What is the **Depth** (front to back)?",
    placeholder: 'e.g., 16 ft or 192 inches',
    type: 'text',
  },
  {
    id: 'constraints',
    field: 'constraints',
    prompt: "🌳 Any **environmental constraints** we need to work around? Be specific — this affects the design.\n\n(e.g., \"Around a tree\", \"In a corner\", \"Sloped ground — 6\" drop over 12 ft\", \"Adjacent to fence\")",
    placeholder: 'e.g., Sloped ground, 6 inch drop over 12 feet',
    type: 'textarea',
  },
  {
    id: 'targetLoad',
    field: 'targetLoad',
    prompt: "⚖️ **Target load** — who or what will be using this structure?\n\nThis helps calculate joists, post sizing, and hardware specs. (e.g., \"4 adults + outdoor furniture\", \"Children's play equipment\", \"Hot tub — 3,500 lbs\")",
    placeholder: 'e.g., 4 adults + patio furniture, est. 1500 lbs',
    type: 'text',
  },
  {
    id: 'material',
    field: 'material',
    prompt: "🪵 **Preferred material**? Different woods have different properties and costs.\n\n(e.g., \"Pressure-treated pine\", \"Cedar\", \"Redwood\", \"Composite decking\")",
    placeholder: 'e.g., Pressure-treated pine',
    type: 'text',
  },
];

function formatPrompt(text) {
  return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="text-blue-300 font-bold">{part}</strong>
      : part
  );
}

export default function DiscoveryState({ onComplete }) {
  const [messages, setMessages] = useState([{ role: 'bot', text: QUESTIONS[0].prompt }]);
  const [qIndex, setQIndex] = useState(0);
  const [input, setInput] = useState('');
  const [answers, setAnswers] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  function addBotMessage(text, delay = 600) {
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'bot', text }]);
      setIsTyping(false);
    }, delay);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!isTyping) inputRef.current?.focus();
  }, [isTyping, qIndex]);

  function handleSubmit(e) {
    e.preventDefault();
    const val = input.trim();
    if (!val) return;

    const q = QUESTIONS[qIndex];
    const newAnswers = { ...answers, [q.field]: val };
    setAnswers(newAnswers);

    setMessages(prev => [...prev, { role: 'user', text: val }]);
    setInput('');

    const next = qIndex + 1;
    if (next < QUESTIONS.length) {
      setQIndex(next);
      addBotMessage(QUESTIONS[next].prompt);
    } else {
      // All questions answered
      addBotMessage("✅ **Survey complete!** I've locked in all your project specs. Let's move to the **Vision Analysis** phase — upload a reference photo to extract style preferences, or skip to generate your Project Bible.", 600);
      setTimeout(() => {
        onComplete({
          ...newAnswers,
          dimensions: {
            height: newAnswers.height,
            width:  newAnswers.width,
            depth:  newAnswers.depth,
          },
        });
      }, 2200);
    }
  }

  const currentQ = QUESTIONS[qIndex];
  const done = qIndex >= QUESTIONS.length;

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full px-4">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-blue-700' : 'bg-slate-800 border border-blue-900'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <HardHat size={16} className="text-blue-400" />}
            </div>
            <div className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
              msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'
            }`}>
              {msg.role === 'bot' ? formatPrompt(msg.text) : msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-800 border border-blue-900">
              <HardHat size={16} className="text-blue-400" />
            </div>
            <div className="chat-bubble-bot px-4 py-3 flex items-center gap-1">
              {[0, 1, 2].map(d => (
                <span key={d} className="w-2 h-2 bg-blue-400 rounded-full inline-block" style={{ animation: `blink 1.2s ${d * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {!done && !isTyping && (
        <form onSubmit={handleSubmit} className="py-4 border-t border-blue-900/40">
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              {currentQ?.type === 'textarea' ? (
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e); }}
                  rows={2}
                  className="input-blueprint w-full rounded-lg px-4 py-3 text-sm resize-none"
                  placeholder={currentQ.placeholder}
                />
              ) : (
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  className="input-blueprint w-full rounded-lg px-4 py-3 text-sm"
                  placeholder={currentQ?.placeholder}
                />
              )}
            </div>
            <button type="submit" className="btn-primary rounded-lg px-4 py-3 flex items-center gap-1 text-sm">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            <Ruler size={12} className="text-blue-500 mt-0.5" />
            <span className="text-xs text-slate-500 font-mono">
              Question {qIndex + 1} of {QUESTIONS.length} — {QUESTIONS[qIndex]?.id}
            </span>
          </div>
        </form>
      )}

      {done && !isTyping && (
        <div className="py-4 border-t border-blue-900/40 flex items-center gap-2 text-green-400 text-sm font-mono">
          <Bot size={16} />
          Advancing to Vision Analysis…
        </div>
      )}
    </div>
  );
}
