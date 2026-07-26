import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAppointment, checkConflict } from '../../api/appointments.api';
import { getPatients } from '../../api/patients.api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';
import { ArrowLeft, Search, AlertTriangle } from 'lucide-react';

const APPOINTMENT_TYPES = ['checkup','cleaning','filling','extraction','root-canal','consultation','other'];
const DENTISTS = ['Dr. Amir', 'Dr. Sarah', 'Dr. Wong', 'Dr. Priya'];

const INITIAL = {
  patientId: '', dentist: '', scheduledAt: '', duration: 30, type: '', notes: '',
};

export default function NewAppointmentPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    ...INITIAL,
    dentist:     searchParams.get('dentist')     ?? '',
    scheduledAt: searchParams.get('scheduledAt') ?? '',
  });
  const [search, setSearch] = useState('');
  const [patientName, setPatientName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const { data: patientsRes } = useQuery({
    queryKey: ['patients', search],
    queryFn: () => getPatients({ search, limit: 8 }),
    enabled: search.length > 1,
  });
  const patients = patientsRes?.data?.data?.patients ?? [];

  const canCheckConflict = !!(form.dentist && form.scheduledAt && form.duration);
  const { data: conflictRes } = useQuery({
    queryKey: ['conflict', form.dentist, form.scheduledAt, form.duration],
    queryFn: () => checkConflict(form.dentist, form.scheduledAt, form.duration),
    enabled: canCheckConflict,
    select: (res) => res.data.data,
    staleTime: 0,
  });
  const conflict = conflictRes?.hasConflict ? conflictRes : null;

  const { mutate, isPending } = useMutation({
    mutationFn: () => createAppointment(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment booked');
      navigate('/appointments');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Booking failed'),
  });

  const selectPatient = (p) => {
    set('patientId', p._id);
    setPatientName(`${p.firstName} ${p.lastName}`);
    setSearch('');
    setShowDropdown(false);
  };

  const handleSubmit = (e) => { e.preventDefault(); mutate(); };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Book Appointment</h1>
          <p className="text-sm text-gray-500">Schedule a new patient visit</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="p-5 space-y-4">

          {/* Patient search */}
          <div className="relative flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Patient</label>
            {form.patientId ? (
              <div className="flex items-center justify-between rounded-lg border border-blue-300 bg-blue-50 px-3 py-2">
                <span className="text-sm font-medium text-blue-800">{patientName}</span>
                <button type="button" onClick={() => { set('patientId', ''); setPatientName(''); }}
                  className="text-xs text-blue-500 hover:text-blue-700">Change</button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search patient by name..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                {showDropdown && patients.length > 0 && (
                  <ul className="absolute z-10 mt-1 top-full w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                    {patients.map(p => (
                      <li key={p._id}>
                        <button type="button" onMouseDown={() => selectPatient(p)}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors">
                          <span className="font-medium text-gray-900">{p.firstName} {p.lastName}</span>
                          <span className="ml-2 text-gray-400">{p.contact?.phone}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* Dentist */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Dentist</label>
            <select value={form.dentist} onChange={e => set('dentist', e.target.value)} required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Select dentist</option>
              {DENTISTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Date/time + duration */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date & Time"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={e => set('scheduledAt', e.target.value)}
              required
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Duration (min)</label>
              <select value={form.duration} onChange={e => set('duration', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                {[15,20,30,45,60,90,120].map(m => <option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Appointment Type</label>
            <select value={form.type} onChange={e => set('type', e.target.value)} required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm capitalize focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Select type</option>
              {APPOINTMENT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Chief complaint or special instructions..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </Card>

        {conflict && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Scheduling Conflict</p>
              <p className="text-xs text-red-600 mt-0.5">
                {form.dentist} is already booked from{' '}
                {new Date(conflict.conflictsWith.scheduledAt).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                {' '}to{' '}
                {new Date(conflict.conflictsWith.endsAt).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}.
                Please choose a different time or dentist.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" loading={isPending} disabled={!form.patientId || !!conflict}>Book Appointment</Button>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
