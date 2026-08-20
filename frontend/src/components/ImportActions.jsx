import { useState } from "react";
import Button from "./Button.jsx";
import { api } from "../api/client.js";
import { canCancel, canExport, canRetry } from "../lib/status.js";

/**
 * Import durumuna göre "tekrar dene / iptal et / GTFS olarak indir" düğmelerini gösterir.
 * Liste ve detay sayfalarının ikisinde de kullanılıyor.
 */
export default function ImportActions({ record, size = "sm", onChanged, onError }) {
  const [busy, setBusy] = useState(null);

  const run = async (kind, action) => {
    setBusy(kind);
    onError?.(null);
    try {
      const result = await action();
      if (result) onChanged?.(result);
    } catch (error) {
      onError?.(error.message);
    } finally {
      setBusy(null);
    }
  };

  const retryable = canRetry(record.status);
  const cancellable = canCancel(record.status);
  const exportable = canExport(record.status);

  if (!retryable && !cancellable && !exportable) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {retryable && (
        <Button
          size={size}
          variant="secondary"
          loading={busy === "retry"}
          disabled={busy !== null}
          onClick={() => run("retry", () => api.retryImport(record.id))}
        >
          Tekrar dene
        </Button>
      )}
      {cancellable && (
        <Button
          size={size}
          variant="secondary"
          loading={busy === "cancel"}
          disabled={busy !== null}
          onClick={() => run("cancel", () => api.cancelImport(record.id))}
        >
          İptal et
        </Button>
      )}
      {exportable && (
        <Button
          size={size}
          variant="primary"
          loading={busy === "export"}
          disabled={busy !== null}
          onClick={() => run("export", () => api.downloadExport(record.id))}
        >
          GTFS olarak indir
        </Button>
      )}
    </div>
  );
}
