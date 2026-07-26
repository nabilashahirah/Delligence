import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, CalendarPlus, XCircle, UserX, ClipboardPlus } from 'lucide-react';
import { getAppointments, updateStatus } from '../../api/appointments.api';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

const DENTISTS   = ['Dr. Amir', 'Dr. Sarah', 'Dr. Wong', 'Dr. Priya'];
const HOUR_START = 9;
const HOUR_END   = 17;
const SLOT_MIN   = 15;
const ROW_H      = 32; // px per 15-min slot
const TOTAL_H    = ((HOUR_END - HOUR_START) * 60 / SLOT_MIN) * ROW_H;

const STATUS_STYLE = {
  scheduled:    'bg-blue-100  border-l-4 border-blue-500  text-blue-900',
  'checked-in': 'bg-green-100 border-l-4 border-green-500 text-green-900',
  'in-progress':'bg-amber-100 border-l-4 border-amber-500 text-amber-900',
  completed:    'bg-gray-100  border-l-4 border-gray-400  text-gray-500 opacity-70',
  cancelled:    'bg-red-50    border-l-4 border-red-400   text-red-500  opacity-60',
  'no-show':    'bg-orange-50 border-l-4 border-orange-400 text-orange-500 opacity-60',
};

const STATUS_DOT = {
  scheduled:    'bg-blue-500',
  'checked-in': 'bg-green-500',
  'in-progress':'bg-amber-500 animate-pulse',
  completed:    'bg-gray-400',
  cancelled:    'bg-red-400',
  'no-show':    'bg-orange-400',
};

const NEXT = {
  scheduled:    { label: 'Check In', status: 'checked-in' },
  'checked-in': { label: 'Start',    status: 'in-progress' },
  'in-progress':{ label: 'Complete', status: 'completed' },
};

const SLOTS = (() => {
  const s = [];
  for (let m = HOUR_START * 60; m < HOUR_END * 60; m += SLOT_MIN) s.push(m);
  return s;
})();

function slotTop(slotMin) {
  return ((slotMin - HOUR_START * 60) / SLOT_MIN) * ROW_H;
}

function apptTop(appt) {
  const d = new Date(appt.scheduledAt);
  return slotTop(d.getHours() * 60 + d.getMinutes());
}

function apptHeight(appt) {
  return (appt.duration / SLOT_MIN) * ROW_H;
}

function fmtMin(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${String(min).padStart(2, '0')}`;
}

function toDatetimeLocal(dateStr, minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${dateStr}T${h}:${m}`;
}

