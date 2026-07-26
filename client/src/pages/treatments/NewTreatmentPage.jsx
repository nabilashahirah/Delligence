import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTreatment, updateTreatment, getTreatment } from '../../api/treatments.api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

const SURFACES = ['mesial', 'distal', 'occlusal', 'buccal', 'lingual'];

const EMPTY_RX    = { drug: '', dosage: '', frequency: '', duration: '' };
const EMPTY_TOOTH = { toothNumber: '', surface: [] };

const BLANK_FORM = {
  procedure:    '',
  diagnosis:    '',
  findings:     '',
  followUpDate: '',
  cost: { amount: '', isPaid: false },
};

export default function NewTreatmentPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();

  const treatmentId  = params.get('treatmentId')  || '';   // present = edit mode
  const appointmentId = params.get('appointmentId') || '';
  const patientId    = params.get('patientId')    || '';
  const dentist      = params.get('dentist')      || '';
  const patientName  = params.get('patientName')  || 'Patient';
  const isEdit       = !!treatmentId;

  const [form, setForm]   = useState(BLANK_FORM);
  const [teeth, setTeeth] = useState([]);
  const [rxList, setRxList] = useState([]);
  const [ready, setReady] = useState(!isEdit); // in create mode, form is immediately ready

  // Load existing treatment when editing
  const { data: existingData } = useQuery({
    queryKey: ['treatment', treatmentId],
    queryFn: () => getTreatment(treatmentId),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existingData) return;
    const t = existingData.data.data;
    setForm({
      procedure:    t.procedure ?? '',
      diagnosis:    t.diagnosis ?? '',
      findings:     t.findings  ?? '',
      followUpDate: t.followUpDate ? t.followUpDate.split('T')[0] : '',
      cost: {
        amount: t.cost?.amount != null ? String(t.cost.amount) : '',
        isPaid: t.cost?.isPaid ?? false,
      },
    });
    setTeeth((t.teeth ?? []).map(tooth => ({
      toothNumber: tooth.toothNumber != null ? String(tooth.toothNumber) : '',
      surface: tooth.surface ?? [],
    })));
    setRxList((t.prescription ?? []).map(rx => ({
      drug: rx.drug ?? '', dosage: rx.dosage ?? '',
      frequency: rx.frequency ?? '', duration: rx.duration ?? '',
    })));
    setReady(true);
  }, [existingData]);

  const set     = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const setCost = (k, v) => setForm(prev => ({ ...prev, cost: { ...prev.cost, [k]: v } }));

  // Teeth helpers
  const addTooth     = () => setTeeth(prev => [...prev, { ...EMPTY_TOOTH }]);
  const removeTooth  = (i) => setTeeth(prev => prev.filter((_, idx) => idx !== i));
  const setToothNum  = (i, v) => setTeeth(prev => prev.map((t, idx) => idx === i ? { ...t, toothNumber: v } : t));
  const toggleSurface = (i, s) =>
    setTeeth(prev => prev.map((t, idx) => {
      if (idx !== i) return t;
      const surface = t.surface.includes(s) ? t.surface.filter(x => x !== s) : [...t.surface, s];
      return { ...t, surface };
    }));

  // Prescription helpers
  const addRx    = () => setRxList(prev => [...prev, { ...EMPTY_RX }]);
  const removeRx = (i) => setRxList(prev => prev.filter((_, idx) => idx !== i));
  const setRx    = (i, k, v) => setRxList(prev => prev.map((r, idx) => idx === i ? { ...r, [k]: v } : r));

  const buildPayload = () => ({
    procedure:    form.procedure,
    diagnosis:    form.diagnosis    || undefined,
    findings:     form.findings     || undefined,
    followUpDate: form.followUpDate || undefined,
    cost: {
      amount:   parseFloat(form.cost.amount) || 0,
      currency: 'MYR',
      isPaid:   form.cost.isPaid,
    },
    teeth: teeth.filter(t => t.toothNumber).map(t => ({
      toothNumber: parseInt(t.toothNumber), surface: t.surface,
    })),
    prescription: rxList.filter(r => r.drug),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => isEdit
      ? updateTreatment(treatmentId, buildPayload())
      : createTreatment({ appointmentId, patientId, dentist, ...buildPayload() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treatments', patientId] });
      toast.success(isEdit ? 'Treatment updated' : 'Treatment recorded');
      navigate(`/patients/${patientId}`);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const handleSubmit = (e) => { e.preventDefault(); mutate(); };

  if (isEdit && !ready) {
    return <div className="p-6 text-sm text-gray-400">Loading treatment...</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {isEdit ? 'Edit Treatment' : 'Record Treatment'}
          </h1>
          <p className="text-sm text-gray-500">{patientName} · {dentist}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Clinical Details */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Clinical Details</h2>
          <Input
            label="Procedure"
            placeholder="e.g. Composite filling, Root canal treatment"
            value={form.procedure}
            onChange={e => set('procedure', e.target.value)}
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Diagnosis <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea rows={2} value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)}
              placeholder="e.g. Dental caries on upper right first molar"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none
                focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Findings <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea rows={2} value={form.findings} onChange={e => set('findings', e.target.value)}
              placeholder="e.g. Deep caries involving dentine, no pulp involvement"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none
                focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </Card>

        {/* Teeth */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h2 className="text-sm font-semibold text-gray-700">Teeth Involved <span className="text-gray-400 font-normal">(optional)</span></h2>
            <button type="button" onClick={addTooth}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
              <Plus size={13} /> Add Tooth
            </button>
          </div>
          {teeth.length === 0 && (
            <p className="text-xs text-gray-400">No teeth added. Click "Add Tooth" to specify affected teeth.</p>
          )}
          {teeth.map((tooth, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
              <div className="w-24 flex-shrink-0">
                <Input label="Tooth #" type="number" min={1} max={32} placeholder="e.g. 16"
                  value={tooth.toothNumber} onChange={e => setToothNum(i, e.target.value)} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600 mb-1.5">Surface</p>
                <div className="flex flex-wrap gap-1.5">
                  {SURFACES.map(s => (
                    <button key={s} type="button" onClick={() => toggleSurface(i, s)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize transition-colors
                        ${tooth.surface.includes(s)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-600 hover:border-blue-400'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => removeTooth(i)}
                className="mt-5 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </Card>

        {/* Prescription */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h2 className="text-sm font-semibold text-gray-700">Prescription <span className="text-gray-400 font-normal">(optional)</span></h2>
            <button type="button" onClick={addRx}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
              <Plus size={13} /> Add Drug
            </button>
          </div>
          {rxList.length === 0 && <p className="text-xs text-gray-400">No prescription added.</p>}
          {rxList.map((rx, i) => (
            <div key={i} className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 relative">
              <Input label="Drug" placeholder="e.g. Amoxicillin" value={rx.drug}
                onChange={e => setRx(i, 'drug', e.target.value)} />
              <Input label="Dosage" placeholder="e.g. 500mg" value={rx.dosage}
                onChange={e => setRx(i, 'dosage', e.target.value)} />
              <Input label="Frequency" placeholder="e.g. 3x daily" value={rx.frequency}
                onChange={e => setRx(i, 'frequency', e.target.value)} />
              <Input label="Duration" placeholder="e.g. 5 days" value={rx.duration}
                onChange={e => setRx(i, 'duration', e.target.value)} />
              <button type="button" onClick={() => removeRx(i)}
                className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </Card>

        {/* Cost & Follow-up */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Cost & Follow-up</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount (MYR)" type="number" min={0} step="0.01" placeholder="0.00"
              value={form.cost.amount} onChange={e => setCost('amount', e.target.value)} />
            <Input label="Follow-up Date" type="date"
              value={form.followUpDate} onChange={e => set('followUpDate', e.target.value)} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.cost.isPaid} onChange={e => setCost('isPaid', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-sm text-gray-700">Payment received</span>
          </label>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" loading={isPending}>
            {isEdit ? 'Save Changes' : 'Save Treatment'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
