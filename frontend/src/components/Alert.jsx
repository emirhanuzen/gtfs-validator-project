const TONES = {
  error: {
    box: "border-red-200 bg-red-50 text-red-800",
    icon: "text-red-500",
    path: "M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z",
  },
  warning: {
    box: "border-amber-200 bg-amber-50 text-amber-900",
    icon: "text-amber-500",
    path: "M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z",
  },
  info: {
    box: "border-slate-200 bg-slate-50 text-slate-700",
    icon: "text-slate-400",
    path: "M12 16v-4m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  },
  success: {
    box: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: "text-emerald-500",
    path: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  },
};

export default function Alert({ tone = "info", title, children, className = "" }) {
  const meta = TONES[tone] ?? TONES.info;

  return (
    <div
      className={`flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${meta.box} ${className}`}
      // hata ve uyarılar ekran okuyucuya da duyurulsun
      role={tone === "error" || tone === "warning" ? "alert" : undefined}
    >
      <svg
        className={`mt-px h-[1.125rem] w-[1.125rem] shrink-0 ${meta.icon}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={meta.path} />
      </svg>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-1 break-words" : "break-words"}>{children}</div>}
      </div>
    </div>
  );
}
