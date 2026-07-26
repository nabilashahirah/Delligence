import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lookupPatient, bookAppointment } from '../../api/portal.api';
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
  { value: 'other',        label: 'Other / Not Sure' },
];

const STEPS = { IC: 'ic', DETAILS: 'details', APPOINTMENT: 'appointment', DONE: 'done' };

export default function PortalWalkInPage() {
  const navigate = useNavigate();

  const [step, setStep]       = useState(STEPS.IC);
  const [ic, setIc]           = useState('');
  const [patient, setPatient] = useState(null);
  const [isNew, setIsNew]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const [details, setDetails] = useState({
    firstName: '', lastName: '', dob: '', gender: 'male',
    phone: '', email: '', allergies: '', conditions: '', medications: '',
  });

  const [appt, setAppt] = useState({ dentist: DENTISTS[0], type: 'checkup', notes: '' });
  const [result, setResult] = useState(null);

  async function handleIcSubmit(e) {
    e.preventDefault();
    const trimmed = ic.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      const res = await lookupPatient(trimmed);
      const data = res.data.data;
      if (data.found) {
        setPatient(data);
        setIsNew(false);
        setStep(STEPS.APPOINTMENT);
      } else {
        setIsNew(true);
        setStep(STEPS.DETAILS);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleDetailsNext(e) {
    e.preventDefault();
    if (!details.firstName || !details.lastName || !details.phone || !details.dob) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setStep(STEPS.APPOINTMENT);
  }

  async function handleBook(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const payload = {
      icNumber: ic.trim(),
      dentist:  appt.dentist,
      type:     appt.type,
      duration: 30,
      notes:    appt.notes || null,
      walkIn:   true,
    };
    if (isNew) {
      payload.patientInfo = {
        firstName:   details.firstName,
        lastName:    details.lastName,
        dateOfBirth: details.dob,
        gender:      details.gender,
        phone:       details.phone,
        email:       details.email || null,
        allergies:   details.allergies  ? details.allergies.split(',').map(s => s.trim()).filter(Boolean)  : [],
        conditions:  details.conditions ? details.conditions.split(',').map(s => s.trim()).filter(Boolean) : [],
        medications: details.medications? details.medications.split(',').map(s => s.trim()).filter(Boolean): [],
      };
    }
    try {
      const res = await bookAppointment(payload);
      setResult(res.data.data);
      setStep(STEPS.DONE);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join queue. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function setD(f, v) { setDetails(d => ({ ...d, [f]: v })); }
  function setA(f, v) { setAppt(a => ({ ...a, [f]: v })); }

  /* ── Step order for progress bar ── */
  const stepOrder = [STEPS.IC, isNew ? STEPS.DETAILS : null, STEPS.APPOINTMENT].filter(Boolean);
  const currentIdx = stepOrder.indexOf(step);

  return (
    <PortalShell>
      {/* Progress bar */}
      {step !== STEPS.DONE && (
        <div className="flex items-center gap-1.5 mb-6">
          {stepOrder.map((s, i) => (
            <div
              key={s}
              className="flex-1 h-1.5 rounded-full transition-all"
              style={{
                background: i <= currentIdx
                  ? `linear-gradient(90deg, ${PINK}, ${PURPLE})`
                  : '#e5e7eb',
              }}
            />
          ))}
        </div>
      )}

      {/* ── Step 1: IC ── */}
      {step === STEPS.IC && (
        <form onSubmit={handleIcSubmit} className="space-y-5">
          <div className="text-center mb-2">
            <p className="text-lg font-bold text-gray-900">Walk-In Registration</p>
            <p className="text-sm text-gray-400 mt-0.5">Join the queue without an appointment</p>
          </div>
          <Field label="IC / Passport Number" required>
            <PortalInput
              value={ic}
              onChange={e => setIc(e.target.value)}
              placeholder="e.g. 860312145678"
              autoFocus
            />
          </Field>
          {error && <ErrorBox msg={error} />}
          <GradBtn disabled={!ic.trim() || loading} loading={loading} label="Continue →" />
        </form>
      )}

      {/* ── Step 2: New patient details ── */}
      {step === STEPS.DETAILS && (
        <form onSubmit={handleDetailsNext} className="space-y-4">
          <div
            className="rounded-xl px-3 py-2.5 mb-1"
            style={{ background: 'rgba(255,45,143,0.07)', border: `1px solid rgba(255,45,143,0.15)` }}
          >
            <p className="text-sm font-semibold" style={{ color: PINK }}>Welcome! Please fill in your details.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" required>
              <PortalInput required value={details.firstName} onChange={e => setD('firstName', e.target.value)} placeholder="Ahmad" />
            </Field>
            <Field label="Last Name" required>
              <PortalInput required value={details.lastName} onChange={e => setD('lastName', e.target.value)} placeholder="bin Razak" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of Birth" required>
              <PortalInput required type="date" value={details.dob} onChange={e => setD('dob', e.target.value)} />
            </Field>
            <Field label="Gender" required>
              <PortalSelect value={details.gender} onChange={e => setD('gender', e.target.value)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </PortalSelect>
            </Field>
          </div>
          <Field label="Phone Number" required>
            <PortalInput required type="tel" value={details.phone} onChange={e => setD('phone', e.target.value)} placeholder="+60 12-345 6789" />
          </Field>
          <Field label="Email (optional)">
            <PortalInput type="email" value={details.email} onChange={e => setD('email', e.target.value)} placeholder="you@example.com" />
          </Field>
          <Field label="Allergies (optional, comma-separated)">
            <PortalInput value={details.allergies} onChange={e => setD('allergies', e.target.value)} placeholder="e.g. Penicillin, Latex" />
          </Field>
          <Field label="Medical Conditions (optional)">
            <PortalInput value={details.conditions} onChange={e => setD('conditions', e.target.value)} placeholder="e.g. Diabetes" />
          </Field>
          {error && <ErrorBox msg={error} />}
          <GradBtn label="Next →" />
        </form>
      )}

      {/* ── Step 3: Appointment ── */}
      {step === STEPS.APPOINTMENT && (
        <form onSubmit={handleBook} className="space-y-5">
          {patient && (
            <div className="rounded-xl px-3 py-2.5" style={{ background: '#f9fafb' }}>
              <p className="text-sm text-gray-700">
                Welcome back, <span className="font-semibold">{patient.firstName} {patient.lastName}</span>!
              </p>
            </div>
          )}

          <Field label="Choose Dentist" required>
            <div className="grid grid-cols-2 gap-2">
              {DENTISTS.map(d => (
                <button
                  key={d} type="button" onClick={() => setA('dentist', d)}
                  className="px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left"
                  style={{
                    background: appt.dentist === d ? `linear-gradient(135deg,${PINK},${PURPLE})` : '#fff',
                    color:      appt.dentist === d ? '#fff' : '#374151',
                    border:     appt.dentist === d ? 'none' : '1.5px solid #e5e7eb',
                    boxShadow:  appt.dentist === d ? `0 4px 12px rgba(255,45,143,0.25)` : 'none',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Reason for Visit" required>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(t => (
                <button
                  key={t.value} type="button" onClick={() => setA('type', t.value)}
                  className="px-2 py-2.5 rounded-xl text-xs font-medium border transition-all"
                  style={{
                    background: appt.type === t.value ? `linear-gradient(135deg,${PINK},${PURPLE})` : '#fff',
                    color:      appt.type === t.value ? '#fff' : '#6b7280',
                    border:     appt.type === t.value ? 'none' : '1.5px solid #e5e7eb',
                    boxShadow:  appt.type === t.value ? `0 4px 12px rgba(255,45,143,0.25)` : 'none',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Notes (optional)">
            <textarea
              value={appt.notes}
              onChange={e => setA('notes', e.target.value)}
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none transition-all"
              style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb', color: '#111827', caretColor: PINK }}
              onFocus={e => { e.target.style.border = `1.5px solid ${PINK}`; e.target.style.boxShadow = '0 0 0 4px rgba(255,45,143,0.08)'; e.target.style.background = '#fff'; }}
              onBlur={e  => { e.target.style.border = '1.5px solid #e5e7eb'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f9fafb'; }}
              rows={2}
              placeholder="Any concerns..."
            />
          </Field>

          {error && <ErrorBox msg={error} />}
          <GradBtn disabled={loading} loading={loading} label="Join Queue" />
          <button
            type="button"
            onClick={() => { setStep(isNew ? STEPS.DETAILS : STEPS.IC); setError(''); }}
            className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Back
          </button>
        </form>
      )}

      {/* ── Done ── */}
      {step === STEPS.DONE && result && (
        <div className="space-y-5 text-center">
          <div
            className="flex items-center justify-center w-16 h-16 rounded-full mx-auto"
            style={{ background: 'linear-gradient(135deg,#FF2D8F,#A855F7)', boxShadow: '0 8px 24px rgba(255,45,143,0.35)' }}
          >
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">You're in the queue!</h2>
            <p className="text-sm text-gray-400 mt-1">Please take a seat. Staff will call your name.</p>
          </div>
          <div className="rounded-2xl p-4 text-left space-y-2.5" style={{ background: '#f9fafb' }}>
            <InfoRow label="Name"    value={`${result.firstName} ${result.lastName}`} />
            <InfoRow label="Dentist" value={result.dentist} />
            <InfoRow label="Type"    value={result.type.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())} />
            <InfoRow label="Status"  value="Checked In" valueStyle={{ color: '#10b981', fontWeight: 600 }} />
          </div>
          <GradBtn
            type="button"
            onClick={() => navigate(`/portal/confirmation/${result.appointmentId}`)}
            label="View Live Queue Status →"
          />
        </div>
      )}

      {/* Footer */}
      {step !== STEPS.DONE && (
        <p className="text-center mt-6 text-xs text-gray-400">
          Have an appointment?{' '}
          <button
            onClick={() => navigate('/portal')}
            className="font-semibold"
            style={{ color: PINK }}
          >
            Book or check in here
          </button>
        </p>
      )}
    </PortalShell>
  );
}

/* ── Helpers ───────────────────────────────────────────── */
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
      className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all appearance-none"
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

function ErrorBox({ msg }) {
  return <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{msg}</p>;
}

function InfoRow({ label, value, valueStyle }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-16">{label}</span>
      <span className="text-sm text-gray-800" style={valueStyle}>{value}</span>
    </div>
  );
}
