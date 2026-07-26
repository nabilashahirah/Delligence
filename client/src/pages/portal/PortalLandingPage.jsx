import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, ArrowRight, UserPlus, Search, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react';
import { lookupPatient } from '../../api/portal.api';

const PINK   = '#FF2D8F';
const PURPLE = '#A855F7';
const GOLD   = '#F7C873';

export default function PortalLandingPage() {
  const navigate = useNavigate();
  const [ic, setIc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleContinue(e) {
    e.preventDefault();
    const trimmed = ic.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      const res = await lookupPatient(trimmed);
      const { found, patientId, firstName, lastName } = res.data.data;
      navigate('/portal/book', {
        state: {
          ic: trimmed, found,
          patientId: patientId ?? null,
          firstName: firstName ?? '',
          lastName:  lastName  ?? '',
        },
      });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PortalShell>
      {/* Welcome */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Welcome 👋
        </h2>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Enter your IC to book, check-in, or view your queue.
        </p>
      </div>

      <form onSubmit={handleContinue} className="space-y-4">
        <div>
          <label
            className="block text-[10px] font-bold uppercase tracking-widest mb-2"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            IC / Passport Number
          </label>
          <div className="relative">
            <User
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            />
            <input
              type="text"
              value={ic}
              onChange={(e) => setIc(e.target.value)}
              placeholder="e.g. 860312145678"
              autoFocus
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none transition-all text-white placeholder:text-white/30"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1.5px solid rgba(255,255,255,0.1)',
                caretColor: PINK,
              }}
              onFocus={e => {
                e.target.style.border = `1.5px solid ${PINK}`;
                e.target.style.boxShadow = `0 0 0 4px rgba(255,45,143,0.15)`;
                e.target.style.background = 'rgba(255,255,255,0.1)';
              }}
              onBlur={e => {
                e.target.style.border = '1.5px solid rgba(255,255,255,0.1)';
                e.target.style.boxShadow = 'none';
                e.target.style.background = 'rgba(255,255,255,0.06)';
              }}
            />
          </div>
          <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            <ShieldCheck className="w-3 h-3" />
            Used only to find or create your record. Not shared.
          </p>
        </div>

        {error && (
          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <GradBtn
          disabled={!ic.trim() || loading}
          loading={loading}
          label={
            <span className="flex items-center justify-center gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </span>
          }
        />
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <span
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          or
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
      </div>

      {/* Quick actions */}
      <div className="space-y-2.5">
        <QuickAction
          icon={Sparkles}
          title="New here? Register & book"
          desc="Create your record and book your first visit."
          onClick={() => navigate('/portal/book', { state: { newCustomer: true } })}
          grad={`linear-gradient(135deg, ${PURPLE}, #6366f1)`}
        />
        <QuickAction
          icon={UserPlus}
          title="Walk-in visit"
          desc="No appointment needed — register on arrival."
          onClick={() => navigate('/portal/walkin')}
          grad={`linear-gradient(135deg, ${PINK}, ${PURPLE})`}
        />
        <QuickAction
          icon={Search}
          title="Check queue position"
          desc="See your live status if you already checked in."
          onClick={() => navigate('/portal/queue')}
          grad="linear-gradient(135deg, #06b6d4, #3b82f6)"
        />
      </div>
    </PortalShell>
  );
}

function QuickAction({ icon: Icon, title, desc, onClick, grad }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl px-4 py-3 flex items-center gap-3 transition-all group"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.09)';
        e.currentTarget.style.borderColor = 'rgba(168,85,247,0.4)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: grad, boxShadow: '0 4px 12px rgba(168,85,247,0.35)' }}
      >
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-[11px] leading-tight mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {desc}
        </p>
      </div>
      <ArrowRight
        className="w-4 h-4 transition-colors flex-shrink-0"
        style={{ color: 'rgba(255,255,255,0.25)' }}
      />
    </button>
  );
}

/* ─── Shared shell (DARK) ────────────────────────────── */
export function PortalShell({ children, maxWidth = 440 }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#0D0B21' }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-30"
          style={{ background: `radial-gradient(circle, ${PINK}, transparent 70%)`, filter: 'blur(80px)' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-25"
          style={{ background: `radial-gradient(circle, ${PURPLE}, transparent 70%)`, filter: 'blur(90px)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-8"
          style={{ background: `radial-gradient(circle, ${GOLD}, transparent 70%)`, filter: 'blur(80px)' }}
        />
      </div>

      <div className="w-full relative" style={{ maxWidth }}>
        {/* Back to landing */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold mb-3 transition-colors"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to home
        </Link>

        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.4), 0 8px 24px rgba(168,85,247,0.15)',
          }}
        >
          {/* Header */}
          <div
            className="relative px-8 pt-8 pb-6 text-center"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            {/* Gradient brand-strip tab */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 rounded-b-full"
              style={{ background: `linear-gradient(90deg, ${PINK}, ${PURPLE})` }}
            />

            <img
              src="/Delligence2.png"
              alt="Delligence"
              style={{ height: 44, width: 'auto', maxWidth: 200, display: 'inline-block' }}
            />
            <p
              className="text-[11px] mt-2 font-semibold tracking-widest uppercase"
              style={{
                background: `linear-gradient(90deg, ${PINK}, ${PURPLE})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Customer Portal
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-7">{children}</div>

          {/* Footer */}
          <div
            className="px-6 py-3 text-center flex items-center justify-center gap-1.5 text-[10px]"
            style={{
              background: 'rgba(0,0,0,0.2)',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            <MessageSquare className="w-3 h-3" />
            Link Telegram after booking for live updates
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Gradient button ────────────────────────────────── */
export function GradBtn({ label, disabled, loading, type = 'submit', onClick }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
        boxShadow: `0 6px 24px rgba(255,45,143,0.4)`,
        letterSpacing: '0.02em',
      }}
      onMouseEnter={e => {
        if (!disabled && !loading) {
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(255,45,143,0.55)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(255,45,143,0.4)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Please wait...
        </span>
      ) : label}
    </button>
  );
}
