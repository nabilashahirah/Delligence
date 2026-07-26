import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQueueStatus } from '../../api/portal.api';
import { PortalShell, GradBtn } from './PortalLandingPage';

const WS_URL = 'ws://localhost:8000/ws';

const PINK   = '#FF2D8F';
const PURPLE = '#A855F7';

function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const STATUS_CONFIG = {
  scheduled:    { label: 'Waiting',     color: '#6b7280', bg: '#f3f4f6' },
  'checked-in': { label: 'Checked In',  color: '#059669', bg: '#ecfdf5' },
  'in-progress':{ label: 'In Progress', color: PURPLE,    bg: '#f5f3ff' },
};

export default function PortalQueuePage() {
  const navigate  = useNavigate();
  const [ic, setIc]         = useState('');
  const [loading, setLoad]  = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError]   = useState('');
  const [nearAlert, setNearAlert]   = useState(false);
  const [wsLive, setWsLive]         = useState(false);
  const [posFlash, setPosFlash]     = useState(false);
  const wsRef        = useRef(null);
  const reconnectRef = useRef(null);
  const flashRef     = useRef(null);

  // Open a WS connection once the patient's appointment is found, for live position updates
  useEffect(() => {
    if (!result?.found || !result?.appointmentId) {
      wsRef.current?.close();
      clearTimeout(reconnectRef.current);
      setWsLive(false);
      return;
    }

    const apptId = result.appointmentId;

    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen  = () => setWsLive(true);
      ws.onclose = () => {
        setWsLive(false);
        reconnectRef.current = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.event !== 'queue_update') return;
          const mine = msg.queue.find(q => q.appointmentId === apptId);
          if (!mine) return;
          setResult(prev => ({
            ...prev,
            position: mine.position,
            status: mine.status,
            predictedWaitMinutes: mine.estimatedWait,
          }));
          setNearAlert(mine.position <= 2 && mine.status === 'checked-in');
          // Flash the position badge to signal a live update
          setPosFlash(true);
          clearTimeout(flashRef.current);
          flashRef.current = setTimeout(() => setPosFlash(false), 1200);
        } catch {}
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectRef.current);
      clearTimeout(flashRef.current);
      wsRef.current?.close();
    };
  }, [result?.found, result?.appointmentId]);

  async function handleCheck(e) {
    e?.preventDefault();
    const trimmed = ic.trim();
    if (!trimmed) return;
    setLoad(true);
    setError('');
    setResult(null);
    try {
      const res = await getQueueStatus(trimmed);
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoad(false);
    }
  }

  const statusInfo = result ? (STATUS_CONFIG[result.status] ?? STATUS_CONFIG.scheduled) : null;

  return (
    <PortalShell>
      <button
        onClick={() => navigate('/portal')}
        className="text-xs text-gray-400 hover:text-gray-600 mb-5 flex items-center gap-1 transition-colors"
      >
        ← Back
      </button>

      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2">
          <p className="text-lg font-bold text-gray-900">Queue Status</p>
          {wsLive && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 mt-0.5">Enter your IC to check your position</p>
      </div>

      <form onSubmit={handleCheck} className="space-y-4">
        <input
          type="text"
          value={ic}
          onChange={e => setIc(e.target.value)}
          placeholder="IC / Passport Number"
          autoFocus
          className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none transition-all"
          style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb', color: '#111827', caretColor: PINK }}
          onFocus={e => { e.target.style.border = `1.5px solid ${PINK}`; e.target.style.boxShadow = '0 0 0 4px rgba(255,45,143,0.08)'; e.target.style.background = '#fff'; }}
          onBlur={e  => { e.target.style.border = '1.5px solid #e5e7eb'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f9fafb'; }}
        />
        {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        <GradBtn disabled={!ic.trim() || loading} loading={loading} label="Check Status" />
      </form>

      {/* ── Result: found ── */}
      {result?.found && statusInfo && (
        <div className="mt-6 space-y-4">
          {/* Position badge */}
          <div
            className="flex flex-col items-center py-7 rounded-2xl transition-all duration-500"
            style={{
              background: posFlash
                ? 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.12))'
                : 'linear-gradient(135deg, rgba(255,45,143,0.07), rgba(168,85,247,0.07))',
            }}
          >
            <p className="text-xs font-medium text-gray-500 mb-1">Your queue position</p>
            <div
              className="text-6xl font-black transition-all duration-300"
              style={{
                background: posFlash
                  ? 'linear-gradient(135deg, #16a34a, #059669)'
                  : `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              #{result.position}
            </div>
            {posFlash && (
              <span className="text-[10px] text-green-600 font-semibold mt-1 animate-pulse">Updated live</span>
            )}
            <span
              className="mt-3 text-xs px-3 py-1 rounded-full font-semibold"
              style={{ background: statusInfo.bg, color: statusInfo.color }}
            >
              {statusInfo.label}
            </span>
          </div>

          {/* Details */}
          <div className="rounded-2xl p-4 space-y-2.5" style={{ background: '#f9fafb' }}>
            <InfoRow label="Dentist"   value={result.dentist} />
            <InfoRow label="Scheduled" value={formatTime(result.scheduledAt)} />
            <InfoRow label="Treatment" value={result.type.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())} />
            {result.predictedWaitMinutes > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-gray-400 w-24">Est. wait</span>
                <span className="text-sm font-bold" style={{ color: PURPLE }}>{result.predictedWaitMinutes} min</span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(168,85,247,0.1)', color: PURPLE }}
                >AI</span>
              </div>
            )}
          </div>

          {/* Live "you're next" alert */}
          {nearAlert && (
            <div
              className="rounded-2xl p-3 text-center animate-pulse"
              style={{ background: 'linear-gradient(135deg, rgba(255,45,143,0.1), rgba(168,85,247,0.1))', border: `1.5px solid ${PINK}` }}
            >
              <p className="text-sm font-bold" style={{ color: PINK }}>
                You're almost up — please be ready!
              </p>
              <button
                className="mt-1 text-[10px] text-gray-400 hover:text-gray-600"
                onClick={() => setNearAlert(false)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Status-specific banners */}
          {result.status === 'scheduled' && (
            <div className="rounded-2xl p-3 text-center" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
              <p className="text-xs text-amber-700">
                Not checked in yet. Use your{' '}
                <button
                  className="font-semibold underline"
                  onClick={() => navigate(`/portal/confirmation/${result.appointmentId}`)}
                >
                  booking confirmation link
                </button>
                {' '}to check in when you arrive.
              </p>
            </div>
          )}
          {result.status === 'checked-in' && (
            <div className="rounded-2xl p-3 text-center" style={{ background: '#ecfdf5', border: '1px solid #bbf7d0' }}>
              <p className="text-xs text-emerald-700 font-medium">You're checked in — please wait to be called.</p>
            </div>
          )}
          {result.status === 'in-progress' && (
            <div className="rounded-2xl p-3 text-center" style={{ background: '#f5f3ff', border: `1px solid rgba(168,85,247,0.3)` }}>
              <p className="text-xs font-medium" style={{ color: PURPLE }}>You are currently with the dentist.</p>
            </div>
          )}

          <button
            onClick={handleCheck}
            className="w-full py-2.5 text-xs font-medium rounded-2xl border transition-colors hover:bg-gray-50"
            style={{ color: '#9ca3af', borderColor: '#e5e7eb' }}
          >
            Refresh
          </button>
        </div>
      )}

      {/* ── Result: not found ── */}
      {result && !result.found && (
        <div className="mt-6 rounded-2xl p-5 text-center" style={{ background: '#f9fafb' }}>
          <p className="text-sm text-gray-500">No active appointment found for today.</p>
          <button
            onClick={() => navigate('/portal')}
            className="mt-3 text-sm font-semibold"
            style={{ color: PINK }}
          >
            Book an appointment →
          </button>
        </div>
      )}
    </PortalShell>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-24">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}
