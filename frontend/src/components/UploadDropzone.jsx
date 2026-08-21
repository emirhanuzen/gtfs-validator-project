import { useRef, useState } from "react";
import Alert from "./Alert.jsx";

/**
 * ZIP seçme / sürükle-bırak alanı. Yükleme ilerlemesi UploadPanel'de gösterildiği
 * için burada sadece dosya seçimi ve .zip doğrulaması var.
 */
export default function UploadDropzone({ onSelect, disabled = false, hint }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleFile = (file) => {
    setLocalError(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setLocalError("Sadece .zip uzantılı GTFS dosyaları yüklenebilir.");
      return;
    }
    onSelect(file);
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (disabled) return;
          handleFile(event.dataTransfer.files?.[0]);
        }}
        onClick={openPicker}
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPicker();
          }
        }}
        className={`group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
          dragging
            ? "border-brand-400 bg-brand-50/80 shadow-card"
            : "border-slate-300 bg-white/70 hover:border-brand-300 hover:bg-white hover:shadow-card"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <div
          className={`grid h-12 w-12 place-items-center rounded-xl transition-all duration-200 ${
            dragging
              ? "scale-110 bg-brand-600 text-white"
              : "bg-brand-50 text-brand-600 group-hover:scale-105 group-hover:bg-brand-100"
          }`}
        >
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 16.5V4.5m0 0L7.5 9M12 4.5 16.5 9M4.5 16.5v1.75A2.25 2.25 0 0 0 6.75 20.5h10.5a2.25 2.25 0 0 0 2.25-2.25V16.5" />
          </svg>
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-800">
          GTFS ZIP dosyasını buraya sürükleyin
        </p>
        <p className="mt-1 text-sm text-slate-500">
          veya <span className="font-medium text-brand-600">tıklayıp seçin</span>
        </p>

        {hint?.length > 0 && (
          // Dikkat çekmeyen bir dipnot: kutucuk yok, ince ayraç + soluk ikonlu satır.
          <div className="mt-5 w-full max-w-md border-t border-slate-200/70 pt-3.5">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
              {hint.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5">
                  <HintIcon name={item.icon} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>

      {localError && (
        <Alert tone="error" className="mt-3">
          {localError}
        </Alert>
      )}
    </div>
  );
}

const HINT_ICONS = {
  // dosya
  file: { d: "M8 3.75h4.6a1.5 1.5 0 0 1 1.06.44l3.15 3.15a1.5 1.5 0 0 1 .44 1.06V19a1.25 1.25 0 0 1-1.25 1.25H8A1.25 1.25 0 0 1 6.75 19V5A1.25 1.25 0 0 1 8 3.75ZM12.6 4.1v4.15h4.15", width: 1.6 },
  // parçalar
  chunks: { d: "M4 12h3.6M10.2 12h3.6M16.4 12H20", width: 2.4 },
  // kaldığı yerden devam
  resume: { d: "M19.75 12a7.75 7.75 0 1 1-2.27-5.48M18.9 3.4v3.4h-3.4", width: 1.7 },
};

function HintIcon({ name }) {
  const icon = HINT_ICONS[name];
  if (!icon) return null;
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-slate-300"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={icon.width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={icon.d} />
    </svg>
  );
}
