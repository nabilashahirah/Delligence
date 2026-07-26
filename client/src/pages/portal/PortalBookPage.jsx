import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getSlots, bookAppointment } from '../../api/portal.api';
import { PortalShell, GradBtn } from './PortalLandingPage';

const PINK   = '#FF2D8F';
const PURPLE = '#A855F7';

const DENTISTS = ['Dr. Amir', 'Dr. Sarah', 'Dr. Wong', 'Dr. Priya'];
const TYPES = [
  { value: 'checkup',      label: 'Check-up' },
  { value: 'cleaning',     label: 'Cleaning' },
  { value: 'filling',      label: 'Filling' },
  { value: 'extraction',   label: 'Extraction' },
  { value: 'root-canal',   label: 'Root Canal' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'other',        label: 'Other' },
];

const ALL_SLOTS_MIN = (() => {
  const s = [];
  for (let m = 9 * 60; m < 17 * 60; m += 15) s.push(m);
  return s;
})();

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function fmtTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true });
}

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

/* ── Mini Calendar ───────────────────────────────────── */
function MiniCalendar({ selected, onSelect, minDate }) {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

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
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth}
          className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-gray-700">{monthStr}</span>
        <button type="button" onClick={nextMonth}
          className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-300 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const dateStr    = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isPast     = minDate && dateStr < minDate;
          const isToday    = dateStr === todayStr();
          const isSelected = dateStr === selected;
          const isSunday   = (i % 7) === 6;

          return (
            <button
              key={day}
              type="button"
              disabled={isPast || isSunday}
              onClick={() => onSelect(dateStr)}
              className="relative h-8 w-full rounded-xl text-xs font-medium transition-all"
              style={{
                background: isSelected
                  ? `linear-gradient(135deg,${PINK},${PURPLE})`
                  : isToday
                    ? 'rgba(255,45,143,0.07)'
                    : 'transparent',
                color: isSelected
                  ? '#fff'
                  : isPast || isSunday
                    ? '#d1d5db'
                    : isToday
                      ? PINK
                      : '#374151',
                cursor: isPast || isSunday ? 'not-allowed' : 'pointer',
                outline: isToday && !isSelected ? `2px solid rgba(255,45,143,0.3)` : 'none',
                outlineOffset: '-2px',
                boxShadow: isSelected ? `0 4px 12px rgba(255,45,143,0.3)` : 'none',
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Slot Grid ───────────────────────────────────────── */
function SlotGrid({ date, dentist, selected, onSelect }) {
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

  if (!date) return (
    <p className="text-xs text-gray-400 text-center py-4">Select a date above to see available slots.</p>
  );
  if (loading) return (
    <div className="flex items-center justify-center py-6 gap-2">
      <span className="h-4 w-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${PINK} transparent ${PINK} ${PINK}` }} />
      <span className="text-xs text-gray-400">Loading slots...</span>
    </div>
  );

  const byHour = {};
  ALL_SLOTS_MIN.forEach(m => {
    const h = Math.floor(m / 60);
    if (!byHour[h]) byHour[h] = [];
    byHour[h].push(m);
  });

  return (
    <div className="space-y-2">
      {Object.entries(byHour).map(([hour, mins]) => {
        const h = Number(hour);
        const label = `${h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`;
        return (
          <div key={hour} className="flex items-start gap-2">
            <span className="text-[10px] text-gray-400 w-10 flex-shrink-0 pt-1.5 text-right">{label}</span>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {mins.map(m => {
                const iso    = minToIso(date, m);
                const isoKey = iso.slice(0, 16);
                const isAvail = available.has(isoKey);
                const isSel   = selected === iso;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={!isAvail}
                    onClick={() => onSelect(iso)}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all"
                    style={{
                      background: isSel
                        ? `linear-gradient(135deg,${PINK},${PURPLE})`
                        : isAvail
                          ? 'rgba(16,185,129,0.08)'
                          : '#f3f4f6',
                      color: isSel
                        ? '#fff'
                        : isAvail
                          ? '#059669'
                          : '#d1d5db',
                      border: isSel
                        ? 'none'
                        : isAvail
                          ? '1px solid rgba(16,185,129,0.3)'
                          : '1px solid transparent',
                      cursor: isAvail ? 'pointer' : 'not-allowed',
                      textDecoration: !isAvail ? 'line-through' : 'none',
                      boxShadow: isSel ? `0 4px 12px rgba(255,45,143,0.3)` : 'none',
                    }}
                  >
                    {fmtMin(m)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-4 pt-2">
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200 inline-block" /> Available
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <span className="w-3 h-3 rounded bg-gray-100 inline-block" /> Taken
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <span className="w-3 h-3 rounded inline-block" style={{ background: `linear-gradient(135deg,${PINK},${PURPLE})` }} /> Selected
        </span>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────── */
export default function PortalBookPage() {
  const { state } = useLocation();
  const navigate  = useNavigate();

  // Allowed entry states:
  //   - state.ic present         → existing/lookup flow
  //   - state.newCustomer=true   → register-first flow (IC collected in-form)
  // Any other entry redirects to portal.
  useEffect(() => {
    if (!state?.ic && !state?.newCustomer) navigate('/portal', { replace: true });
  }, [state, navigate]);

  const isNew = !state?.found;

  const [form, setForm] = useState({
    dentist:     DENTISTS[0],
    date:        '',
    slot:        '',
    type:        'checkup',
    notes:       '',
    // Registration-only fields
    icNumber:    state?.ic ?? '',
    firstName:   state?.firstName ?? '',
    lastName:    state?.lastName  ?? '',
    dob:         '',
    gender:      'male',
    phone:       '',
    email:       '',
    allergies:   '',
    conditions:  '',
    medications: '',
  });

  const [submitting, setSub] = useState(false);
  const [error, setError]    = useState('');

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }));
  }
  function selectDate(dateStr) {
    setForm(f => ({ ...f, date: dateStr, slot: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.date) { setError('Please select a date.'); return; }
    if (!form.slot) { setError('Please select a time slot.'); return; }
    setError('');
    setSub(true);
    const payload = {
      icNumber:    state?.ic || form.icNumber,
      dentist:     form.dentist,
      scheduledAt: form.slot,
      duration:    30,
      type:        form.type,
      notes:       form.notes || null,
    };
    if (isNew) {
      payload.patientInfo = {
        firstName:   form.firstName,
        lastName:    form.lastName,
        dateOfBirth: form.dob,
        gender:      form.gender,
        phone:       form.phone,
        email:       form.email || null,
        allergies:   form.allergies  ? form.allergies.split(',').map(s => s.trim()).filter(Boolean)  : [],
        conditions:  form.conditions ? form.conditions.split(',').map(s => s.trim()).filter(Boolean) : [],
        medications: form.medications? form.medications.split(',').map(s => s.trim()).filter(Boolean): [],
      };
    }
    try {
      const res = await bookAppointment(payload);
      navigate(`/portal/confirmation/${res.data.data.appointmentId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setSub(false);
    }
  }

  if (!state?.ic && !state?.newCustomer) return null;

  return (
    <PortalShell maxWidth={520}>
      <button
        onClick={() => navigate('/portal')}
        className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1 transition-colors"
      >
        ← Back
      </button>
      <p className="text-lg font-bold text-gray-900">Book an Appointment</p>
      <p className="text-sm text-gray-400 mt-0.5 mb-5">
        {isNew
          ? (state?.newCustomer
              ? 'Welcome! Fill in your details to register and book.'
              : 'New here — please complete your details.')
          : `Welcome back, ${state.firstName}!`}
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* New patient section */}
        {isNew && (
          <div className="space-y-3 rounded-2xl p-4" style={{ background: 'rgba(255,45,143,0.04)', border: `1px solid rgba(255,45,143,0.12)` }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: PINK }}>Your Details</p>
            {state?.newCustomer && (
              <Field label="IC / Passport Number" required>
                <PortalInput required value={form.icNumber} onChange={e => set('icNumber', e.target.value)} placeholder="e.g. 860312145678" />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name" required>
                <PortalInput required value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Ahmad" />
              </Field>
              <Field label="Last Name" required>
                <PortalInput required value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="bin Razak" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date of Birth" required>
                <PortalInput required type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
              </Field>
              <Field label="Gender" required>
                <PortalSelect value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </PortalSelect>
              </Field>
            </div>
            <Field label="Phone Number" required>
              <PortalInput required type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+60 12-345 6789" />
            </Field>
            <Field label="Email (optional)">
              <PortalInput type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" />
            </Field>
            <Field label="Allergies (optional, comma-separated)">
              <PortalInput value={form.allergies} onChange={e => set('allergies', e.target.value)} placeholder="e.g. Penicillin, Latex" />
            </Field>
            <Field label="Medical Conditions (optional)">
              <PortalInput value={form.conditions} onChange={e => set('conditions', e.target.value)} placeholder="e.g. Diabetes" />
            </Field>
            <Field label="Current Medications (optional)">
              <PortalInput value={form.medications} onChange={e => set('medications', e.target.value)} placeholder="e.g. Metformin 500mg" />
            </Field>
          </div>
        )}

        {/* Dentist picker */}
        <Field label="Choose Dentist" required>
          <div className="grid grid-cols-2 gap-2">
            {DENTISTS.map(d => (
              <button
                key={d} type="button" onClick={() => set('dentist', d)}
                className="px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left"
                style={{
                  background: form.dentist === d ? `linear-gradient(135deg,${PINK},${PURPLE})` : '#fff',
                  color:      form.dentist === d ? '#fff' : '#374151',
                  border:     form.dentist === d ? 'none' : '1.5px solid #e5e7eb',
                  boxShadow:  form.dentist === d ? `0 4px 14px rgba(255,45,143,0.25)` : 'none',
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </Field>

        {/* Calendar */}
        <div className="rounded-2xl p-4" style={{ border: '1px solid #f3f4f6', background: '#fafafa' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#9ca3af' }}>
            Select Date
            {form.date && (
              <span className="ml-2 font-semibold normal-case tracking-normal" style={{ color: PINK }}>
                — {new Date(form.date + 'T00:00:00').toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            )}
          </p>
          <MiniCalendar selected={form.date} onSelect={selectDate} minDate={todayStr()} />
        </div>

        {/* Slot grid */}
        <div className="rounded-2xl p-4" style={{ border: '1px solid #f3f4f6', background: '#fafafa' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#9ca3af' }}>
            Select Time
            {form.slot && (
              <span className="ml-2 font-semibold normal-case tracking-normal" style={{ color: PINK }}>
                — {fmtTime(form.slot)}
              </span>
            )}
          </p>
          <SlotGrid
            date={form.date}
            dentist={form.dentist}
            selected={form.slot}
            onSelect={s => set('slot', s)}
          />
        </div>

        {/* Appointment type */}
        <Field label="Appointment Type" required>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map(t => (
              <button
                key={t.value} type="button" onClick={() => set('type', t.value)}
                className="px-2 py-2.5 rounded-xl text-xs font-medium border transition-all"
                style={{
                  background: form.type === t.value ? `linear-gradient(135deg,${PINK},${PURPLE})` : '#fff',
                  color:      form.type === t.value ? '#fff' : '#6b7280',
                  border:     form.type === t.value ? 'none' : '1.5px solid #e5e7eb',
                  boxShadow:  form.type === t.value ? `0 4px 12px rgba(255,45,143,0.25)` : 'none',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        {/* Notes */}
        <Field label="Notes (optional)">
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none transition-all"
            style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb', color: '#111827', caretColor: PINK }}
            onFocus={e => { e.target.style.border = `1.5px solid ${PINK}`; e.target.style.boxShadow = '0 0 0 4px rgba(255,45,143,0.08)'; e.target.style.background = '#fff'; }}
            onBlur={e  => { e.target.style.border = '1.5px solid #e5e7eb'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f9fafb'; }}
            rows={2}
            placeholder="Any concerns or requests..."
          />
        </Field>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

        <GradBtn
          disabled={submitting || !form.slot}
          loading={submitting}
          label="Confirm Booking"
        />
      </form>
    </PortalShell>
  );
}

function PortalInput({ ...props }) {
  const PINK = '#FF2D8F';
  return (
    <input
      {...props}
      className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all"
      style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb', color: '#111827', caretColor: PINK }}
      onFocus={e => { e.target.style.border = `1.5px solid ${PINK}`; e.target.style.boxShadow = '0 0 0 4px rgba(255,45,143,0.08)'; e.target.style.background = '#fff'; }}
      onBlur={e  => { e.target.style.border = '1.5px solid #e5e7eb'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f9fafb'; }}
    />
  );
}

function PortalSelect({ children, ...props }) {
  const PINK = '#FF2D8F';
  return (
    <select
      {...props}
      className="w-full px-4 py-3 rounded-2xl text-sm outline-none appearance-none transition-all"
      style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb', color: '#111827' }}
      onFocus={e => { e.target.style.border = `1.5px solid ${PINK}`; e.target.style.boxShadow = '0 0 0 4px rgba(255,45,143,0.08)'; e.target.style.background = '#fff'; }}
      onBlur={e  => { e.target.style.border = '1.5px solid #e5e7eb'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f9fafb'; }}
    >
      {children}
    </select>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#9ca3af' }}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
