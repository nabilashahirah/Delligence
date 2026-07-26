import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, Send, Users, CheckCircle2, XCircle, Clock,
  Sparkles, X, Search, Calendar, UserX, Bell, Megaphone, TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { sendPromo, listMessages, messageStats, draftPromo } from '../../api/messages.api';

const PINK   = '#FF2D8F';
const PURPLE = '#A855F7';
const GOLD   = '#F7C873';

const TONES = [
  { value: 'friendly',     label: 'Friendly',     emoji: '😊' },
  { value: 'professional', label: 'Professional', emoji: '💼' },
  { value: 'playful',      label: 'Playful',      emoji: '✨' },
  { value: 'urgent',       label: 'Urgent',       emoji: '⚡' },
];

const SEGMENTS = [
  {
    value: 'all_linked',
    label: 'All linked patients',
    hint: 'Everyone connected via Telegram',
    icon: Users,
    grad: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
  },
  {
    value: 'with_upcoming',
    label: 'Upcoming appointments',
    hint: 'Patients with an appointment coming up',
    icon: Calendar,
    grad: 'linear-gradient(135deg, #10b981, #06b6d4)',
  },
  {
    value: 'no_visit_6mo',
    label: 'Dormant patients',
    hint: 'No visit in the last 6 months',
    icon: UserX,
    grad: `linear-gradient(135deg, ${GOLD}, #f97316)`,
  },
];

const EVENT_LABEL = {
  reminder_24h:  { text: '24h reminder', color: PURPLE,    icon: Bell },
  checked_in:    { text: 'Check-in',     color: '#10b981', icon: CheckCircle2 },
  you_are_next:  { text: "You're next",  color: '#f59e0b', icon: Bell },
  called_in:     { text: 'Called in',    color: PINK,      icon: Sparkles },
  promo:         { text: 'Promo',        color: '#3b82f6', icon: Megaphone },
};

// Render Telegram-flavored HTML safely
function renderTelegramHtml(text) {
  if (!text) return { __html: '' };
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const withTags = escaped
    .replace(/&lt;(\/?)(b|strong|i|em|u|s|code)&gt;/gi, '<$1$2>')
    .replace(/\n/g, '<br />');
  return { __html: withTags };
}

