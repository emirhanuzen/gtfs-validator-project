export const STATUS_META = {
  uploaded: {
    label: "Yüklendi",
    className: "bg-slate-100 text-slate-700 ring-slate-300",
    dotClassName: "bg-slate-400",
  },
  queued: {
    label: "Kuyrukta",
    className: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    dotClassName: "bg-indigo-500",
  },
  processing: {
    label: "İşleniyor",
    className: "bg-brand-50 text-brand-700 ring-brand-200",
    dotClassName: "bg-brand-500",
    spinner: true,
  },
  completed: {
    label: "Tamamlandı",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dotClassName: "bg-emerald-500",
  },
  completed_with_warnings: {
    label: "Uyarılarla tamamlandı",
    className: "bg-amber-50 text-amber-800 ring-amber-300",
    dotClassName: "bg-amber-500",
  },
  failed: {
    label: "Başarısız",
    className: "bg-red-50 text-red-700 ring-red-200",
    dotClassName: "bg-red-500",
  },
};

export const TERMINAL_STATUSES = ["completed", "completed_with_warnings", "failed"];

export const isTerminal = (status) => TERMINAL_STATUSES.includes(status);

/** Backend sadece failed durumundaki import'ları tekrar çalıştırıyor. */
export const canRetry = (status) => status === "failed";

/** Backend sadece henüz işlenmemiş (uploaded/queued) import'ları iptal ediyor. */
export const canCancel = (status) => status === "uploaded" || status === "queued";

/** Veri veritabanına yazıldığı için uyarılı tamamlananlar da dışa aktarılabiliyor. */
export const canExport = (status) => status === "completed" || status === "completed_with_warnings";
