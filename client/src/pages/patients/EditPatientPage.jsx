import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPatient, updatePatient } from '../../api/patients.api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

export default function EditPatientPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => getPatient(id),
  });

  // Populate form once patient data loads
  useEffect(() => {
    const p = data?.data?.data;
    if (!p) return;
    setForm({
      firstName:   p.firstName   || '',
      lastName:    p.lastName    || '',
      dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split('T')[0] : '',
      gender:      p.gender      || '',
      idType:      p.idType      || 'ic',
      idNumber:    p.idNumber    || '',
      contact: {
        phone:   p.contact?.phone   || '',
        email:   p.contact?.email   || '',
        address: p.contact?.address || '',
      },
      medicalHistory: {
        allergies:   (p.medicalHistory?.allergies   || []).join(', '),
        conditions:  (p.medicalHistory?.conditions  || []).join(', '),
        medications: (p.medicalHistory?.medications || []).join(', '),
        notes:       p.medicalHistory?.notes || '',
      },
    });
  }, [data]);

  const set = (path, value) =>
    setForm((prev) => {
      const keys = path.split('.');
      if (keys.length === 1) return { ...prev, [path]: value };
      return { ...prev, [keys[0]]: { ...prev[keys[0]], [keys[1]]: value } };
    });

  const handleIdNumber = (value) => {
    const cleaned = form.idType === 'ic' ? value.replace(/\D/g, '').slice(0, 12) : value.toUpperCase();
    set('idNumber', cleaned);
  };

  const handleIdType = (value) => {
    setForm(prev => ({ ...prev, idType: value, idNumber: '' }));
  };

  const displayIC = (raw = '') => {
    if (raw.length <= 6) return raw;
    if (raw.length <= 8) return `${raw.slice(0,6)}-${raw.slice(6)}`;
    return `${raw.slice(0,6)}-${raw.slice(6,8)}-${raw.slice(8)}`;
  };

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        medicalHistory: {
          allergies:   form.medicalHistory.allergies.split(',').map(s => s.trim()).filter(Boolean),
          conditions:  form.medicalHistory.conditions.split(',').map(s => s.trim()).filter(Boolean),
          medications: form.medicalHistory.medications.split(',').map(s => s.trim()).filter(Boolean),
          notes:       form.medicalHistory.notes,
        },
      };
      return updatePatient(id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient', id] });
      qc.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Patient updated');
      navigate(`/patients/${id}`);
    },
    onError: (err) => {
      const msg = err.response?.data?.details?.[0] || err.response?.data?.message || 'Update failed';
      toast.error(msg);
    },
  });

  const handleSubmit = (e) => { e.preventDefault(); mutate(); };

  if (isLoading || !form) return <div className="p-6 text-sm text-gray-400">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Edit Patient</h1>
          <p className="text-sm text-gray-500">Update patient information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Personal info */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Personal Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={form.firstName} onChange={e => set('firstName', e.target.value)} required />
            <Input label="Last Name"  value={form.lastName}  onChange={e => set('lastName',  e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} required />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Gender</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)} required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* ID Number */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">ID Number</label>
            <div className="flex gap-2">
              <select value={form.idType} onChange={e => handleIdType(e.target.value)}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="ic">MyKad (IC)</option>
                <option value="passport">Passport</option>
              </select>
              <input
                type="text"
                value={form.idType === 'ic' ? displayIC(form.idNumber) : form.idNumber}
                onChange={e => handleIdNumber(e.target.value)}
                placeholder={form.idType === 'ic' ? '990101-14-1234' : 'A12345678'}
                required
                maxLength={form.idType === 'ic' ? 14 : 20}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm tracking-wider
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-400">
              {form.idType === 'ic'
                ? `${form.idNumber.length}/12 digits`
                : 'Passport number as printed on document'}
            </p>
          </div>
        </Card>

        {/* Contact */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Contact Details</h2>
          <Input label="Phone" value={form.contact.phone} onChange={e => set('contact.phone', e.target.value)} placeholder="+60 12-345 6789" required />
          <Input label="Email (optional)" type="email" value={form.contact.email} onChange={e => set('contact.email', e.target.value)} placeholder="patient@email.com" />
          <Input label="Address (optional)" value={form.contact.address} onChange={e => set('contact.address', e.target.value)} placeholder="Full address" />
        </Card>

        {/* Medical history */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">
            Medical History <span className="font-normal text-gray-400">(optional, comma-separated)</span>
          </h2>
          <Input label="Allergies"   value={form.medicalHistory.allergies}   onChange={e => set('medicalHistory.allergies',   e.target.value)} placeholder="e.g. Penicillin, Latex" />
          <Input label="Conditions"  value={form.medicalHistory.conditions}  onChange={e => set('medicalHistory.conditions',  e.target.value)} placeholder="e.g. Diabetes, Hypertension" />
          <Input label="Medications" value={form.medicalHistory.medications} onChange={e => set('medicalHistory.medications', e.target.value)} placeholder="e.g. Metformin, Aspirin" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea rows={3} value={form.medicalHistory.notes} onChange={e => set('medicalHistory.notes', e.target.value)}
              placeholder="Any additional notes..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" loading={isPending}>Save Changes</Button>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