export default function MessagesPage() {
  const [message, setMessage] = useState('');
  const [segment, setSegment] = useState('all_linked');
  const [showDraft, setShowDraft] = useState(false);
  const [brief, setBrief] = useState('');
  const [tone, setTone] = useState('friendly');
  const [historyFilter, setHistoryFilter] = useState('');
  const qc = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['message-stats'],
    queryFn: () => messageStats().then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: () => listMessages({ limit: 100 }).then((r) => r.data.data),
    refetchInterval: 15000,
  });

  const { mutate: doSend, isPending } = useMutation({
    mutationFn: () => sendPromo({ message, segment }),
    onSuccess: (r) => {
      const { sent, targeted, failed } = r.data.data;
      toast.success(`Sent to ${sent}/${targeted} patients${failed ? ` (${failed} failed)` : ''}`);
      setMessage('');
      qc.invalidateQueries({ queryKey: ['messages'] });
      qc.invalidateQueries({ queryKey: ['message-stats'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to send'),
  });

  const { mutate: doDraft, isPending: isDrafting } = useMutation({
    mutationFn: () => draftPromo({ brief, tone }),
    onSuccess: (r) => {
      setMessage(r.data.data.message);
      setShowDraft(false);
      setBrief('');
      toast.success('Draft ready — review and edit before sending');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'AI draft failed'),
  });

  const logs = logsData?.messages ?? [];
  const filteredLogs = historyFilter
    ? logs.filter((l) =>
        (l.patientName ?? '').toLowerCase().includes(historyFilter.toLowerCase()) ||
        (l.text ?? '').toLowerCase().includes(historyFilter.toLowerCase()))
    : logs;

  return (
    <div className="p-6 space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
              boxShadow: `0 4px 14px ${PINK}35`,
            }}
          >
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Messages{' '}
              <span
                style={{
                  background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Center
              </span>
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Broadcast promos and audit every Telegram message.</p>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          label="Linked Patients"
          value={stats?.linkedPatients ?? '—'}
          sub={stats?.totalPatients ? `of ${stats.totalPatients} total` : ''}
          accent={`linear-gradient(90deg,${PURPLE},#6366f1)`}
          iconGrad={`linear-gradient(135deg,${PURPLE},#6366f1)`}
        />
        <StatCard
          icon={Send}
          label="Sent Today"
          value={stats?.sentToday ?? '—'}
          sub="messages delivered"
          accent={`linear-gradient(90deg,${PINK},${PURPLE})`}
          iconGrad={`linear-gradient(135deg,${PINK},${PURPLE})`}
        />
        <StatCard
          icon={TrendingUp}
          label="Reach Rate"
          value={
            stats?.totalPatients
              ? `${Math.round((stats.linkedPatients / stats.totalPatients) * 100)}%`
              : '—'
          }
          sub="of patients reachable"
          accent="linear-gradient(90deg,#10b981,#06b6d4)"
          iconGrad="linear-gradient(135deg,#10b981,#06b6d4)"
        />
      </div>

      {/* ── Compose card ── */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: '#fff',
          border: '1px solid #f3e8ff',
          boxShadow: '0 4px 20px rgba(168,85,247,0.06)',
        }}
      >
        {/* Card header */}
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ background: 'linear-gradient(90deg, #faf5ff, #fdf2f8)' }}
        >
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4" style={{ color: PURPLE }} />
            <h2 className="text-sm font-bold text-gray-800">Send a Broadcast</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowDraft(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-transform hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
              color: '#fff',
              boxShadow: `0 3px 10px ${PINK}40`,
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Draft with AI
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Audience selector — pills */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Audience
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {SEGMENTS.map((s) => {
                const selected = segment === s.value;
                const Icon = s.icon;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSegment(s.value)}
                    className="text-left rounded-2xl px-4 py-3 transition-all"
                    style={{
                      background: selected ? s.grad : '#fff',
                      border: selected ? '1px solid transparent' : '1px solid #f3e8ff',
                      color: selected ? '#fff' : '#374151',
                      boxShadow: selected ? `0 6px 18px rgba(168,85,247,0.25)` : 'none',
                      transform: selected ? 'translateY(-1px)' : 'none',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: selected ? '#fff' : PURPLE }}
                      />
                      <p className="text-sm font-semibold truncate">{s.label}</p>
                    </div>
                    <p
                      className="text-[11px] leading-tight"
                      style={{ color: selected ? 'rgba(255,255,255,0.85)' : '#9ca3af' }}
                    >
                      {s.hint}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message textarea */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Message
            </label>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi! We have a 20% off teeth cleaning promo this week. Book now via the portal."
              className="w-full px-4 py-3 rounded-2xl text-sm resize-none focus:outline-none transition-colors"
              style={{
                border: '1px solid #f3e8ff',
                background: '#fafafa',
              }}
              onFocus={(e) => { e.target.style.borderColor = PURPLE; e.target.style.background = '#fff'; }}
              onBlur={(e) => { e.target.style.borderColor = '#f3e8ff'; e.target.style.background = '#fafafa'; }}
            />
            <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Telegram HTML: <code className="text-gray-500">&lt;b&gt;bold&lt;/b&gt;</code> · <code className="text-gray-500">&lt;i&gt;italic&lt;/i&gt;</code>
            </p>
          </div>

          {/* Live preview */}
          {message.trim() && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Preview
                <span className="ml-2 text-[10px] normal-case font-medium text-gray-400 tracking-normal">
                  (how it looks in Telegram)
                </span>
              </label>
              <div className="flex items-end gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${PINK}, ${PURPLE})` }}
                >
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div
                  className="px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap max-w-[80%]"
                  style={{
                    background: '#fff',
                    border: '1px solid #e0e7ff',
                    borderRadius: '18px 18px 18px 4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                  dangerouslySetInnerHTML={renderTelegramHtml(message)}
                />
              </div>
            </div>
          )}

          {/* Send button */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
            <p className="text-xs text-gray-400">
              {message.trim().length} character{message.trim().length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => doSend()}
              disabled={isPending || message.trim().length < 3}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                boxShadow: `0 6px 18px ${PINK}40`,
              }}
            >
              {isPending
                ? <>Sending…</>
                : <><Send className="w-4 h-4" /> Send Now</>}
            </button>
          </div>
        </div>
      </div>

      {/* ── AI Draft dialog ── */}
      {showDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,10,30,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => !isDrafting && setShowDraft(false)}
        >
          <div
            className="rounded-3xl max-w-md w-full overflow-hidden"
            style={{ background: '#fff', boxShadow: '0 24px 60px rgba(15,10,30,0.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dialog header */}
            <div
              className="relative px-6 py-5 flex items-center justify-between"
              style={{ background: `linear-gradient(135deg, ${PINK}, ${PURPLE})` }}
            >
              <div
                className="absolute inset-0 opacity-20"
                style={{ background: 'radial-gradient(circle at 20% 0%, #fff 0%, transparent 60%)' }}
              />
              <div className="relative flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)' }}
                >
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Draft with AI</h3>
                  <p className="text-[11px] text-white/80 leading-tight mt-0.5">Powered by Gemini</p>
                </div>
              </div>
              <button
                onClick={() => setShowDraft(false)}
                disabled={isDrafting}
                className="relative w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Your brief
                </label>
                <textarea
                  rows={3}
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="e.g. 20% off teeth cleaning this week. Book by Friday."
                  className="w-full px-4 py-3 rounded-2xl text-sm resize-none focus:outline-none transition-colors"
                  style={{ border: '1px solid #f3e8ff', background: '#fafafa' }}
                  onFocus={(e) => { e.target.style.borderColor = PURPLE; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#f3e8ff'; e.target.style.background = '#fafafa'; }}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Tone</label>
                <div className="grid grid-cols-4 gap-2">
                  {TONES.map((t) => {
                    const selected = tone === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTone(t.value)}
                        className="text-xs font-semibold py-2.5 rounded-xl transition-all"
                        style={{
                          background: selected ? `linear-gradient(135deg, ${PINK}, ${PURPLE})` : '#faf5ff',
                          color:      selected ? '#fff' : '#6b7280',
                          border:     selected ? '1px solid transparent' : '1px solid #f3e8ff',
                          boxShadow:  selected ? `0 4px 12px ${PINK}30` : 'none',
                        }}
                      >
                        <div className="text-base leading-none mb-1">{t.emoji}</div>
                        <div>{t.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowDraft(false)}
                  disabled={isDrafting}
                  className="flex-1 py-3 text-sm font-semibold text-gray-600 rounded-2xl transition-colors disabled:opacity-40"
                  style={{ background: '#f3f4f6' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => doDraft()}
                  disabled={isDrafting || brief.trim().length < 3}
                  className="flex-1 py-3 text-sm font-semibold text-white rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] disabled:hover:scale-100"
                  style={{
                    background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                    boxShadow: `0 6px 18px ${PINK}40`,
                  }}
                >
                  {isDrafting
                    ? <>Generating…</>
                    : <><Sparkles className="w-4 h-4" /> Generate</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── History ── */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: '#fff',
          border: '1px solid #f3e8ff',
          boxShadow: '0 4px 20px rgba(168,85,247,0.06)',
        }}
      >
        <div
          className="px-5 py-3 flex items-center justify-between gap-4"
          style={{ background: 'linear-gradient(90deg, #faf5ff, #fdf2f8)' }}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: PURPLE }} />
            <h2 className="text-sm font-bold text-gray-800">Message History</h2>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: PURPLE + '18', color: PURPLE }}
            >
              {filteredLogs.length}
            </span>
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              placeholder="Filter…"
              className="w-full pl-9 pr-3 py-1.5 rounded-full text-xs focus:outline-none transition-colors"
              style={{ background: '#fff', border: '1px solid #f3e8ff' }}
              onFocus={(e) => (e.target.style.borderColor = PURPLE)}
              onBlur={(e) => (e.target.style.borderColor = '#f3e8ff')}
            />
          </div>
        </div>

        {logsLoading ? (
          <div className="py-12 text-center">
            <div
              className="w-10 h-10 rounded-full mx-auto mb-3 animate-pulse"
              style={{ background: `linear-gradient(135deg, ${PINK}20, ${PURPLE}20)` }}
            />
            <p className="text-sm text-gray-400">Loading…</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center">
            <div
              className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)' }}
            >
              <MessageSquare className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              {historyFilter ? 'No messages match your filter.' : 'No messages sent yet.'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {!historyFilter && 'Send your first broadcast above.'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#faf5ff' }}>
            {filteredLogs.map((log) => {
              const evt = EVENT_LABEL[log.event] ?? { text: log.event, color: '#6b7280', icon: Bell };
              const EvtIcon = evt.icon;
              return (
                <div
                  key={log.id}
                  className="px-5 py-4 flex items-start gap-3 transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#faf5ff40')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <StatusIcon status={log.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide flex items-center gap-1"
                        style={{ background: `${evt.color}18`, color: evt.color }}
                      >
                        <EvtIcon className="w-2.5 h-2.5" />
                        {evt.text}
                      </span>
                      {log.patientName && (
                        <span className="text-sm font-semibold text-gray-800">{log.patientName}</span>
                      )}
                      <span className="text-[11px] text-gray-400 ml-auto">
                        {new Date(log.sentAt).toLocaleString('en-MY', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p
                      className="text-sm text-gray-600 leading-relaxed line-clamp-3"
                      dangerouslySetInnerHTML={renderTelegramHtml(log.text)}
                    />
                    {log.error && (
                      <p className="text-[11px] text-red-500 mt-1.5 bg-red-50 rounded-lg px-2 py-1 inline-block">
                        {log.error}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent, iconGrad }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #f3e8ff' }}>
      <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-400">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1 leading-none">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
        </div>
        <div
          className="h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconGrad, boxShadow: `0 4px 14px rgba(168,85,247,0.25)` }}
        >
          <Icon size={19} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === 'sent')
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#ecfdf5' }}>
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      </div>
    );
  if (status === 'failed')
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#fef2f2' }}>
        <XCircle className="w-4 h-4 text-red-500" />
      </div>
    );
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#f3f4f6' }}>
      <Clock className="w-4 h-4 text-gray-400" />
    </div>
  );
}
