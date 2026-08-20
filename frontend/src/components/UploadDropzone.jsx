import { useRef, useState } from "react";
import Spinner from "./Spinner.jsx";
import Alert from "./Alert.jsx";

export default function UploadDropzone({ onUpload, uploading }) {
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
    onUpload(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (uploading) return;
    handleFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!uploading) inputRef.current?.click();
          }
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          dragging ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-white hover:bg-slate-50"
        } ${uploading ? "cursor-wait opacity-70" : ""}`}
      >
        {uploading ? (
          <>
            <Spinner className="h-6 w-6 text-blue-600" />
            <p className="mt-3 text-sm font-medium text-slate-700">Dosya yükleniyor…</p>
          </>
        ) : (
          <>
            <svg
              className="h-8 w-8 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V4.5m0 0L7.5 9M12 4.5 16.5 9M4.5 16.5v1.75A2.25 2.25 0 0 0 6.75 20.5h10.5a2.25 2.25 0 0 0 2.25-2.25V16.5"
              />
            </svg>
            <p className="mt-3 text-sm font-medium text-slate-700">
              GTFS ZIP dosyasını buraya sürükleyin
            </p>
            <p className="mt-1 text-xs text-slate-500">
              veya tıklayıp bilgisayarınızdan seçin (.zip)
            </p>
          </>
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
