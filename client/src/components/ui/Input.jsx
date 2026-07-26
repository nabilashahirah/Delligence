export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      )}
      <input
        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-gray-900 outline-none
          transition-all placeholder:text-gray-300
          ${error
            ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-400/20'
            : 'border-gray-200 focus:border-[#FF2D8F] focus:ring-2 focus:ring-[#FF2D8F]/15'}
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
