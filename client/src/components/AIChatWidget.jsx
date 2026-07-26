import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import { askAssistant } from '../api/ai.api';
import useAuthStore from '../store/authStore';

const PINK   = '#FF2D8F';
const PURPLE = '#A855F7';

const SUGGESTIONS = [
  'How many patients are waiting?',
  "Who's currently in progress?",
  'What is the avg wait time today?',
  'How many appointments are completed?',
];

export default function AIChatWidget() {
  const token = useAuthStore((s) => s.token);
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!token) return null;

  async function send(question) {
    const q = question ?? input.trim();
    if (!q || loading) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await askAssistant(q);
      setMessages(m => [...m, { role: 'ai', text: res.data.data.answer }]);
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'Sorry, I could not get a response. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── Floating bubble ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 group"
          title="AI Assistant"
        >
          {/* Pulse ring */}
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, opacity: 0.35 }}
          />
          <span
            className="relative h-14 w-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
            style={{
              background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
              boxShadow: `0 8px 24px ${PINK}55, 0 4px 12px ${PURPLE}40`,
            }}
          >
            <Sparkles size={22} className="text-white" strokeWidth={2.2} />
          </span>
        </button>
      )}

      {/* ── Chat panel ── */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[360px] max-h-[600px] flex flex-col rounded-3xl overflow-hidden"
          style={{
            background: '#fff',
            boxShadow: '0 24px 60px rgba(15,10,30,0.25), 0 8px 20px rgba(168,85,247,0.15)',
            border: '1px solid rgba(168,85,247,0.15)',
          }}
        >
          {/* Header */}
          <div
            className="relative px-5 py-4 flex items-center justify-between"
            style={{ background: `linear-gradient(135deg, ${PINK}, ${PURPLE})` }}
          >
            {/* Subtle shine overlay */}
            <div
              className="absolute inset-0 opacity-20"
              style={{ background: 'radial-gradient(circle at 20% 0%, #fff 0%, transparent 60%)' }}
            />
            <div className="relative flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)' }}
              >
                <Sparkles size={17} className="text-white" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-tight">Dentelligence AI</p>
                <p className="text-[11px] text-white/80 leading-tight mt-0.5">
                  {loading ? 'Thinking…' : 'Ask about today'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="relative w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.15)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            >
              <X size={16} className="text-white" />
            </button>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0"
            style={{
              maxHeight: 400,
              background: 'linear-gradient(180deg, #faf5ff 0%, #fff 100%)',
            }}
          >
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="text-center py-3">
                  <div
                    className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-2"
                    style={{
                      background: `linear-gradient(135deg, ${PINK}15, ${PURPLE}20)`,
                      border: `1px solid ${PURPLE}20`,
                    }}
                  >
                    <Sparkles size={20} style={{ color: PURPLE }} />
                  </div>
                  <p className="text-xs text-gray-500 font-medium">
                    Hi! Ask me about today's schedule or queue.
                  </p>
                </div>
                <div className="space-y-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full text-left text-xs px-3.5 py-2.5 rounded-xl transition-all group"
                      style={{
                        background: '#fff',
                        border: '1px solid #f3e8ff',
                        color: '#4b5563',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = PURPLE + '60';
                        e.currentTarget.style.background = `linear-gradient(135deg, ${PINK}08, ${PURPLE}0d)`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#f3e8ff';
                        e.currentTarget.style.background = '#fff';
                      }}
                    >
                      <span className="mr-1.5 opacity-40 group-hover:opacity-100">→</span>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'ai' && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
                    style={{ background: `linear-gradient(135deg, ${PINK}, ${PURPLE})` }}
                  >
                    <Sparkles size={12} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[78%] px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.role === 'user' ? 'text-white' : 'text-gray-700'
                  }`}
                  style={
                    m.role === 'user'
                      ? {
                          background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                          borderRadius: '18px 18px 4px 18px',
                          boxShadow: `0 4px 12px ${PINK}30`,
                        }
                      : {
                          background: '#fff',
                          border: '1px solid #f3e8ff',
                          borderRadius: '18px 18px 18px 4px',
                        }
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start items-end gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${PINK}, ${PURPLE})` }}
                >
                  <Sparkles size={12} className="text-white" />
                </div>
                <div
                  className="px-3.5 py-3 flex items-center gap-1"
                  style={{
                    background: '#fff',
                    border: '1px solid #f3e8ff',
                    borderRadius: '18px 18px 18px 4px',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: PINK, animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: PURPLE, animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: PINK, animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className="px-3.5 py-3"
            style={{ background: '#fff', borderTop: '1px solid #f3e8ff' }}
          >
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex gap-2 items-center rounded-2xl pl-3.5 pr-1 py-1"
              style={{ background: '#faf5ff', border: '1px solid #f3e8ff' }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask something..."
                className="flex-1 text-xs py-2 bg-transparent focus:outline-none placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="h-8 w-8 flex items-center justify-center rounded-xl disabled:opacity-30 transition-all flex-shrink-0"
                style={{
                  background: !input.trim() || loading
                    ? '#e5e7eb'
                    : `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                  boxShadow: !input.trim() || loading ? 'none' : `0 4px 10px ${PINK}40`,
                }}
              >
                {loading
                  ? <Loader2 size={13} className="text-white animate-spin" />
                  : <Send size={13} className="text-white" />}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
