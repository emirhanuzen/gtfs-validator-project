/**
 * Boş durumlar için ortak görsel: yumuşak bir ikon rozeti, başlık, açıklama
 * ve isteğe bağlı eylem alanı.
 */
export default function EmptyState({ icon, title, description, action, className = "" }) {
  return (
    <div className={`flex flex-col items-center px-6 py-14 text-center ${className}`}>
      <div className="relative">
        <div
          className="absolute inset-0 -z-10 rounded-full bg-brand-200/40 blur-xl"
          aria-hidden="true"
        />
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-brand-600 shadow-card ring-1 ring-slate-900/5">
          {icon ?? <BoxIcon />}
        </div>
      </div>

      <p className="mt-5 text-base font-semibold text-slate-800">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function BoxIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.25 7.5 12 3.75 3.75 7.5m16.5 0L12 11.25M20.25 7.5v9L12 20.25m0-9L3.75 7.5m8.25 3.75v9m0 0L3.75 16.5v-9" />
    </svg>
  );
}
