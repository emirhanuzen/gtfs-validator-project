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
    className: "bg-blue-50 text-blue-700 ring-blue-200",
    dotClassName: "bg-blue-500",
    spinner: true,
  },
  completed: {
    label: "Tamamlandı",
    className: "bg-green-50 text-green-700 ring-green-200",
    dotClassName: "bg-green-500",
  },
  completed_with_warnings: {
    label: "Uyarılarla tamamlandı",
    className: "bg-yellow-50 text-yellow-800 ring-yellow-300",
    dotClassName: "bg-yellow-500",
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
