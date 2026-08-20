const TONES = {
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-900",
  info: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-green-200 bg-green-50 text-green-800",
};

export default function Alert({ tone = "info", title, children, className = "" }) {
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${TONES[tone]} ${className}`}>
      {title && <p className="font-medium">{title}</p>}
      {children && <div className={title ? "mt-1 break-words" : "break-words"}>{children}</div>}
    </div>
  );
}
