import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getAppointment, selfCheckin, selfCancel } from '../../api/portal.api';
import { PortalShell, GradBtn } from './PortalLandingPage';
import LinkTelegramButton from '../../components/LinkTelegramButton';

const PINK   = '#FF2D8F';
const PURPLE = '#A855F7';

function formatDateTime(isoStr) {
  return new Date(isoStr).toLocaleString('en-MY', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

const STATUS_CONFIG = {
  scheduled:    { label: 'Scheduled',   color: '#6b7280', bg: '#f3f4f6' },
  'checked-in': { label: 'Checked In',  color: '#059669', bg: '#ecfdf5' },
  'in-progress':{ label: 'In Progress', color: PURPLE,    bg: '#f5f3ff' },
  completed:    { label: 'Completed',   color: PINK,      bg: '#fff0f7' },
  cancelled:    { label: 'Cancelled',   color: '#ef4444', bg: '#fef2f2' },
};

const STATUS_DOT = {
  scheduled:    '#d1d5db',
  'checked-in': '#10b981',
  'in-progress': PURPLE,
  completed:    PINK,
};

export default function PortalConfirmationPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [checkedIn, setCheckedIn]       = useState(false);
  const [showCancel, setShowCancel]     = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDone, setCancelDone]     = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['portal-appt', id],
    queryFn: () => getAppointment(id),
    select: res => res.data.data,
    refetchInterval: 60000,
  });

  const { mutate: doCheckin, isPending: isCheckingIn } = useMutation({
    mutationFn: () => selfCheckin(id),
    onSuccess: () => { setCheckedIn(true); refetch(); },
  });

  const { mutate: doCancel, isPending: isCancelling, error: cancelError } = useMutation({
    mutationFn: () => selfCancel(id, cancelReason),
    onSuccess: () => { setCancelDone(true); setShowCancel(false); refetch(); },
  });

  if (isLoading) return <PortalShell><p className="text-sm text-gray-400 text-center py-10">Loading...</p></PortalShell>;
  if (isError)   return <PortalShell><p className="text-sm text-red-500 text-center py-10">Appointment not found.</p></PortalShell>;

  const appt       = data;
  const statusInfo = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.scheduled;
  const canCheckin  = appt.status === 'scheduled';
  const isCheckedIn = appt.status === 'checked-in';
  const queue       = appt.queueSnapshot ?? [];

  return (
    <PortalShell>
      {/* Confirmed banner */}
      {canCheckin && !checkedIn && (
        <div className="flex items-center gap-3 rounded-2xl p-4 mb-5" style={{ background: '#ecfdf5', border: '1px solid #bbf7d0' }}>
          <div className="flex-shrink-0 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">Appointment Confirmed</p>
            <p className="text-xs text-emerald-600">Tap Check In when you arrive at the clinic.</p>
          </div>
        </div>
      )}

      {/* Telegram linking */}
      {appt.idNumber && <LinkTelegramButton ic={appt.idNumber} />}

      {/* Patient + status */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-gray-400">{appt.dentist}</p>
          <p className="text-base font-bold text-gray-900">{appt.firstName} {appt.lastName}</p>
        </div>
        <span
          className="text-xs px-3 py-1 rounded-full font-semibold"
          style={{ background: statusInfo.bg, color: statusInfo.color }}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* ── Live Queue Board ── */}
      {queue.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Live Queue · {appt.dentist}
            </p>
            <p className="text-[10px] text-gray-300">auto-updates every min</p>
          </div>

          <div className="rounded-2xl overflow-hidden divide-y divide-gray-50 border border-gray-100">
            {queue.map((entry) => {
              const dotColor = STATUS_DOT[entry.status] ?? '#d1d5db';
              const isMe = entry.isMe;
              return (
                <div
                  key={entry.position}
                  className="flex items-center gap-3 px-4 py-3 transition-colors"
                  style={{
                    background: isMe
                      ? 'linear-gradient(90deg, rgba(255,45,143,0.06), rgba(168,85,247,0.04))'
                      : '#fff',
                    borderLeft: isMe ? `3px solid ${PINK}` : '3px solid transparent',
                  }}
                >
                  <span
                    className="text-sm font-bold w-6 text-center flex-shrink-0"
                    style={{ color: isMe ? PINK : '#9ca3af' }}
                  >
                    #{entry.position}
                  </span>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                  <span className="flex-1 text-sm" style={{ color: isMe ? '#111827' : '#6b7280', fontWeight: isMe ? 600 : 400 }}>
                    {entry.firstName}
                    {isMe && (
                      <span className="ml-1.5 text-[10px] font-medium" style={{ color: PINK }}>(You)</span>
                    )}
                  </span>
                  <span
                    className="text-[11px] font-medium capitalize"
                    style={{
                      color: entry.status === 'in-progress' ? PURPLE :
                             entry.status === 'checked-in'  ? '#10b981' : '#9ca3af',
                    }}
                  >
                    {entry.status === 'in-progress' ? '● In progress' :
                     entry.status === 'checked-in'  ? 'Waiting' : 'Scheduled'}
                  </span>
                  {isMe && entry.predictedWaitMinutes > 0 && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: 'rgba(168,85,247,0.1)', color: PURPLE }}
                    >
                      ~{entry.predictedWaitMinutes}m
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Appointment details */}
      <div className="rounded-2xl p-4 space-y-2.5 mb-5" style={{ background: '#f9fafb' }}>
        <InfoRow label="Date & Time" value={formatDateTime(appt.scheduledAt)} />
        <InfoRow label="Treatment"   value={appt.type.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())} />
        <InfoRow label="Duration"    value={`~${appt.duration} min`} />
      </div>

      {/* Check-in CTA */}
      {canCheckin && !checkedIn && (
        <div className="space-y-2 mb-4">
          <GradBtn
            onClick={() => doCheckin()}
            disabled={isCheckingIn}
            loading={isCheckingIn}
            label="✓ Check In Now"
            type="button"
          />
          <p className="text-xs text-center text-gray-400">Only tap this when you are inside the clinic.</p>
        </div>
      )}

      {(isCheckedIn || checkedIn) && (
        <div className="rounded-2xl p-4 text-center mb-4" style={{ background: 'rgba(168,85,247,0.07)', border: `1px solid rgba(168,85,247,0.2)` }}>
          <p className="text-sm font-semibold" style={{ color: PURPLE }}>You're checked in — please take a seat.</p>
          <p className="text-xs mt-1" style={{ color: '#a78bfa' }}>The staff will call your name shortly.</p>
        </div>
      )}

      {appt.status === 'in-progress' && (
        <div className="rounded-2xl p-4 text-center mb-4" style={{ background: '#ecfdf5', border: '1px solid #bbf7d0' }}>
          <p className="text-sm font-semibold text-emerald-800">You're with the dentist now.</p>
        </div>
      )}

      {appt.status === 'completed' && (
        <div className="rounded-2xl p-4 text-center mb-4" style={{ background: '#fff0f7', border: `1px solid rgba(255,45,143,0.2)` }}>
          <p className="text-sm font-semibold" style={{ color: PINK }}>Appointment Complete. Thank you!</p>
        </div>
      )}

      {/* Cancel */}
      {appt.status === 'scheduled' && !cancelDone && (
        <div className="mt-2">
          {!showCancel ? (
            <button
              onClick={() => setShowCancel(true)}
              className="w-full py-2.5 text-sm transition-colors"
              style={{ color: '#f87171' }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = '#f87171'}
            >
              Cancel Appointment
            </button>
          ) : (
            <div className="rounded-2xl p-4 space-y-3" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
              <p className="text-sm font-semibold text-red-700">Cancel this appointment?</p>
              <p className="text-xs text-red-500">This cannot be undone. You can book a new one anytime.</p>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Reason (optional)..."
                className="w-full px-3 py-2 text-sm rounded-xl resize-none outline-none"
                style={{ border: '1px solid #fecaca', background: '#fff' }}
              />
              {cancelError && (
                <p className="text-xs text-red-600">{cancelError.response?.data?.message || 'Cancellation failed.'}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowCancel(false); setCancelReason(''); }}
                  className="flex-1 py-2 text-sm text-gray-600 rounded-xl bg-white hover:bg-gray-50 border border-gray-200"
                >
                  Keep
                </button>
                <button
                  onClick={() => doCancel()}
                  disabled={isCancelling}
                  className="flex-1 py-2 text-sm font-semibold text-white rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50"
                >
                  {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(appt.status === 'cancelled' || cancelDone) && (
        <div className="rounded-2xl p-4 text-center mb-4" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <p className="text-sm font-semibold text-red-700">Appointment Cancelled</p>
          <p className="text-xs text-red-400 mt-1">You can book a new appointment below.</p>
        </div>
      )}

      <button
        onClick={() => navigate('/portal')}
        className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mt-2"
      >
        Book Another Appointment
      </button>
    </PortalShell>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-gray-400 w-24 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-700">{value}</span>
    </div>
  );
}
