import {
  CHUNK_RESPONSE_TIMEOUT_MS,
  CHUNK_STALL_TIMEOUT_MS,
  CHUNK_TIMEOUT_MS,
  COMPLETE_TIMEOUT_MS,
  REQUEST_TIMEOUT_MS,
  formatBytes,
  uploadLog,
} from "../lib/upload.js";

const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

/** Sonundaki eğik çizgileri temizlenmiş API adresi. */
export const API_BASE = RAW_BASE.replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function readErrorDetail(response) {
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") return body.detail;
    // FastAPI doğrulama hataları: detail bir dizi
    if (Array.isArray(body?.detail)) {
      return body.detail.map((item) => item.msg ?? JSON.stringify(item)).join(" · ");
    }
    return JSON.stringify(body);
  } catch {
    return `${response.status} ${response.statusText}`.trim();
  }
}

async function request(path, options = {}) {
  const { timeoutMs, ...init } = options;
  if (timeoutMs && !init.signal) init.signal = AbortSignal.timeout(timeoutMs);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch (error) {
    if (error?.name === "TimeoutError") {
      throw new ApiError("İstek zaman aşımına uğradı; bağlantı çok yavaş olabilir.", 0);
    }
    if (error?.name === "AbortError") {
      throw new ApiError("İstek iptal edildi.", 0);
    }
    throw new ApiError(`API'ye ulaşılamadı (${API_BASE}). Backend çalışıyor mu?`, 0);
  }

  if (!response.ok) {
    throw new ApiError(await readErrorDetail(response), response.status);
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json") ? response.json() : response.text();
}

/**
 * Backend'in liste uçları kayıt yokken 404 döndürüyor (boş dizi değil).
 * Arayüz açısından bu "veri yok" demek, o yüzden boş diziye çeviriyoruz.
 */
async function requestList(path) {
  try {
    return await request(path);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return [];
    throw error;
  }
}

/** XHR yanıtları için `readErrorDetail`in senkron karşılığı. */
function parseErrorText(text, status, statusText) {
  try {
    const body = JSON.parse(text);
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) {
      return body.detail.map((item) => item.msg ?? JSON.stringify(item)).join(" · ");
    }
  } catch {
    /* JSON değilse aşağıdaki genel mesaja düşer */
  }
  return `${status} ${statusText ?? ""}`.trim();
}

function queryString(params) {
  if (!params) return "";
  const search = new URLSearchParams(params).toString();
  return search ? `?${search}` : "";
}

