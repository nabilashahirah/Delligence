const colors = {
  scheduled:    'bg-blue-50 text-blue-600',
  'checked-in': 'bg-amber-50 text-amber-600',
  'in-progress':'bg-[#F3E8FF] text-[#A855F7]',
  completed:    'bg-emerald-50 text-emerald-600',
  cancelled:    'bg-gray-100 text-gray-400',
  'no-show':    'bg-red-50 text-red-500',
  admin:        'bg-[#FFE9F2] text-[#FF2D8F]',
  dentist:      'bg-blue-50 text-blue-600',
  receptionist: 'bg-gray-100 text-gray-500',
};

export default function Badge({ label, status }) {
  const text = label || status;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize
      ${colors[status] || 'bg-gray-100 text-gray-500'}`}>
      {text}
    </span>
  );
}
