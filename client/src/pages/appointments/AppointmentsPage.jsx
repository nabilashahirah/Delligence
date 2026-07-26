import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, XCircle, UserX, ClipboardPlus, Search, X, CalendarRange, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAppointments, updateStatus, rescheduleAppointment, updateAppointment, checkConflict } from '../../api/appointments.api';
import { getSlots } from '../../api/portal.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

const today = new Date().toISOString().split('T')[0];

const DENTISTS = ['Dr. Amir', 'Dr. Sarah', 'Dr. Wong', 'Dr. Priya'];

const ALL_SLOTS_MIN = (() => {
  const s = [];
  for (let m = 9 * 60; m < 17 * 60; m += 15) s.push(m);
  return s;
})();

// Statuses that dim the row visually
const INACTIVE = ['cancelled', 'no-show', 'completed'];

// Which statuses can be cancelled / marked no-show
const CAN_CANCEL  = ['scheduled', 'checked-in'];
const CAN_NOSHOW  = ['scheduled'];

const NEXT = {
  scheduled:    { label: 'Check In', status: 'checked-in' },
  'checked-in': { label: 'Start',    status: 'in-progress' },
  'in-progress':{ label: 'Complete', status: 'completed' },
};

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [date, setDate]     = useState(today);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [modal, setModal]           = useState(null);
  const [reason, setReason]         = useState('');
  const [rescheduleAppt, setRescheduleAppt] = useState(null);
  const [editAppt, setEditAppt]             = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', date, search],
    queryFn: () => getAppointments({ date: search ? undefined : date, search: search || undefined, limit: 50 }),
  });

  const { mutate: advance, isPending } = useMutation({
    mutationFn: ({ id, status }) => updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Status updated');
      setModal(null);
      setReason('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const appointments = data?.data?.data?.appointments ?? [];

  const openModal = (type, appt) => { setModal({ type, appt }); setReason(''); };
  const closeModal = () => { setModal(null); setReason(''); };

  const confirmAction = () => {
    const status = modal.type === 'cancel' ? 'cancelled' : 'no-show';
    advance({ id: modal.appt._id, status });
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-500">{appointments.length} appointment(s) on selected date</p>
        </div>
        <Button onClick={() => navigate('/appointments/new')}>
          <CalendarPlus size={16} /> Book Appointment
        </Button>
      </div>

      {/* Search + date filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <form
          onSubmit={e => { e.preventDefault(); setSearch(searchInput.trim()); }}
          className="flex gap-2"
        >
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); if (!e.target.value) setSearch(''); }}
              placeholder="Search name or IC..."
              className="pl-8 pr-8 py-2 rounded-lg border border-gray-300 text-sm w-52 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchInput && (
              <button type="button" onClick={() => { setSearchInput(''); setSearch(''); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <button type="submit"
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
            Search
          </button>
        </form>

        {!search && (
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        )}

        {search && (
          <p className="text-sm text-gray-500">
            Showing all appointments for <span className="font-medium text-gray-800">"{search}"</span>
          </p>
        )}
      </div>

      <Card>
        {isLoading ? (
          <p className="p-5 text-sm text-gray-400">Loading...</p>
        ) : appointments.length === 0 ? (
          <p className="p-5 text-sm text-gray-400">No appointments on this date.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {['Time', 'Patient', 'Type', 'Dentist', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {appointments.map((appt) => {
                const dimmed = INACTIVE.includes(appt.status);
                return (
                  <tr key={appt._id}
                    className={`transition-colors ${dimmed ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3 font-medium text-gray-700">
                      {new Date(appt.scheduledAt).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => appt.patient?._id && navigate(`/patients/${appt.patient._id}`)}
                        className="text-gray-900 font-medium hover:text-blue-600 hover:underline text-left transition-colors"
                      >
                        {appt.patient?.firstName} {appt.patient?.lastName}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{appt.type}</td>
                    <td className="px-4 py-3 text-gray-500">{appt.dentist}</td>
                    <td className="px-4 py-3"><Badge status={appt.status} label={appt.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Record treatment */}
                        {['in-progress', 'completed'].includes(appt.status) && (
                          <button
                            onClick={() => navigate(
                              `/treatments/new?appointmentId=${appt._id}` +
                              `&patientId=${appt.patient?._id}` +
                              `&dentist=${encodeURIComponent(appt.dentist)}` +
                              `&patientName=${encodeURIComponent((appt.patient?.firstName ?? '') + ' ' + (appt.patient?.lastName ?? ''))}`
                            )}
                            title="Record treatment"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <ClipboardPlus size={15} />
                          </button>
                        )}
                        {/* Advance status */}
                        {NEXT[appt.status] && (
                          <Button variant="secondary" size="sm"
                            onClick={() => advance({ id: appt._id, status: NEXT[appt.status].status })}>
                            {NEXT[appt.status].label}
                          </Button>
                        )}
                        {/* No-show */}
                        {CAN_NOSHOW.includes(appt.status) && (
                          <button
                            onClick={() => openModal('noshow', appt)}
                            title="Mark as no-show"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                          >
                            <UserX size={15} />
                          </button>
                        )}
                        {/* Edit dentist / type */}
                        {!INACTIVE.includes(appt.status) && (
                          <button
                            onClick={() => setEditAppt(appt)}
                            title="Edit appointment"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {/* Reschedule */}
                        {['scheduled', 'checked-in'].includes(appt.status) && (
                          <button
                            onClick={() => setRescheduleAppt(appt)}
                            title="Reschedule appointment"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                          >
                            <CalendarRange size={15} />
                          </button>
                        )}
                        {/* Cancel */}
                        {CAN_CANCEL.includes(appt.status) && (
                          <button
                            onClick={() => openModal('cancel', appt)}
                            title="Cancel appointment"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <XCircle size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Edit appointment modal */}
      {editAppt && (
        <EditAppointmentModal
          appt={editAppt}
          onClose={() => setEditAppt(null)}
          onSuccess={() => {
            setEditAppt(null);
            qc.invalidateQueries({ queryKey: ['appointments'] });
            toast.success('Appointment updated');
          }}
        />
      )}

      {/* Reschedule modal */}
      {rescheduleAppt && (
        <RescheduleModal
          appt={rescheduleAppt}
          onClose={() => setRescheduleAppt(null)}
          onSuccess={() => {
            setRescheduleAppt(null);
            qc.invalidateQueries({ queryKey: ['appointments'] });
            toast.success('Appointment rescheduled');
          }}
        />
      )}

      {/* Confirm modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full
                ${modal.type === 'cancel' ? 'bg-red-100' : 'bg-orange-100'}`}>
                {modal.type === 'cancel'
                  ? <XCircle size={18} className="text-red-600" />
                  : <UserX   size={18} className="text-orange-600" />}
              </div>
              <h2 className="text-base font-semibold text-gray-900">
                {modal.type === 'cancel' ? 'Cancel appointment?' : 'Mark as no-show?'}
              </h2>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-gray-700">
                {modal.appt.patient?.firstName} {modal.appt.patient?.lastName}
              </span>
              {' — '}
              {new Date(modal.appt.scheduledAt).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
              {', '}{modal.appt.type}
            </p>

            {modal.type === 'cancel' && (
              <div className="mb-4 flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Reason <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Patient requested reschedule"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none
                    focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={closeModal}>Back</Button>
              <Button
                variant="danger"
                size="sm"
                loading={isPending}
                onClick={confirmAction}
              >
                {modal.type === 'cancel' ? 'Cancel Appointment' : 'Mark No-Show'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Edit Appointment Modal ────────────────────────────────────────────────────
const APPT_TYPES = [
  { value: 'checkup',      label: 'Check-up' },
  { value: 'cleaning',     label: 'Cleaning' },
  { value: 'filling',      label: 'Filling' },
  { value: 'extraction',   label: 'Extraction' },
  { value: 'root-canal',   label: 'Root Canal' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'other',        label: 'Other' },
];

function EditAppointmentModal({ appt, onClose, onSuccess }) {
  const [dentist, setDentist] = useState(appt.dentist ?? DENTISTS[0]);
  const [type,    setType]    = useState(appt.type   ?? 'checkup');
  const [error,   setError]   = useState('');

  const dentistChanged = dentist !== appt.dentist;

  // Real-time conflict check — only runs when dentist actually changes
  const { data: conflictData, isFetching: checkingConflict } = useQuery({
    queryKey: ['conflict-edit', dentist, appt.scheduledAt, appt.duration],
    queryFn: () => checkConflict(dentist, appt.scheduledAt, appt.duration),
    enabled: dentistChanged,
    select: res => res.data.data,
    staleTime: 10_000,
  });

  const hasConflict = dentistChanged && conflictData?.hasConflict;

  const { mutate, isPending } = useMutation({
    mutationFn: () => updateAppointment(appt._id, { dentist, type }),
    onSuccess,
    onError: (err) => setError(err.response?.data?.message || 'Update failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
              <Pencil size={14} className="text-gray-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Edit Appointment</h2>
              <p className="text-xs text-gray-500">{appt.patient?.firstName} {appt.patient?.lastName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Dentist */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">Dentist</p>
            <div className="grid grid-cols-2 gap-1.5">
              {DENTISTS.map(d => (
                <button key={d} type="button" onClick={() => setDentist(d)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    dentist === d ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-700 border-gray-200 hover:border-blue-300'
                  }`}>
                  {d}
                </button>
              ))}
            </div>

            {/* Conflict warning */}
            {dentistChanged && checkingConflict && (
              <p className="mt-2 text-xs text-gray-400">Checking availability...</p>
            )}
            {hasConflict && !checkingConflict && (
              <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                <p className="text-xs font-semibold text-red-700">Time slot conflict</p>
                <p className="text-xs text-red-500 mt-0.5">
                  {dentist} already has an appointment at{' '}
                  {new Date(conflictData.conflictsWith.scheduledAt).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                  {' '}–{' '}
                  {new Date(conflictData.conflictsWith.endsAt).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}.
                  {' '}Please choose a different dentist.
                </p>
              </div>
            )}
            {dentistChanged && !checkingConflict && !hasConflict && (
              <p className="mt-2 text-xs text-green-600">✓ {dentist} is available at this time</p>
            )}
          </div>

          {/* Type */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">Appointment Type</p>
            <div className="grid grid-cols-3 gap-1.5">
              {APPT_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setType(t.value)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    type === t.value ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-2 justify-end px-5 pb-5">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            loading={isPending || checkingConflict}
            disabled={hasConflict}
            onClick={() => { setError(''); mutate(); }}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().split('T')[0]; }

function minToIso(dateStr, minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${dateStr}T${h}:${m}:00`;
}

function fmtMin(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${String(m).padStart(2, '0')}${ampm}`;
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ selected, onSelect, minDate }) {
  const now = new Date();
  const [viewYear, setViewYear]   = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7;
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthStr = new Date(viewYear, viewMonth).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={prevMonth} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft size={15} />
        </button>
        <span className="text-xs font-semibold text-gray-700">{monthStr}</span>
        <button type="button" onClick={nextMonth} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronRight size={15} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const dateStr    = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isPast     = minDate && dateStr < minDate;
          const isSunday   = (i % 7) === 6;
          const isSelected = dateStr === selected;
          return (
            <button key={day} type="button" disabled={isPast || isSunday} onClick={() => onSelect(dateStr)}
              className={`h-7 w-full rounded-lg text-[11px] font-medium transition-colors
                ${isPast || isSunday ? 'text-gray-300 cursor-not-allowed'
                  : isSelected ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-blue-50'}`}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Slot Grid ─────────────────────────────────────────────────────────────────
function RescheduleSlotGrid({ date, dentist, selected, onSelect }) {
  const [available, setAvailable] = useState(new Set());
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!date || !dentist) return;
    setLoading(true);
    setAvailable(new Set());
    getSlots(dentist, date)
      .then(res => {
        const slots = res.data.data.slots ?? [];
        setAvailable(new Set(slots.map(s => s.slice(0, 16))));
      })
      .catch(() => setAvailable(new Set()))
      .finally(() => setLoading(false));
  }, [date, dentist]);

  if (!date) return <p className="text-xs text-gray-400 py-3 text-center">Select a date to see slots.</p>;
  if (loading) return <p className="text-xs text-gray-400 py-3 text-center">Loading slots...</p>;

  const byHour = {};
  ALL_SLOTS_MIN.forEach(m => {
    const h = Math.floor(m / 60);
    if (!byHour[h]) byHour[h] = [];
    byHour[h].push(m);
  });

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
      {Object.entries(byHour).map(([hour, mins]) => {
        const h = Number(hour);
        const label = `${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`;
        return (
          <div key={hour} className="flex items-start gap-2">
            <span className="text-[10px] text-gray-400 w-8 flex-shrink-0 pt-1.5 text-right">{label}</span>
            <div className="flex flex-wrap gap-1">
              {mins.map(m => {
                const iso    = minToIso(date, m);
                const isSel  = selected === iso;
                const isAvail = available.has(iso.slice(0, 16));
                return (
                  <button key={m} type="button" disabled={!isAvail} onClick={() => onSelect(iso)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors
                      ${!isAvail ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                        : isSel  ? 'bg-blue-600 text-white ring-1 ring-blue-300'
                        : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'}`}>
                    {fmtMin(m)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="flex gap-3 pt-1">
        <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2.5 h-2.5 rounded bg-green-100 border border-green-300 inline-block" />Available</span>
        <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2.5 h-2.5 rounded bg-gray-100 inline-block" />Taken</span>
      </div>
    </div>
  );
}

// ── Reschedule Modal ──────────────────────────────────────────────────────────
function RescheduleModal({ appt, onClose, onSuccess }) {
  const initDate = appt.scheduledAt
    ? new Date(appt.scheduledAt).toISOString().split('T')[0]
    : todayStr();

  const [dentist,  setDentist]  = useState(appt.dentist ?? DENTISTS[0]);
  const [date,     setDate]     = useState(initDate);
  const [slot,     setSlot]     = useState('');
  const [duration, setDuration] = useState(appt.duration ?? 30);
  const [error,    setError]    = useState('');

  function selectDate(d) { setDate(d); setSlot(''); }

  const { mutate, isPending } = useMutation({
    mutationFn: () => rescheduleAppointment(appt._id, {
      dentist,
      scheduledAt: slot,
      duration: Number(duration),
    }),
    onSuccess,
    onError: (err) => setError(err.response?.data?.message || 'Reschedule failed'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!slot) { setError('Please select a time slot.'); return; }
    setError('');
    mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">

        {/* Fixed header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 flex-shrink-0">
              <CalendarRange size={16} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Reschedule Appointment</h2>
              <p className="text-xs text-gray-500">{appt.patient?.firstName} {appt.patient?.lastName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <form id="reschedule-form" onSubmit={handleSubmit} className="space-y-4">

            {/* Dentist */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Dentist</p>
              <div className="grid grid-cols-2 gap-1.5">
                {DENTISTS.map(d => (
                  <button key={d} type="button" onClick={() => { setDentist(d); setSlot(''); }}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      dentist === d ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-700 border-gray-200 hover:border-blue-300'
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Duration (min)</p>
              <input type="number" min={5} max={180} value={duration}
                onChange={e => setDuration(e.target.value)}
                className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Calendar */}
            <div className="border border-gray-100 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-600 mb-2">
                Date{date && <span className="ml-1 text-blue-600 font-semibold">
                  — {new Date(date + 'T00:00:00').toLocaleDateString('en-MY', { weekday:'short', day:'numeric', month:'short' })}
                </span>}
              </p>
              <MiniCalendar selected={date} onSelect={selectDate} minDate={todayStr()} />
            </div>

            {/* Slots */}
            <div className="border border-gray-100 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-600 mb-2">
                Time{slot && <span className="ml-1 text-blue-600 font-semibold">
                  — {new Date(slot).toLocaleTimeString('en-MY', { hour:'2-digit', minute:'2-digit', hour12:true })}
                </span>}
              </p>
              <RescheduleSlotGrid date={date} dentist={dentist} selected={slot} onSelect={setSlot} />
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          </form>
        </div>

        {/* Fixed footer */}
        <div className="flex gap-2 justify-end px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" loading={isPending} type="submit" form="reschedule-form">
            Confirm Reschedule
          </Button>
        </div>
      </div>
    </div>
  );
}