export const api = {
  listImports: () => request("/import_gtfs/"),

  getImport: (importId) => request(`/import_gtfs/${importId}`),

  /** Tek istekte yükleme (klasik uç). Arayüz artık parçalı akışı kullanıyor. */
  uploadImport: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return request("/import_gtfs/", { method: "POST", body: formData });
  },

  // --- Parçalı (resumable) yükleme -------------------------------------------------

  /** Yeni bir upload session açar; { session_id } döner. */
  initUpload: (filename, totalChunks) =>
    request(`/import_gtfs/uploads/init${queryString({ filename, total_chunks: totalChunks })}`, {
      method: "POST",
      timeoutMs: REQUEST_TIMEOUT_MS,
    }),

  /**
   * Tek bir parçayı gönderir; { received_chunks, total_chunks } döner.
   *
   * fetch yerine XHR: yalnız XHR `upload.onprogress` veriyor. Tek parçalık (5 MB'tan
   * küçük) dosyalarda ilerleme çubuğunun 0'dan 100'e sıçramaması için parça içindeki
   * bayt ilerlemesi de `onProgress(loaded, total)` ile bildiriliyor.
   */
  uploadChunk: (sessionId, chunkNumber, blob, filename, { onProgress, signal, totalChunks } = {}) =>
    new Promise((resolve, reject) => {
      const label = `parça ${chunkNumber}${totalChunks ? `/${totalChunks}` : ""}`;
      const startedAt = Date.now();
      const xhr = new XMLHttpRequest();

      let timer = null;
      let abortReason = null;

      const clearTimer = () => {
        if (timer) clearTimeout(timer);
        timer = null;
      };

      /** İlerleme durursa isteği iptal et: kopan bağlantı böyle saniyeler içinde fark ediliyor. */
      const armStallTimer = () => {
        clearTimer();
        timer = setTimeout(() => {
          abortReason = "stall";
          uploadLog.error(
            `${label}: ${CHUNK_STALL_TIMEOUT_MS / 1000} sn boyunca hiç veri gitmedi, istek iptal ediliyor`
          );
          xhr.abort();
        }, CHUNK_STALL_TIMEOUT_MS);
      };

      /** Gövde gitti, sunucunun yanıtı bekleniyor (bu sırada progress olayı gelmez). */
      const armResponseTimer = () => {
        clearTimer();
        timer = setTimeout(() => {
          abortReason = "response";
          uploadLog.error(`${label}: gövde gitti ama sunucudan yanıt gelmedi, istek iptal ediliyor`);
          xhr.abort();
        }, CHUNK_RESPONSE_TIMEOUT_MS);
      };

      const onExternalAbort = () => {
        abortReason = signal?.reason === "offline" ? "offline" : "external";
        xhr.abort();
      };
      signal?.addEventListener("abort", onExternalAbort);

      const settle = (fn) => (value) => {
        clearTimer();
        signal?.removeEventListener("abort", onExternalAbort);
        fn(value);
      };
      const succeed = settle(resolve);
      const fail = settle(reject);

      xhr.open("POST", `${API_BASE}/import_gtfs/uploads/${sessionId}/chunk/${chunkNumber}`);
      xhr.timeout = CHUNK_TIMEOUT_MS;

      xhr.upload.onprogress = (event) => {
        armStallTimer();
        if (event.lengthComputable) onProgress?.(event.loaded, event.total);
      };
      xhr.upload.onload = () => armResponseTimer();

      xhr.onload = () => {
        const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        if (xhr.status >= 200 && xhr.status < 300) {
          let body = null;
          try {
            body = JSON.parse(xhr.responseText);
          } catch {
            /* gövde JSON değilse çağıran taraf kendi sayacına düşer */
          }
          uploadLog.ok(
            `${label} yüklendi (${formatBytes(blob.size)}, ${seconds} sn) — sunucuda ${
              body?.received_chunks?.length ?? "?"
            }/${body?.total_chunks ?? totalChunks ?? "?"} parça var`
          );
          succeed(body);
          return;
        }
        const detail = parseErrorText(xhr.responseText, xhr.status, xhr.statusText);
        uploadLog.error(`${label} reddedildi (HTTP ${xhr.status}): ${detail}`);
        fail(new ApiError(detail, xhr.status));
      };

      xhr.onerror = () => {
        uploadLog.error(`${label}: ağ hatası (sunucuya ulaşılamadı)`);
        fail(new ApiError(`API'ye ulaşılamadı (${API_BASE}). Bağlantınızı kontrol edin.`, 0));
      };

      xhr.ontimeout = () => {
        uploadLog.error(`${label}: ${CHUNK_TIMEOUT_MS / 1000} sn üst sınırı aşıldı`);
        fail(new ApiError("Parça yüklenirken zaman aşımı oldu; bağlantı çok yavaş olabilir.", 0));
      };

      xhr.onabort = () => {
        const messages = {
          stall: `Bağlantı koptu: ${CHUNK_STALL_TIMEOUT_MS / 1000} saniye boyunca veri gönderilemedi.`,
          response: "Parça gönderildi ama sunucudan yanıt alınamadı; bağlantı kopmuş olabilir.",
          offline: "İnternet bağlantısı kesildi.",
          external: "Parça yüklemesi iptal edildi.",
        };
        fail(new ApiError(messages[abortReason] ?? messages.external, 0));
      };

      const formData = new FormData();
      // UploadFile olarak parse edilebilmesi için parçaya da bir dosya adı veriyoruz.
      formData.append("file", blob, `${filename}.part${chunkNumber}`);
      uploadLog.info(`${label} gönderiliyor (${formatBytes(blob.size)})`);
      armStallTimer();
      xhr.send(formData);
    }),

  /** Session durumu; süresi dolmuşsa 404 (ApiError.status === 404) fırlatır. */
  uploadStatus: (sessionId) =>
    request(`/import_gtfs/uploads/${sessionId}/status`, { timeoutMs: REQUEST_TIMEOUT_MS }),

  /** Parçaları birleştirip normal import akışını başlatır; ImportResponse döner. */
  completeUpload: (sessionId) =>
    request(`/import_gtfs/uploads/${sessionId}/complete`, {
      method: "POST",
      timeoutMs: COMPLETE_TIMEOUT_MS,
    }),

  // ---------------------------------------------------------------------------------

  retryImport: (importId) => request(`/import_gtfs/${importId}/retry`, { method: "POST" }),

  cancelImport: (importId) => request(`/import_gtfs/${importId}/cancel`, { method: "POST" }),

  listResource: (importId, resource, params) =>
    requestList(`/import_gtfs/${importId}/${resource}${queryString(params)}`),

  updateResource: (importId, resource, rowId, body) =>
    request(`/import_gtfs/${importId}/${resource}/${rowId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  deleteResource: (importId, resource, rowId) =>
    request(`/import_gtfs/${importId}/${resource}/${rowId}`, { method: "DELETE" }),

  streamUrl: (importId) => `${API_BASE}/import_gtfs/${importId}/stream`,

  /** Export ZIP'ini indirir; hatayı okuyabilmek için <a> yerine fetch + blob kullanıyoruz. */
  downloadExport: async (importId) => {
    let response;
    try {
      response = await fetch(`${API_BASE}/import_gtfs/${importId}/export`);
    } catch {
      throw new ApiError(`API'ye ulaşılamadı (${API_BASE}). Backend çalışıyor mu?`, 0);
    }
    if (!response.ok) {
      throw new ApiError(await readErrorDetail(response), response.status);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `gtfs_export_${importId}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  },
};
