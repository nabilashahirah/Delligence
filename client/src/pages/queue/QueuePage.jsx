import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Clock, User, UserPlus, ExternalLink } from 'lucide-react';
import { getQueue } from '../../api/queue.api';
import { updateStatus } from '../../api/appointments.api';
import { createAppointment } from '../../api/appointments.api';
import { getPatients } from '../../api/patients.api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';

const NEXT_STATUS = {
  scheduled:    'checked-in',
  'checked-in': 'in-progress',
  'in-progress':'completed',
};

const NEXT_LABEL = {
  scheduled:    'Check In',
  'checked-in': 'Start',
  'in-progress':'Complete',
};

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

const INITIAL_WALKIN = {
  search: '', patientId: '', patientName: '',
  dentist: DENTISTS[0], type: 'checkup', duration: 30, notes: '',
};

export default function QueuePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showWalkIn, setShowWalkIn] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['queue'],
    queryFn: () => getQueue(),
    refetchInterval: 60000,
  });

  const { mutate: advance, isPending } = useMutation({
    mutationFn: ({ id, status }) => updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['queue'] });
      toast.success('Status updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const queue = data?.data?.data?.queue ?? [];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900">Live Queue</h1>
            <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Real-time
            </span>
          </div>
          <p className="text-sm text-gray-500">{queue.length} patient(s) in queue</p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => setShowWalkIn(true)}>
            <UserPlus size={14} /> Walk-In
          </Button>
          <Button variant="secondary" size="sm" onClick={() => refetch()} loading={isFetching}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading queue...</p>
      ) : queue.length === 0 ? (
        <Card className="p-8 text-center text-sm text-gray-400">Queue is empty.</Card>
      ) : (
        <div className="space-y-3">
          {queue.map((entry) => (
            <Card key={entry.appointmentId} className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-700 font-semibold text-sm">#{entry.position}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <User size={14} className="text-gray-400" />
                  <button
                    onClick={() => entry.patient?._id && navigate(`/patients/${entry.patient._id}`)}
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline transition-colors"
                  >
                    {entry.patient?.firstName} {entry.patient?.lastName}
                  </button>
                  <Badge status={entry.status} label={entry.status} />
                  {entry.walkIn
                    ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">Walk-in</span>
                    : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Appointment</span>
                  }
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-400 capitalize">{entry.type}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={11} />
                    ~{entry.estimatedWaitMinutes} min wait
                    {entry.estimatedWaitMinutes > 0 && (
                      <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-purple-600 font-medium" style={{fontSize: '10px'}}>AI</span>
                    )}
                  </span>
                </div>
              </div>
              {NEXT_STATUS[entry.status] && (
                <Button
                  size="sm"
                  variant={entry.status === 'in-progress' ? 'primary' : 'secondary'}
                  loading={isPending}
                  onClick={() => advance({ id: entry.appointmentId, status: NEXT_STATUS[entry.status] })}
                >
                  {NEXT_LABEL[entry.status]}
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {showWalkIn && (
        <WalkInModal
          onClose={() => setShowWalkIn(false)}
          onSuccess={() => {
            setShowWalkIn(false);
            qc.invalidateQueries({ queryKey: ['queue'] });
            toast.success('Walk-in added to queue');
          }}
        />
      )}
    </div>
  );
}

// ── Walk-In Modal ─────────────────────────────────────────────────────────────
function WalkInModal({ onClose, onSuccess }) {
  const [form, setForm]       = useState(INITIAL_WALKIN);
  const [patients, setPatients] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError]     = useState('');

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }));
  }

  async function handleSearch() {
    if (!form.search.trim()) return;
    setSearching(true);
    try {
      const res = await getPatients({ search: form.search.trim(), limit: 10 });
      setPatients(res.data.data.patients ?? []);
    } catch {
      setPatients([]);
    } finally {
      setSearching(false);
    }
  }

  function selectPatient(p) {
    set('patientId', p._id);
    set('patientName', `${p.firstName} ${p.lastName}`);
    set('search', '');
    setPatients([]);
  }

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => createAppointment({
      patientId:   form.patientId,
      dentist:     form.dentist,
      scheduledAt: new Date().toISOString(),
      duration:    Number(form.duration),
      type:        form.type,
      notes:       form.notes || null,
      walkIn:      true,
    }),
    onSuccess,
    onError: (err) => setError(err.response?.data?.message || 'Failed to add walk-in'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.patientId) { setError('Please select a patient.'); return; }
    setError('');
    submit();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Add Walk-In Patient</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient search */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Search Patient <span className="text-red-400">*</span></label>
            {form.patientName ? (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-blue-800">{form.patientName}</span>
                <button type="button" onClick={() => set('patientName', '') || set('patientId', '')}
                  className="text-xs text-blue-500 hover:text-blue-700">Change</button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    value={form.search}
                    onChange={e => set('search', e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                    placeholder="Name or IC number..."
                    className={inputCls}
                  />
                  <button type="button" onClick={handleSearch}
                    className="px-3 py-2 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 whitespace-nowrap">
                    {searching ? '...' : 'Search'}
                  </button>
                </div>
                {patients.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {patients.map(p => (
                      <button key={p._id} type="button" onClick={() => selectPatient(p)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-b-0 border-gray-100">
                        <span className="font-medium">{p.firstName} {p.lastName}</span>
                        <span className="text-xs text-gray-400 ml-2">{p.idNumber}</span>
                      </button>
                    ))}
                  </div>
                )}
                {patients.length === 0 && form.search && !searching && (
                  <p className="text-xs text-gray-400">No results. <a href="/patients/new" className="text-blue-500 hover:underline" target="_blank" rel="noreferrer">Register new patient →</a></p>
                )}
              </div>
            )}
          </div>

          {/* Dentist */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Dentist <span className="text-red-400">*</span></label>
            <select value={form.dentist} onChange={e => set('dentist', e.target.value)} className={inputCls}>
              {DENTISTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          {/* Type + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type <span className="text-red-400">*</span></label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className={inputCls}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Est. Duration (min)</label>
              <input type="number" min={5} max={180} value={form.duration}
                onChange={e => set('duration', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              className={`${inputCls} resize-none`} rows={2} placeholder="Chief complaint..." />
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50">
              {isPending ? 'Adding...' : 'Add to Queue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
