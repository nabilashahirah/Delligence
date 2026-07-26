import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock, CheckCircle, Activity, TrendingUp, ArrowRight, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '../../api/dashboard.api';
import Card from '../../components/ui/Card';
import useAuthStore from '../../store/authStore';

/* ─── Colour tokens ─────────────────────────────────── */
const PINK   = '#FF2D8F';
const PURPLE = '#A855F7';
const GOLD   = '#F7C873';

const TYPE_LABEL = {
  checkup:'Check-up', cleaning:'Cleaning', filling:'Filling',
  extraction:'Extraction', 'root-canal':'Root Canal',
  consultation:'Consultation', other:'Other',
};
const TYPE_COLOR = [
  `linear-gradient(90deg,${PINK},${PURPLE})`,
  'linear-gradient(90deg,#06b6d4,#3b82f6)',
  `linear-gradient(90deg,${GOLD},#f97316)`,
  'linear-gradient(90deg,#10b981,#06b6d4)',
  'linear-gradient(90deg,#8b5cf6,#6366f1)',
  'linear-gradient(90deg,#f43f5e,#ec4899)',
  'linear-gradient(90deg,#94a3b8,#64748b)',
];

/* ─── Stat Card ─────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, accent, iconGrad }) {
  return (
    <Card className="p-5 relative overflow-hidden">
      {/* top accent line */}
      <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: accent }} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-400 truncate">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1 leading-none">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-400 mt-1.5 truncate">{sub}</p>}
        </div>
        <div
          className="h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconGrad, boxShadow: `0 4px 14px ${accent}40` }}
        >
          <Icon size={19} className="text-white" />
        </div>
      </div>
    </Card>
  );
}

/* ─── Bar chart / Sparkline ─────────────────────────── */
function BarChart({ data = [] }) {
  if (!data.length) return <p className="text-sm text-gray-300 py-4 text-center">No data</p>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-20 mt-2">
      {data.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
          <span className="text-[10px] font-medium text-gray-400">{d.count || ''}</span>
          <div
            className="w-full rounded-t-lg transition-all"
            style={{
              height: `${Math.max(4, (d.count / max) * 52)}px`,
              background: d.count === 0
                ? '#f3f4f6'
                : `linear-gradient(to top, ${PINK}, ${PURPLE})`,
              opacity: d.count === 0 ? 0.5 : 1,
            }}
          />
          <span className="text-[10px] text-gray-400">
            {new Date(d.date + 'T00:00:00').toLocaleDateString('en-MY', { weekday: 'short' })}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Status tile ───────────────────────────────────── */
function StatusTile({ label, count, color, bg }) {
  return (
    <div className="flex-1 rounded-2xl px-4 py-3 text-center min-w-0" style={{ background: bg }}>
      <p className="text-2xl font-bold" style={{ color }}>{count ?? 0}</p>
      <p className="text-xs font-medium mt-0.5 truncate" style={{ color }}>{label}</p>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────── */
export default function DashboardPage() {
  const user     = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    refetchInterval: 60_000,
    select: (res) => res.data.data,
  });

  const today = data?.today;
  const week  = data?.week;

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Good {getGreeting()},&nbsp;
            <span style={{
              background: `linear-gradient(135deg,${PINK},${PURPLE})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {user?.name?.split(' ')[0]}
            </span>
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => navigate('/queue')}
          className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white flex-shrink-0"
          style={{ background: `linear-gradient(135deg,${PINK},${PURPLE})`, boxShadow: `0 4px 16px ${PINK}35` }}
        >
          Live Queue <ArrowRight size={14} />
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CalendarDays}
          label="Today's Appointments"
          value={isLoading ? '…' : today?.total}
          sub={today?.busiestDentist ? `Busiest: ${today.busiestDentist}` : 'No appointments yet'}
          accent={`linear-gradient(90deg,${PINK},${PURPLE})`}
          iconGrad={`linear-gradient(135deg,${PINK},${PURPLE})`}
        />
        <StatCard
          icon={CheckCircle}
          label="Completed Today"
          value={isLoading ? '…' : today?.completed}
          sub={today?.scheduled > 0 ? `${today.scheduled} still scheduled` : 'All done'}
          accent="linear-gradient(90deg,#10b981,#06b6d4)"
          iconGrad="linear-gradient(135deg,#10b981,#06b6d4)"
        />
        <StatCard
          icon={Activity}
          label="Active Now"
          value={isLoading ? '…' : `${today?.inProgress ?? 0} / ${today?.checkedIn ?? 0}`}
          sub="in-progress / checked-in"
          accent={`linear-gradient(90deg,${GOLD},#f97316)`}
          iconGrad={`linear-gradient(135deg,${GOLD},#f97316)`}
        />
        <StatCard
          icon={Clock}
          label="Avg Wait Today"
          value={isLoading ? '…' : today?.avgWaitMinutes != null ? `${today.avgWaitMinutes}m` : '—'}
          sub={week?.avgWaitMinutes != null ? `${week.avgWaitMinutes}m this week` : undefined}
          accent={`linear-gradient(90deg,${PURPLE},#6366f1)`}
          iconGrad={`linear-gradient(135deg,${PURPLE},#6366f1)`}
        />
      </div>

      {/* ── Status overview ── */}
      {!isLoading && today?.total > 0 && (
        <div className="flex gap-3">
          <StatusTile label="Scheduled"   count={today.scheduled}  color="#3b82f6" bg="#eff6ff" />
          <StatusTile label="Checked In"  count={today.checkedIn}  color="#f59e0b" bg="#fffbeb" />
          <StatusTile label="In Progress" count={today.inProgress} color={PURPLE}  bg="#f5f3ff" />
          <StatusTile label="Completed"   count={today.completed}  color="#10b981" bg="#ecfdf5" />
        </div>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Weekly trend */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Completed This Week</p>
              <p className="text-3xl font-bold text-gray-900 mt-0.5">
                {isLoading ? '…' : week?.totalCompleted ?? 0}
              </p>
            </div>
            <div
              className="h-10 w-10 rounded-2xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg,${PINK},${PURPLE})`, boxShadow: `0 4px 12px ${PINK}30` }}
            >
              <TrendingUp size={17} className="text-white" />
            </div>
          </div>
          <BarChart data={week?.dailyCounts ?? []} />
        </Card>

        {/* Treatment mix */}
        <Card className="p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Treatment Mix Today</p>
          {isLoading ? (
            <p className="text-sm text-gray-300">Loading...</p>
          ) : !today?.typeBreakdown || Object.keys(today.typeBreakdown).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Users size={28} className="text-gray-200" />
              <p className="text-sm text-gray-300">No appointments today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(today.typeBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count], i) => {
                  const pct = Math.round((count / today.total) * 100);
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-medium text-gray-700">{TYPE_LABEL[type] ?? type}</span>
                        <span className="text-gray-400">{count} · {pct}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: TYPE_COLOR[i % TYPE_COLOR.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
