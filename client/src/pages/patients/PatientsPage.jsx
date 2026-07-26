import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, Trash2, Pencil } from 'lucide-react';
import { getPatients, deletePatient } from '../../api/patients.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const formatIC = (raw = '') => {
  if (raw.length <= 6) return raw;
  if (raw.length <= 8) return `${raw.slice(0,6)}-${raw.slice(6)}`;
  return `${raw.slice(0,6)}-${raw.slice(6,8)}-${raw.slice(8)}`;
};

export default function PatientsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [confirmId, setConfirmId] = useState(null); // patient ID pending deletion

  const { data, isLoading } = useQuery({
    queryKey: ['patients', search, page],
    queryFn: () => getPatients({ search, page, limit: 20 }),
    keepPreviousData: true,
  });

  const { mutate: remove, isPending: isDeleting } = useMutation({
    mutationFn: (id) => deletePatient(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Patient deactivated');
      setConfirmId(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
  });

  const { patients = [], total = 0, totalPages = 1 } = data?.data?.data ?? {};
  const patientToDelete = patients.find(p => p._id === confirmId);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Patients</h1>
          <p className="text-sm text-gray-500">{total} registered patient(s)</p>
        </div>
        <Button onClick={() => navigate('/patients/new')}>
          <UserPlus size={16} /> New Patient
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, IC number or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm
            focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <Card>
        {isLoading ? (
          <p className="p-5 text-sm text-gray-400">Loading...</p>
        ) : patients.length === 0 ? (
          <p className="p-5 text-sm text-gray-400">No patients found.</p>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {['Name', 'IC / Passport', 'Phone', 'Gender', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patients.map((p) => (
                <tr
                  key={p._id}
                  onClick={() => navigate(`/patients/${p._id}`)}
                  className="hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {p.firstName} {p.lastName}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {p.idType === 'ic' ? formatIC(p.idNumber) : p.idNumber}
                    {p.idType === 'passport' && (
                      <span className="ml-1.5 font-sans normal-case text-gray-400">(Passport)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.contact?.phone}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{p.gender}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => navigate(`/patients/${p._id}/edit`)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                        title="Edit patient"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmId(p._id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Deactivate patient"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-1 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Deactivate patient?</h2>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              <span className="font-medium text-gray-700">
                {patientToDelete?.firstName} {patientToDelete?.lastName}
              </span>{' '}
              will be deactivated and removed from the active patient list.
              Their records and treatment history are preserved.
            </p>
            <div className="mt-5 flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setConfirmId(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" loading={isDeleting} onClick={() => remove(confirmId)}>
                Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
