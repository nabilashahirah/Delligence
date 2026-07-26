import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarDays,
  ListOrdered, LogOut, CalendarRange, Menu, X, MessageSquare,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const links = [
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/patients',     label: 'Patients',     icon: Users },
  { to: '/calendar',     label: 'Calendar',     icon: CalendarRange },
  { to: '/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/queue',        label: 'Live Queue',   icon: ListOrdered },
  { to: '/messages',     label: 'Messages',     icon: MessageSquare },
];

function SidebarContent({ onClose }) {
  const logout   = useAuthStore((s) => s.logout);
  const user     = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); if (onClose) onClose(); };

  return (
    <aside
      className="flex h-full flex-col"
      style={{ width: 280, background: '#0D0B21' }}
    >
      {/* ── Logo ── */}
      <div className="pt-6 pb-5 px-5 flex items-center justify-between gap-2">
        <img
          src="/Delligence2.png"
          alt="Delligence"
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden ml-3 flex-shrink-0"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="mx-5" style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

      {/* ── Nav ── */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onClose}>
            {({ isActive }) => (
              <div
                className="flex items-center gap-3.5 rounded-xl px-4 py-3 font-medium transition-all cursor-pointer"
                style={{
                  fontSize: 14,
                  background: isActive ? 'rgba(255,45,143,0.13)' : 'transparent',
                  color:      isActive ? '#ffffff'                : 'rgba(255,255,255,0.45)',
                  borderLeft: isActive ? '2.5px solid #FF2D8F'   : '2.5px solid transparent',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                  }
                }}
              >
                <Icon size={18} style={{ color: isActive ? '#FF2D8F' : 'inherit', flexShrink: 0 }} />
                {label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mx-5" style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

      {/* ── User + logout ── */}
      <div className="px-4 py-4 space-y-1">
        {user && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <div
              className="gradient-brand flex items-center justify-center flex-shrink-0 rounded-full font-bold text-white"
              style={{
                width: 36, height: 36, fontSize: 14,
                boxShadow: '0 0 0 2px rgba(255,45,143,0.35)',
              }}
            >
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {user.name}
              </p>
              <p className="text-xs capitalize mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {user.role}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-all"
          style={{ color: 'rgba(255,255,255,0.35)' }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#f87171';
            e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.35)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:flex h-screen flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile top bar */}
      <div
        className="lg:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-5 py-3"
        style={{ background: '#0D0B21', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <img src="/Delligence2.png" alt="Delligence" style={{ height: 36, width: 'auto', maxWidth: 160 }} />
        <button onClick={() => setOpen(true)} style={{ color: 'rgba(255,255,255,0.6)' }}>
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
            onClick={() => setOpen(false)}
          />
          <div className="lg:hidden fixed top-0 left-0 z-50 h-full shadow-2xl">
            <SidebarContent onClose={() => setOpen(false)} />
          </div>
        </>
      )}
    </>
  );
}