function isoToday() { return new Date().toISOString().split('T')[0]; }

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function fmtHeader(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-MY', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function isSlotOccupied(appts, slotMin) {
  return appts.some(a => {
    const start = new Date(a.scheduledAt);
    const startMin = start.getHours() * 60 + start.getMinutes();
    return slotMin >= startMin && slotMin < startMin + a.duration;
  });
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const scrollRef = useRef(null);

  const [date, setDate]           = useState(isoToday());
  const [tooltip, setTooltip]     = useState(null);
  const [confirmModal, setConfirm] = useState(null);
  const [reason, setReason]       = useState('');

  // Auto-scroll to current time on load
  useEffect(() => {
    if (scrollRef.current && date === isoToday()) {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const top = slotTop(currentMin) - 80;
      scrollRef.current.scrollTop = Math.max(0, top);
    }
  }, [date]);

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', date],
    queryFn: () => getAppointments({ date, limit: 100 }),
    select: res => res.data.data.appointments ?? [],
    refetchInterval: 60000, // fallback poll — WebSocket handles instant updates
  });

  const { mutate: advance, isPending } = useMutation({
    mutationFn: ({ id, status }) => updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments', date] });
      toast.success('Status updated');
      setTooltip(null);
      setConfirm(null);
    },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  });

  const appointments = data ?? [];

  // Group appointments by dentist
  const byDentist = Object.fromEntries(DENTISTS.map(d => [d, []]));
  appointments.forEach(a => { if (byDentist[a.dentist]) byDentist[a.dentist].push(a); });

  function clickEmpty(dentist, slotMin) {
    navigate(`/appointments/new?dentist=${encodeURIComponent(dentist)}&scheduledAt=${toDatetimeLocal(date, slotMin)}`);
  }

  // Current time indicator position
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNowLine = date === isoToday() && nowMin >= HOUR_START * 60 && nowMin < HOUR_END * 60;
  const nowTop = slotTop(nowMin);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setDate(d => addDays(d, -1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div>
            <p className="text-base font-semibold text-gray-900">{fmtHeader(date)}</p>
            {date === isoToday() && <p className="text-xs text-blue-500 font-medium">Today</p>}
          </div>
          <button onClick={() => setDate(d => addDays(d, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronRight size={18} />
          </button>
          {date !== isoToday() && (
            <button onClick={() => setDate(isoToday())}
              className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              Today
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 text-xs text-gray-400">
            {Object.entries(STATUS_DOT).slice(0, 4).map(([s, cls]) => (
              <span key={s} className="flex items-center gap-1 capitalize">
                <span className={`w-2 h-2 rounded-full ${cls}`} />{s}
              </span>
            ))}
          </div>
          <Button size="sm" onClick={() => navigate('/appointments/new')}>
            <CalendarPlus size={14} /> Book
          </Button>
        </div>
      </div>

      {/* ── Dentist column headers ── */}
      <div className="flex flex-shrink-0 border-b border-gray-200 bg-white">
        <div className="w-14 flex-shrink-0" />
        {DENTISTS.map(d => (
          <div key={d} className="flex-1 border-l border-gray-100 px-2 py-2.5 text-center">
            <div className="flex flex-col items-center gap-1">
              <div className="h-7 w-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">
                {d.split(' ')[1]?.[0]}
              </div>
              <span className="text-xs font-semibold text-gray-700">{d}</span>
              <span className="text-[10px] text-gray-400">
                {byDentist[d].filter(a => !['cancelled','no-show'].includes(a.status)).length} appt
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Scrollable time grid ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400">Loading...</div>
        ) : (
          <div className="flex" style={{ height: TOTAL_H }}>

            {/* Time labels */}
            <div className="w-14 flex-shrink-0 relative">
              {SLOTS.map((slot, i) => (
                slot % 30 === 0 ? (
                  <div key={slot} className="absolute right-2 text-[10px] -translate-y-1/2 select-none"
                    style={{ top: i * ROW_H }}
                  >
                    <span className={slot % 60 === 0 ? 'font-semibold text-gray-500' : 'text-gray-300'}>
                      {fmtMin(slot)}
                    </span>
                  </div>
                ) : null
              ))}
            </div>

            {/* Dentist columns */}
            {DENTISTS.map(dentist => {
              const appts = byDentist[dentist];
              return (
                <div key={dentist} className="flex-1 relative border-l border-gray-100 min-w-0">

                  {/* Horizontal grid lines */}
                  {SLOTS.map((slot, i) => (
                    <div key={slot}
                      className={`absolute w-full pointer-events-none ${
                        slot % 60 === 0 ? 'border-t border-gray-200' : 'border-t border-gray-100'
                      }`}
                      style={{ top: i * ROW_H }}
                    />
                  ))}

                  {/* Current time line */}
                  {showNowLine && (
                    <div className="absolute w-full z-20 pointer-events-none flex items-center"
                      style={{ top: nowTop }}>
                      <div className="w-2 h-2 rounded-full bg-red-400 -ml-1 flex-shrink-0" />
                      <div className="flex-1 border-t-2 border-red-400" />
                    </div>
                  )}

                  {/* Empty slot click zones */}
                  {SLOTS.map((slot, i) => {
                    if (isSlotOccupied(appts, slot)) return null;
                    return (
                      <div key={slot}
                        onClick={() => clickEmpty(dentist, slot)}
                        className="absolute w-full cursor-pointer hover:bg-blue-50/60 group transition-colors z-0"
                        style={{ top: i * ROW_H, height: ROW_H }}
                      >
                        <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus size={12} className="text-blue-400" />
                        </div>
                      </div>
                    );
                  })}

                  {/* Appointment blocks */}
                  {appts.map(appt => {
                    const top    = apptTop(appt);
                    const height = apptHeight(appt);
                    const style  = STATUS_STYLE[appt.status] ?? STATUS_STYLE.scheduled;
                    const isSelected = tooltip?.appt._id === appt._id;
                    return (
                      <div key={appt._id}
                        onClick={() => setTooltip(t => t?.appt._id === appt._id ? null : { appt })}
                        className="absolute z-10 px-0.5"
                        style={{ top: top + 1, height: height - 2, left: 2, right: 2 }}
                      >
                        <div className={`h-full rounded-lg overflow-hidden px-2 py-1 cursor-pointer transition-all
                          ${style} ${isSelected ? 'ring-2 ring-offset-1 ring-blue-400' : 'hover:brightness-95'}`}
                        >
                          <p className="text-[11px] font-semibold leading-tight truncate">
                            {appt.patient?.firstName} {appt.patient?.lastName}
                          </p>
                          {height > ROW_H && (
                            <p className="text-[10px] opacity-70 capitalize truncate">
                              {appt.type?.replace('-', ' ')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Appointment action panel ── */}
      {tooltip && (
        <AppointmentPanel
          appt={tooltip.appt}
          isPending={isPending}
          onClose={() => setTooltip(null)}
          onAdvance={(id, status) => advance({ id, status })}
          onCancel={() => { setConfirm({ type: 'cancel', appt: tooltip.appt }); setTooltip(null); }}
          onNoshow={() => { setConfirm({ type: 'noshow', appt: tooltip.appt }); setTooltip(null); }}
          onTreatment={appt => navigate(
            `/treatments/new?appointmentId=${appt._id}` +
            `&patientId=${appt.patient?._id}` +
            `&dentist=${encodeURIComponent(appt.dentist)}` +
            `&patientName=${encodeURIComponent(`${appt.patient?.firstName ?? ''} ${appt.patient?.lastName ?? ''}`)}`
          )}
        />
      )}

      {/* ── Confirm modal ── */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              {confirmModal.type === 'cancel' ? 'Cancel appointment?' : 'Mark as no-show?'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-gray-700">
                {confirmModal.appt.patient?.firstName} {confirmModal.appt.patient?.lastName}
              </span>{' — '}
              {new Date(confirmModal.appt.scheduledAt).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {confirmModal.type === 'cancel' && (
              <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)}
                placeholder="Reason (optional)"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setConfirm(null)}>Back</Button>
              <Button variant="danger" size="sm" loading={isPending}
                onClick={() => advance({
                  id: confirmModal.appt._id,
                  status: confirmModal.type === 'cancel' ? 'cancelled' : 'no-show',
                })}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppointmentPanel({ appt, isPending, onClose, onAdvance, onCancel, onNoshow, onTreatment }) {
  const next      = NEXT[appt.status];
  const dot       = STATUS_DOT[appt.status] ?? 'bg-gray-300';
  const canCancel = ['scheduled', 'checked-in'].includes(appt.status);
  const canNoshow = appt.status === 'scheduled';
  const canTreat  = ['in-progress', 'completed'].includes(appt.status);

  return (
    <div className="flex-shrink-0 border-t border-gray-100 bg-white px-6 py-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {appt.patient?.firstName} {appt.patient?.lastName}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(appt.scheduledAt).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
              {' · '}{appt.dentist}{' · '}{appt.duration} min{' · '}
              <span className="capitalize">{appt.type?.replace('-', ' ')}</span>
              {appt.walkIn && <span className="ml-1.5 text-orange-500 font-medium">Walk-in</span>}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none ml-4">×</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {next && (
          <Button size="sm" variant="primary" loading={isPending}
            onClick={() => onAdvance(appt._id, next.status)}>
            {next.label}
          </Button>
        )}
        {canTreat && (
          <Button size="sm" variant="secondary" onClick={() => onTreatment(appt)}>
            <ClipboardPlus size={13} /> Record Treatment
          </Button>
        )}
        {canNoshow && (
          <button onClick={onNoshow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors">
            <UserX size={13} /> No-Show
          </button>
        )}
        {canCancel && (
          <button onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
            <XCircle size={13} /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}
