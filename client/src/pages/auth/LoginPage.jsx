import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Zap, Heart } from 'lucide-react';
import { login } from '../../api/auth.api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const features = [
  { icon: Heart,       label: 'People First',      desc: 'User-centred workflows' },
  { icon: Zap,         label: 'Data Driven',       desc: 'Real-time insights' },
  { icon: ShieldCheck, label: 'Secure & Reliable', desc: 'Enterprise-grade security' },
];

export default function LoginPage() {
  const navigate  = useNavigate();
  const setAuth   = useAuthStore((s) => s.setAuth);
  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await login(form);
      setAuth(data.data.staff, data.data.token);
      toast.success(`Welcome back, ${data.data.staff.name}`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── LEFT: Brand panel ── */}
      <div
        className="hidden lg:flex lg:w-[52%] items-center justify-center relative overflow-hidden"
        style={{ background: '#0D0B21' }}
      >
        {/* Glow orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div style={{
            position: 'absolute', width: 500, height: 500,
            top: '-80px', left: '-80px',
            background: 'radial-gradient(circle, rgba(255,45,143,0.2) 0%, transparent 60%)',
          }} />
          <div style={{
            position: 'absolute', width: 400, height: 400,
            bottom: '-60px', right: '-60px',
            background: 'radial-gradient(circle, rgba(168,85,247,0.18) 0%, transparent 60%)',
          }} />
        </div>

        {/* Dot grid */}
        <div className="pointer-events-none absolute inset-0" style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        {/* Content — all grouped, no gaps */}
        <div className="relative z-10 px-14 py-12 w-full max-w-lg">
          {/* Logo */}
          <img
            src="/Delligence2.png"
            alt="Delligence"
            style={{ width: '100%', maxWidth: 220, height: 'auto' }}
          />

          {/* Headline */}
          <div className="mt-10">
            <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
              Intelligent
            </h1>
            <h1 className="text-4xl font-bold leading-tight tracking-tight" style={{
              background: 'linear-gradient(135deg, #FF2D8F, #A855F7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Operations
            </h1>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.42)' }}>
              Streamline bookings, manage customers,<br />and deliver better service — all from one place.
            </p>
          </div>

          {/* Features */}
          <div className="mt-8 space-y-4">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-4">
                <div className="flex-shrink-0 flex items-center justify-center rounded-xl" style={{
                  width: 38, height: 38,
                  background: 'rgba(255,45,143,0.12)',
                  border: '1px solid rgba(255,45,143,0.22)',
                }}>
                  <Icon size={16} style={{ color: '#FF2D8F' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white leading-none">{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="mt-12 text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>
            © 2025 Delligence · All rights reserved
          </p>
        </div>
      </div>

      {/* ── RIGHT: Form panel ── */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-10">
        <div className="w-full" style={{ maxWidth: 380 }}>

          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <img src="/Delligence2.png" alt="Delligence"
              style={{ width: '100%', maxWidth: 180, height: 'auto' }} />
          </div>

          {/* Heading */}
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#0D0B21' }}>
            Welcome back
          </h2>
          <p className="mt-1.5 text-sm mb-8" style={{ color: '#9ca3af' }}>
            Sign in to your Delligence dashboard
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                style={{ color: '#9ca3af' }}>
                Email address
              </label>
              <input
                name="email" type="email" placeholder="you@company.com"
                value={form.email} onChange={handleChange} required
                className="w-full rounded-2xl px-4 py-3.5 text-sm outline-none transition-all"
                style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb', color: '#111827', caretColor: '#FF2D8F' }}
                onFocus={e => { e.target.style.border = '1.5px solid #FF2D8F'; e.target.style.boxShadow = '0 0 0 4px rgba(255,45,143,0.08)'; e.target.style.background = '#fff'; }}
                onBlur={e  => { e.target.style.border = '1.5px solid #e5e7eb'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f9fafb'; }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                style={{ color: '#9ca3af' }}>
                Password
              </label>
              <input
                name="password" type="password" placeholder="••••••••"
                value={form.password} onChange={handleChange} required
                className="w-full rounded-2xl px-4 py-3.5 text-sm outline-none transition-all"
                style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb', color: '#111827', caretColor: '#FF2D8F' }}
                onFocus={e => { e.target.style.border = '1.5px solid #FF2D8F'; e.target.style.boxShadow = '0 0 0 4px rgba(255,45,143,0.08)'; e.target.style.background = '#fff'; }}
                onBlur={e  => { e.target.style.border = '1.5px solid #e5e7eb'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f9fafb'; }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              className="w-full gradient-brand rounded-2xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-60"
              style={{ marginTop: 4, boxShadow: '0 6px 24px rgba(255,45,143,0.3)', letterSpacing: '0.03em' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 10px 32px rgba(255,45,143,0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(255,45,143,0.3)'; }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign In →'}
            </button>
          </form>

          <p className="mt-8 text-xs text-center" style={{ color: '#d1d5db' }}>
            © 2025 Delligence · Intelligent Operations
          </p>
        </div>
      </div>
    </div>
  );
}
