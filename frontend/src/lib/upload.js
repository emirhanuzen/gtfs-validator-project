/**
 * Parçalı (resumable) yükleme için sabitler ve localStorage yardımcıları.
 *
 * Backend akışı:
 *   POST /import_gtfs/uploads/init?filename=&total_chunks=   -> { session_id }
 *   POST /import_gtfs/uploads/{id}/chunk/{n}  (multipart)    -> { received_chunks, total_chunks }
 *   GET  /import_gtfs/uploads/{id}/status                    -> { filename, total_chunks, received_chunks }
 *   POST /import_gtfs/uploads/{id}/complete                  -> ImportResponse
 */

/** Parça boyutu. Backend tarafında bir sınır yok; ağ hatasında kaybedilen iş miktarını belirler. */
export const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB

/** Session'lar Redis'te 30 dakika TTL ile tutuluyor (app/services/upload_session.py). */
export const UPLOAD_SESSION_TTL_MS = 30 * 60 * 1000;

/**
 * Zaman aşımları.
 *
 * Asıl "bağlantı koptu" dedektörü CHUNK_STALL_TIMEOUT_MS: 10 saniye boyunca tek bayt
 * ilerlemezse istek iptal edilir. Sabit bir toplam süre sınırı yerine bunu kullanmak
 * önemli — yavaş ama çalışan bir bağlantıda 5 MB'lık parça dakikalar sürebilir ve
 * kısa bir toplam sınır bunu haksız yere keserdi.
 */
export const CHUNK_STALL_TIMEOUT_MS = 10 * 1000;

/** Parçanın gövdesi gitti ama sunucu yanıtı gelmiyorsa beklenecek süre. */
export const CHUNK_RESPONSE_TIMEOUT_MS = 30 * 1000;

/** Tek bir parça isteği için mutlak üst sınır. */
export const CHUNK_TIMEOUT_MS = 120 * 1000;

/** init ve status gibi küçük istekler için üst sınır. */
export const REQUEST_TIMEOUT_MS = 15 * 1000;

/** complete: sunucu tarafında birleştirme + sağlama + MinIO yüklemesi var, daha cömert. */
export const COMPLETE_TIMEOUT_MS = 90 * 1000;

/**
 * Yükleme akışının konsol günlüğü. Her parçanın başarılı/başarısız olduğu
 * DevTools > Console'da "[upload]" ön ekiyle görünür.
 */
const LOG_STYLE = "color:#2451e0;font-weight:600";

export const uploadLog = {
  info: (message, ...rest) => console.log(`%c[upload]%c ${message}`, LOG_STYLE, "", ...rest),
  ok: (message, ...rest) =>
    console.log(`%c[upload]%c ✓ ${message}`, LOG_STYLE, "color:#047857", ...rest),
  warn: (message, ...rest) => console.warn(`[upload] ${message}`, ...rest),
  error: (message, ...rest) => console.error(`[upload] ✗ ${message}`, ...rest),
};

const STORAGE_KEY = "gtfs.upload.pending";

/** Dosya boyutundan toplam parça sayısı (0 byte dosya bile 1 parça sayılır). */
export function chunkCount(fileSize) {
  return Math.max(1, Math.ceil(fileSize / CHUNK_SIZE));
}

/** n. parçanın (1'den başlar) dosya içindeki dilimi. */
export function sliceChunk(file, chunkNumber) {
  const start = (chunkNumber - 1) * CHUNK_SIZE;
  return file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

/** Session'ın (yerel saate göre) ne kadar ömrü kaldı — dakika cinsinden, negatif olabilir. */
export function remainingMinutes(pending) {
  if (!pending?.startedAt) return null;
  return Math.round((pending.startedAt + UPLOAD_SESSION_TTL_MS - Date.now()) / 60000);
}

export function isLocallyExpired(pending) {
  const remaining = remainingMinutes(pending);
  return remaining !== null && remaining <= 0;
}

/**
 * Yarım kalan yüklemeyi okur. Sayfa yenilense/kapatılsa bile session_id burada durur;
 * File nesnesi saklanamadığı için devam ederken kullanıcıdan aynı dosya tekrar istenir.
 */
export function readPendingUpload() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.sessionId || !parsed?.totalChunks) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePendingUpload(pending) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    uploadLog.info(`localStorage["${STORAGE_KEY}"] yazıldı`, pending);
  } catch {
    uploadLog.warn(`localStorage'a yazılamadı (özel sekme?); yükleme sürüyor ama devam ettirilemez`);
  }
}

export function clearPendingUpload() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    uploadLog.info(`localStorage["${STORAGE_KEY}"] temizlendi`);
  } catch {
    /* yoksay */
  }
}
