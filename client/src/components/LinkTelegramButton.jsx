import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createLinkToken, getLinkStatus } from '../api/telegram.api';

const PINK = '#FF2D8F';
const PURPLE = '#A855F7';

/**
 * Shown on the patient portal after lookup / confirmation.
 * Renders "Link Telegram" if not linked; otherwise a green pill "Linked ✓".
 *
 * Props:
 *   ic (string, required) — patient IC number
 */
export default function LinkTelegramButton({ ic }) {
  const [openedLink, setOpenedLink] = useState(false);

  const { data: statusData, refetch } = useQuery({
    queryKey: ['telegram-status', ic],
    queryFn: () => getLinkStatus(ic),
    select: (r) => r.data.data,
    enabled: !!ic,
    refetchInterval: openedLink ? 4000 : false,
  });

  const { mutate, isPending, data: linkData, error } = useMutation({
    mutationFn: () => createLinkToken(ic),
    onSuccess: (r) => {
      const deepLink = r.data.data.deepLink;
      window.open(deepLink, '_blank');
      setOpenedLink(true);
    },
  });

  const linked = statusData?.linked;

  if (linked) {
    return (
      <div
        className="flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 mb-3"
        style={{ background: '#ecfdf5', border: '1px solid #bbf7d0' }}
      >
        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-sm font-semibold text-emerald-800">Telegram linked — you'll get reminders</span>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <button
        onClick={() => mutate()}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold text-white transition-opacity"
        style={{
          background: `linear-gradient(90deg, ${PINK}, ${PURPLE})`,
          opacity: isPending ? 0.6 : 1,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
        </svg>
        {isPending ? 'Opening Telegram…' : 'Link Telegram for updates'}
      </button>

      {openedLink && (
        <p className="text-[11px] text-center text-gray-500 mt-2">
          Tap <b>Start</b> in Telegram to complete linking, then come back here.
        </p>
      )}

      {error && (
        <p className="text-[11px] text-center text-red-500 mt-2">
          {error.response?.data?.message || 'Could not create link. Try again.'}
        </p>
      )}
    </div>
  );
}
