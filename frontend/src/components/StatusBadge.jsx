import Spinner from "./Spinner.jsx";
import { STATUS_META } from "../lib/status.js";

export default function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? {
    label: status ?? "bilinmiyor",
    className: "bg-slate-100 text-slate-700 ring-slate-300",
    dotClassName: "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${meta.className}`}
      title={status}
    >
      {meta.spinner ? (
        <Spinner className="h-3 w-3" />
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClassName}`} />
      )}
      {meta.label}
    </span>
  );
}
