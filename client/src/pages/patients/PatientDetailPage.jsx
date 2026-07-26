import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Phone, Mail, MapPin, AlertCircle, Pencil,
  CalendarDays, ChevronDown, ChevronUp, FileText, PlusCircle,
} from 'lucide-react';
import { getPatient } from '../../api/patients.api';
import { getAppointments } from '../../api/appointments.api';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const getTreatments = (patientId) => api.get(`/treatments/patient/${patientId}`);

const STATUS_DOT = {
  scheduled:    'bg-blue-400',
  'checked-in': 'bg-amber-400',
  'in-progress':'bg-purple-400',
  completed:    'bg-emerald-400',
  cancelled:    'bg-gray-300',
  'no-show':    'bg-red-400',
};

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [filterYear,   setFilterYear]   = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [filterFrom,   setFilterFrom]   = useState('');
  const [filterTo,     setFilterTo]     = useState('');
  const [showAll,      setShowAll]      = useState(false);

  const { data: patientRes, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => getPatient(id),
  });

  const { data: treatmentsRes } = useQuery({
    queryKey: ['treatments', id],
    queryFn: () => getTreatments(id),
  });

  const { data: apptRes } = useQuery({
    queryKey: ['patient-appointments', id],
    queryFn: () => getAppointments({ patient_id: id, limit: 50 }),
  });

  const patient      = patientRes?.data?.data;
  const treatments   = treatmentsRes?.data?.data?.treatments ?? [];
  const appointments = apptRes?.data?.data?.appointments ?? [];

  // Hooks must run before any early returns
  const treatmentByAppt = useMemo(() =>
    Object.fromEntries(treatments.map(t => [t.appointmentId, t])),
  [treatments]);

  const years = useMemo(() => {
    const s = new Set(appointments.map(a => new Date(a.scheduledAt).getFullYear()));
    return [...s].sort((a, b) => b - a);
  }, [appointments]);

  if (isLoading) return <div className="p-6 text-sm text-gray-400">Loading...</div>;
  if (!patient)  return <div className="p-6 text-sm text-red-400">Patient not found.</div>;

  const age = Math.floor((new Date() - new Date(patient.dateOfBirth)) / (1000 * 60 * 60 * 24 * 365));

  const sorted = appointments.slice().sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
  const fromDate = filterFrom ? new Date(filterFrom) : null;
  const toDate   = filterTo   ? new Date(filterTo + 'T23:59:59') : null;
  const filtered = sorted.filter(a => {
    const d = new Date(a.scheduledAt);
    if (filterYear   && d.getFullYear() !== filterYear) return false;
    if (filterStatus && a.status !== filterStatus)      return false;
    if (fromDate     && d < fromDate)                   return false;
    if (toDate       && d > toDate)                     return false;
    return true;
  });

  const anyFilter = filterYear || filterStatus || filterFrom || filterTo;

  function clearFilters() {
    setFilterYear(null); setFilterStatus(null);
    setFilterFrom('');   setFilterTo('');
    setShowAll(false);
  }
  const visible = showAll ? filtered : filtered.slice(0, 5);
  const hidden  = filtered.length - 5;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-sm text-gray-500 capitalize">{patient.gender} · {age} years old</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate(`/patients/${id}/edit`)}>
          <Pencil size={14} /> Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact */}
        <Card className="p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Contact</h2>
          {patient.contact?.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone size={14} className="text-gray-400" />{patient.contact.phone}
            </div>
          )}
          {patient.contact?.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail size={14} className="text-gray-400" />{patient.contact.email}
            </div>
          )}
          {patient.contact?.address && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin size={14} className="text-gray-400" />{patient.contact.address}
            </div>
          )}
        </Card>

        {/* Medical history */}
        <Card className="p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Medical History</h2>
          {patient.medicalHistory?.allergies?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-500 flex items-center gap-1 mb-1">
                <AlertCircle size={11} /> Allergies
              </p>
              <div className="flex flex-wrap gap-1">
                {patient.medicalHistory.allergies.map(a => (
                  <span key={a} className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">{a}</span>
                ))}
              </div>
            </div>
          )}
          {patient.medicalHistory?.conditions?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Conditions</p>
              <div className="flex flex-wrap gap-1">
                {patient.medicalHistory.conditions.map(c => (
                  <span key={c} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{c}</span>
                ))}
              </div>
            </div>
          )}
          {patient.medicalHistory?.medications?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Medications</p>
              <div className="flex flex-wrap gap-1">
                {patient.medicalHistory.medications.map(m => (
                  <span key={m} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">{m}</span>
                ))}
              </div>
            </div>
          )}
          {patient.medicalHistory?.notes && (
            <p className="text-xs text-gray-500 italic">{patient.medicalHistory.notes}</p>
          )}
          {!patient.medicalHistory?.allergies?.length &&
           !patient.medicalHistory?.conditions?.length &&
           !patient.medicalHistory?.medications?.length && (
            <p className="text-sm text-gray-400">No medical history recorded.</p>
          )}
        </Card>
      </div>

      {/* Visit History ─ appointments + linked treatments */}
      <Card>
        {/* Card header */}
        <div className="px-5 py-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Visit History</h2>
            <div className="ml-auto flex items-center gap-2">
              {anyFilter && (
                <button onClick={clearFilters} className="text-[11px] text-blue-500 hover:text-blue-700 font-medium">
                  Clear filters
                </button>
              )}
              <span className="text-xs text-gray-400">
                {filtered.length !== appointments.length
                  ? `${filtered.length} of ${appointments.length}`
                  : `${appointments.length}`
                } visit{appointments.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-gray-400 w-8">From</span>
            <input
              type="date"
              value={filterFrom}
              max={filterTo || undefined}
              onChange={e => { setFilterFrom(e.target.value); setShowAll(false); }}
              className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            />
            <span className="text-[11px] text-gray-400">to</span>
            <input
              type="date"
              value={filterTo}
              min={filterFrom || undefined}
              onChange={e => { setFilterTo(e.target.value); setShowAll(false); }}
              className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            />
          </div>

          {/* Year filter */}
          {years.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-gray-400 w-8">Year</span>
              {[null, ...years].map(y => (
                <button
                  key={y ?? 'all'}
                  onClick={() => { setFilterYear(y); setShowAll(false); }}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                    filterYear === y
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {y ?? 'All'}
                </button>
              ))}
            </div>
          )}

          {/* Status filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-gray-400 w-8">Status</span>
            {[
              { value: null,        label: 'All' },
              { value: 'completed', label: 'Completed' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'no-show',   label: 'No-show' },
            ].map(({ value, label }) => (
              <button
                key={label}
                onClick={() => { setFilterStatus(value); setShowAll(false); }}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                  filterStatus === value
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">
            {anyFilter ? 'No visits match the selected filters.' : 'No visits recorded.'}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-gray-50">
              {visible.map((appt) => (
                <VisitRow
                  key={appt._id}
                  appt={appt}
                  treatment={treatmentByAppt[appt._id]}
                  patientId={id}
                  patientName={`${patient.firstName} ${patient.lastName}`}
                  onEditTreatment={(t) => navigate(
                    `/treatments/edit?treatmentId=${t._id}` +
                    `&patientId=${id}` +
                    `&dentist=${encodeURIComponent(t.dentist)}` +
                    `&patientName=${encodeURIComponent(patient.firstName + ' ' + patient.lastName)}`
                  )}
                  onNewTreatment={() => navigate(
                    `/treatments/new?appointmentId=${appt._id}` +
                    `&patientId=${id}` +
                    `&dentist=${encodeURIComponent(appt.dentist)}` +
                    `&patientName=${encodeURIComponent(patient.firstName + ' ' + patient.lastName)}`
                  )}
                />
              ))}
            </ul>

            {!showAll && hidden > 0 && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full py-3 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 transition-colors border-t border-gray-100"
              >
                Show {hidden} older visit{hidden !== 1 ? 's' : ''}
              </button>
            )}
            {showAll && filtered.length > 5 && (
              <button
                onClick={() => setShowAll(false)}
                className="w-full py-3 text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors border-t border-gray-100"
              >
                Show less
              </button>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

// ── Visit Row ──────────────────────────────────────────────────────────────────
function VisitRow({ appt, treatment, onEditTreatment, onNewTreatment }) {
  const [open, setOpen] = useState(false);

  const date = new Date(appt.scheduledAt).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <li>
      {/* Collapsed row */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[appt.status] ?? 'bg-gray-300'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900 capitalize">
              {appt.type?.replace(/-/g, ' ')}
            </span>
            {appt.walkIn && (
              <span className="text-[10px] font-medium text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full">Walk-in</span>
            )}
            {treatment && (
              <span className="text-[10px] font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <FileText size={9} /> Treatment
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{date} · {appt.dentist}</p>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Badge status={appt.status} label={appt.status} />
          {open ? <ChevronUp size={14} className="text-gray-300" /> : <ChevronDown size={14} className="text-gray-300" />}
        </div>
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="mx-4 mb-4 rounded-xl border border-gray-100 overflow-hidden">
          {treatment ? (
            <>
              {/* Treatment header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <FileText size={12} />
                  <span className="font-medium text-gray-700">{treatment.procedure || 'Treatment Record'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onEditTreatment(treatment)}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  <Pencil size={11} /> Edit
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Diagnosis + Findings */}
                {(treatment.diagnosis || treatment.findings) && (
                  <div className={`grid gap-3 ${treatment.diagnosis && treatment.findings ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {treatment.diagnosis && <DetailField label="Diagnosis" value={treatment.diagnosis} />}
                    {treatment.findings  && <DetailField label="Findings"  value={treatment.findings} />}
                  </div>
                )}

                {/* Teeth */}
                {treatment.teeth?.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Teeth Involved</p>
                    <div className="flex flex-wrap gap-1.5">
                      {treatment.teeth.map((tooth, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs text-blue-700">
                          <span className="font-bold">#{tooth.toothNumber}</span>
                          {tooth.surfaces?.length > 0 && <span className="text-blue-400">{tooth.surfaces.join('-')}</span>}
                        </span>
                      ))}
                    </div>
                    {treatment.teeth.some(t => t.notes) && (
                      <div className="mt-1.5 space-y-0.5">
                        {treatment.teeth.filter(t => t.notes).map((t, i) => (
                          <p key={i} className="text-xs text-gray-400 italic">#{t.toothNumber}: {t.notes}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Prescription */}
                {treatment.prescription?.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Prescription</p>
                    <div className="space-y-1.5">
                      {treatment.prescription.map((rx, i) => (
                        <div key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="text-sm font-medium text-gray-700">{rx.medication}</span>
                          {rx.dosage       && <span className="text-xs text-gray-400">{rx.dosage}</span>}
                          {rx.duration     && <span className="text-xs text-gray-400">· {rx.duration}</span>}
                          {rx.instructions && <span className="text-xs text-gray-400 italic">· {rx.instructions}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cost + Follow-up */}
                {(treatment.cost || treatment.followUpDate) && (
                  <div className="grid grid-cols-2 gap-3">
                    {treatment.cost && (
                      <div>
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Cost</p>
                        <div className="space-y-0.5 text-xs">
                          {treatment.cost.consultation != null && <CostRow label="Consultation" v={treatment.cost.consultation} />}
                          {treatment.cost.procedure    != null && <CostRow label="Procedure"    v={treatment.cost.procedure} />}
                          {treatment.cost.materials    != null && <CostRow label="Materials"    v={treatment.cost.materials} />}
                          {treatment.cost.medication   != null && <CostRow label="Medication"   v={treatment.cost.medication} />}
                          {treatment.cost.total        != null && (
                            <div className="flex justify-between font-semibold text-gray-700 border-t border-gray-200 pt-1 mt-1">
                              <span>Total</span>
                              <span>RM {Number(treatment.cost.total).toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {treatment.followUpDate && (
                      <div>
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Follow-up</p>
                        <p className="text-sm text-gray-700">
                          {new Date(treatment.followUpDate).toLocaleDateString('en-MY', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* No treatment linked */
            <div className="flex items-center justify-between px-4 py-3.5 bg-gray-50">
              <p className="text-xs text-gray-400">No treatment record for this visit.</p>
              {appt.status === 'completed' && (
                <button
                  type="button"
                  onClick={onNewTreatment}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  <PlusCircle size={12} /> Add Treatment
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function DetailField({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-gray-700 leading-relaxed">{value}</p>
    </div>
  );
}

function CostRow({ label, v }) {
  return (
    <div className="flex justify-between text-gray-500">
      <span>{label}</span><span>RM {Number(v).toFixed(2)}</span>
    </div>
  );
}
