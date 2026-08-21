const TONES = {
  brand: "from-brand-500 to-brand-600",
  success: "from-emerald-500 to-emerald-600",
  warning: "from-amber-400 to-amber-500",
};

const SIZES = {
  md: "h-2.5",
  lg: "h-3.5",
};

/**
 * Yüzde metni + dolan bar + alt metin.
 * `animated` true iken bara kayan çizgi deseni bindirilir; ilerleme çok yavaş
 * olduğunda bile çubuğun "canlı" olduğu görülsün diye.
 */
export default function ProgressBar({
  value = 0,
  label,
  sublabel,
  tone = "brand",
  size = "md",
  animated = false,
  className = "",
}) {
  const percent = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div className={className}>
      {(label || sublabel !== undefined) && (
        <div className="mb-2 flex items-end justify-between gap-3">
          <span className="truncate text-sm font-medium text-slate-600">{label}</span>
          <span className="shrink-0 font-mono text-2xl leading-none font-semibold tabular-nums text-slate-900">
            %{percent}
          </span>
        </div>
      )}

      <div
        className={`w-full overflow-hidden rounded-full bg-slate-200/80 ring-1 ring-inset ring-slate-900/5 ${SIZES[size] ?? SIZES.md}`}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-300 ease-out ${TONES[tone] ?? TONES.brand} ${animated ? "progress-stripes" : ""}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {sublabel && <p className="mt-2 text-xs font-medium text-slate-500">{sublabel}</p>}
    </div>
  );
}
