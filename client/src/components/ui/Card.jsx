export default function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
