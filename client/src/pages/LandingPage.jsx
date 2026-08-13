import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, ArrowRight, ShieldCheck, MessageSquare,
  Calendar, Users, Activity, LogIn, Mail,
} from 'lucide-react';

const DEMO_EMAIL = 'nnabila.salim@gmail.com';
const DEMO_MAILTO = `mailto:${DEMO_EMAIL}?subject=Delligence%20demo%20request&body=Hi%2C%0A%0AI%27d%20like%20to%20see%20a%20Delligence%20demo.%0A%0ABusiness%20name%3A%0AType%20of%20business%3A%0APreferred%20date%2Ftime%3A%0A%0AThanks%21`;
import useAuthStore from '../store/authStore';

const PINK   = '#FF2D8F';
const PURPLE = '#A855F7';
const GOLD   = '#F7C873';

const FEATURES = [
  {
    icon: Activity,
    title: 'Real-time Queue',
    desc: 'Live wait-time predictions powered by ML.',
    grad: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
  },
  {
    icon: MessageSquare,
    title: 'Telegram Reminders',
    desc: 'Auto reminders and queue updates for every visit.',
    grad: 'linear-gradient(135deg, #10b981, #06b6d4)',
  },
  {
    icon: Sparkles,
    title: 'AI Assistant',
    desc: 'Ask about today\'s schedule in plain English.',
    grad: `linear-gradient(135deg, ${PURPLE}, #6366f1)`,
  },
  {
    icon: Calendar,
    title: 'Smart Booking',
    desc: 'Conflict detection, walk-ins, self-service portal.',
    grad: `linear-gradient(135deg, ${GOLD}, #f97316)`,
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  // If already logged in, skip landing and go straight to dashboard
  useEffect(() => {
    if (token) navigate('/dashboard', { replace: true });
  }, [token, navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#0D0B21' }}>
      {/* ── Background decoration ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-30"
          style={{ background: `radial-gradient(circle, ${PINK}, transparent 70%)`, filter: 'blur(60px)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full opacity-25"
          style={{ background: `radial-gradient(circle, ${PURPLE}, transparent 70%)`, filter: 'blur(80px)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${GOLD}, transparent 70%)`, filter: 'blur(60px)' }}
        />
      </div>

      {/* ── Nav bar ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5">
        <img
          src="/Delligence2.png"
          alt="Delligence"
          style={{ height: 72, width: 'auto', display: 'block' }}
        />

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/login')}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full transition-colors"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          >
            <LogIn className="w-4 h-4" />
            Staff Sign In
          </button>
          <a
            href={DEMO_MAILTO}
            className="hidden md:flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full transition-colors"
            style={{ color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.2)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
            }}
          >
            <Mail className="w-4 h-4" />
            Request Demo
          </a>
          <button
            onClick={() => navigate('/portal')}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-full transition-transform hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
              boxShadow: `0 4px 14px ${PINK}45`,
            }}
          >
            Patient Portal
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 px-6 lg:px-12 pt-8 lg:pt-16 pb-20 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
            style={{
              background: 'rgba(168,85,247,0.15)',
              border: '1px solid rgba(168,85,247,0.3)',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: PINK }} />
            <span className="text-xs font-semibold text-white/90 tracking-wide">
              AI-powered practice management
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl lg:text-7xl font-bold text-white tracking-tight leading-[1.05]">
            Work smarter.
            <br />
            <span
              style={{
                background: `linear-gradient(135deg, ${PINK}, ${PURPLE}, ${GOLD})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Delight everyone.
            </span>
          </h1>

          <p className="mt-6 text-base lg:text-lg text-white/60 max-w-xl mx-auto leading-relaxed">
            Manage bookings, predict wait times with AI, and keep people
            informed via Telegram — all from one beautiful workspace.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/portal')}
              className="group flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold text-white transition-transform hover:scale-105 w-full sm:w-auto justify-center"
              style={{
                background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                boxShadow: `0 10px 30px ${PINK}55, 0 4px 14px ${PURPLE}45`,
              }}
            >
              <Users className="w-4 h-4" />
              I'm a Customer
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => navigate('/login')}
              className="group flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold transition-all w-full sm:w-auto justify-center"
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              }}
            >
              <ShieldCheck className="w-4 h-4" />
              Staff Sign In
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <p className="mt-5 text-xs text-white/40">
            Customers: book without an account · Staff: full dashboard access
          </p>

          {/* Request Demo — for prospective businesses */}
          <div className="mt-8 flex flex-col items-center gap-2">
            <a
              href={DEMO_MAILTO}
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-transform hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${GOLD}, #f97316)`,
                color: '#1a0f00',
                boxShadow: `0 8px 24px ${GOLD}55`,
              }}
            >
              <Mail className="w-4 h-4" />
              Request a Demo for Your Business
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
            <p className="text-xs text-white/40">
              Running a clinic, salon, or spa? See Delligence in action.
            </p>
          </div>
        </div>

        {/* ── Feature strip ── */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl p-5 transition-transform hover:-translate-y-1"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: f.grad, boxShadow: '0 6px 18px rgba(168,85,247,0.35)' }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{f.title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>

        {/* ── Small stats strip ── */}
        <div
          className="mt-12 rounded-3xl px-6 py-5 flex flex-wrap items-center justify-around gap-6 text-center"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Stat value="24h" label="Reminder window" />
          <Divider />
          <Stat value="ML" label="Wait prediction" />
          <Divider />
          <Stat value="Live" label="Queue updates" />
          <Divider />
          <Stat value="Free" label="Customer portal" />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="relative z-10 px-6 lg:px-12 py-6 text-center border-t"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <p className="text-xs text-white/40">
          © 2025 Delligence · Built with care
        </p>
      </footer>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <p
        className="text-2xl font-bold"
        style={{
          background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {value}
      </p>
      <p className="text-[11px] text-white/40 mt-0.5 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function Divider() {
  return <div className="hidden sm:block h-8 w-px" style={{ background: 'rgba(255,255,255,0.1)' }} />;
}
