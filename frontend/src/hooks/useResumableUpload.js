import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "../api/client.js";
import {
  chunkCount,
  clearPendingUpload,
  formatBytes,
  isLocallyExpired,
  readPendingUpload,
  sliceChunk,
  uploadLog,
  writePendingUpload,
} from "../lib/upload.js";

/** Tamamlanan yüklemede kartın "%100" halinde ekranda kaldığı süre. */
const DONE_HOLD_MS = 1400;

/**
 * /uploads/{id}/complete ucunun `response_model`'i yok ve `db.commit()` sonrası
 * expire olmuş ORM nesnesini döndürüyor; bu yüzden gövde çoğu zaman boş (`{}`) geliyor.
 * İçe aktarma kaydı gerçekte oluşuyor, o yüzden id'yi listeden yakalıyoruz.
 */
async function completeAndResolve(session) {
  const record = await api.completeUpload(session.sessionId);
  if (record?.id) return record;

  try {
    const list = await api.listImports();
    const matching = list.filter((item) => item.file_name === session.filename);
    const pool = matching.length > 0 ? matching : list;
    return pool.reduce((best, item) => (!best || item.id > best.id ? item : best), null);
  } catch {
    // Kayıt oluştu ama id'yi öğrenemedik; çağıran taraf listeyi tazelemekle yetinir.
    return null;
  }
}

/**
 * Parçalı yükleme durum makinesi.
 *
 * phase:
 *   idle       – yüklenecek dosya bekleniyor
 *   starting   – /uploads/init çağrısı sürüyor
 *   uploading  – parçalar sırayla gidiyor
 *   completing – /uploads/complete çağrısı sürüyor
 *   paused     – hata ya da kullanıcı isteğiyle durdu (devam edilebilir)
 *   expired    – session'ın 30 dakikalık ömrü doldu, baştan başlamak gerekiyor
 *   done       – import kaydı oluştu
 *
 * Parçalar bilerek SIRAYLA gönderiliyor: backend received_chunks listesini
 * "oku - değiştir - yaz" biçiminde güncellediği için paralel istekler
 * birbirinin kaydını ezerdi.
 */
export function useResumableUpload({ onCompleted } = {}) {
  const [phase, setPhase] = useState("idle");
  const [pending, setPending] = useState(null); // { sessionId, filename, totalChunks, fileSize, startedAt }
  const [receivedChunks, setReceivedChunks] = useState([]);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [restoring, setRestoring] = useState(false);
  // O an gönderilmekte olan parçanın tamamlanma oranı (0–1). Tek parçalık
  // dosyalarda ilerleme çubuğunun tek adımda sıçramaması için gerekiyor.
  const [chunkProgress, setChunkProgress] = useState(0);
  const [online, setOnline] = useState(() => window.navigator.onLine);

  const pendingRef = useRef(null);
  pendingRef.current = pending;
  const fileRef = useRef(null);
  fileRef.current = file;
  const stopRef = useRef(false);
  const abortRef = useRef(null);
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;

  /**
   * Tarayıcı çevrimdışına düşerse bekleyen parçayı hemen iptal et. Aksi halde
   * kopan bağlantı ancak durma (stall) zamanlayıcısıyla, saniyeler sonra anlaşılır.
   */
  useEffect(() => {
    const onOffline = () => {
      setOnline(false);
      if (!abortRef.current) return;
      uploadLog.warn("tarayıcı çevrimdışı oldu, bekleyen parça iptal ediliyor");
      abortRef.current.abort("offline");
    };
    const onOnline = () => {
      setOnline(true);
      uploadLog.info("bağlantı geri geldi");
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const expire = useCallback(() => {
    clearPendingUpload();
    stopRef.current = true;
    setPending(null);
    setFile(null);
    setReceivedChunks([]);
    setError(null);
    setPhase("expired");
  }, []);

  /** Sayfa açılışında yarım kalan bir yükleme varsa durumunu backend'den tazele. */
  useEffect(() => {
    const stored = readPendingUpload();
    if (!stored) return undefined;

    if (isLocallyExpired(stored)) {
      clearPendingUpload();
      setPhase("expired");
      return undefined;
    }

    let alive = true;
    setPending(stored);
    setPhase("paused");
    setRestoring(true);

    (async () => {
      try {
        const status = await api.uploadStatus(stored.sessionId);
        if (!alive) return;
        setPending({
          ...stored,
          filename: status.filename ?? stored.filename,
          totalChunks: status.total_chunks ?? stored.totalChunks,
        });
        setReceivedChunks(status.received_chunks ?? []);
      } catch (statusError) {
        if (!alive) return;
        if (statusError instanceof ApiError && statusError.status === 404) {
          expire();
        } else {
          setError(statusError.message);
        }
      } finally {
        if (alive) setRestoring(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [expire]);

  /** Eksik parçaları sırayla gönderir, hepsi bitince complete çağırır. */
  const pump = useCallback(
    async (activeFile, session, alreadyReceived) => {
      stopRef.current = false;
      setError(null);
      setPhase("uploading");

      let done = new Set(alreadyReceived);
      setReceivedChunks([...done]);
      setChunkProgress(0);

      try {
        for (let chunkNumber = 1; chunkNumber <= session.totalChunks; chunkNumber += 1) {
          if (stopRef.current) {
            setChunkProgress(0);
            setPhase("paused");
            return;
          }
          if (done.has(chunkNumber)) {
            uploadLog.info(`parça ${chunkNumber}/${session.totalChunks} zaten sunucuda, atlanıyor`);
            continue;
          }

          const controller = new AbortController();
          abortRef.current = controller;
          try {
            const result = await api.uploadChunk(
              session.sessionId,
              chunkNumber,
              sliceChunk(activeFile, chunkNumber),
              session.filename,
              {
                signal: controller.signal,
                totalChunks: session.totalChunks,
                onProgress: (loaded, total) => setChunkProgress(total > 0 ? loaded / total : 0),
              }
            );
            done = new Set(result?.received_chunks ?? [...done, chunkNumber]);
          } finally {
            abortRef.current = null;
          }

          setChunkProgress(0);
          setReceivedChunks([...done]);
        }

        setPhase("completing");
        uploadLog.info("bütün parçalar gitti, complete çağrılıyor…");
        const record = await completeAndResolve(session);
        uploadLog.ok(`içe aktarma oluştu${record?.id ? ` (no: ${record.id})` : ""}`);
        clearPendingUpload();
        setFile(null);
        setPhase("done");
        // Kart bir an "%100 tamamlandı" halinde görünsün diye pending korunuyor;
        // yönlendirme kısa bir bekleme sonrası yapılıyor.
        await new Promise((resolve) => setTimeout(resolve, DONE_HOLD_MS));
        onCompletedRef.current?.(record);
        setPending(null);
        setPhase("idle");
      } catch (uploadError) {
        setChunkProgress(0);
        if (uploadError instanceof ApiError && uploadError.status === 404) {
          uploadLog.error("session bulunamadı (404) — süresi dolmuş");
          expire();
          return;
        }
        uploadLog.error(`yükleme durdu: ${uploadError.message}`);
        uploadLog.info('devam etmek için karttaki "Devam et" düğmesine basın');
        setError(uploadError.message);
        setPhase("paused");
      }
    },
    [expire]
  );

  /** Yeni bir yükleme başlatır: parçalara böl, init, parçaları gönder. */
  const start = useCallback(
    async (selectedFile) => {
      const totalChunks = chunkCount(selectedFile.size);
      setFile(selectedFile);
      setReceivedChunks([]);
      setError(null);
      setPhase("starting");

      uploadLog.info(
        `"${selectedFile.name}" (${formatBytes(selectedFile.size)}) ${totalChunks} parçaya bölündü, init çağrılıyor…`
      );

      let sessionId;
      try {
        const response = await api.initUpload(selectedFile.name, totalChunks);
        sessionId = response?.session_id;
        if (!sessionId) throw new ApiError("Backend session_id döndürmedi.", 0);
        uploadLog.ok(`session açıldı: ${sessionId}`);
      } catch (initError) {
        uploadLog.error(`init başarısız: ${initError.message}`);
        setError(initError.message);
        setPhase("idle");
        return;
      }

      const session = {
        sessionId,
        filename: selectedFile.name,
        totalChunks,
        fileSize: selectedFile.size,
        startedAt: Date.now(),
      };
      // session_id hemen saklanıyor: ilk parça bile gitmeden bağlantı kopabilir.
      writePendingUpload(session);
      setPending(session);

      await pump(selectedFile, session, []);
    },
    [pump]
  );

  /**
   * Yarım kalan yüklemeye devam eder. Önce /status ile hangi parçaların
   * ulaştığını sorar, sadece eksikleri gönderir.
   */
  const resume = useCallback(
    async (selectedFile) => {
      const session = pendingRef.current;
      if (!session) return;

      const activeFile = selectedFile ?? fileRef.current;
      if (!activeFile) {
        setError("Devam etmek için aynı dosyayı yeniden seçin.");
        return;
      }
      if (
        activeFile.name !== session.filename ||
        chunkCount(activeFile.size) !== session.totalChunks
      ) {
        setError(
          `Seçtiğiniz dosya yarım kalan yüklemeyle uyuşmuyor. Beklenen dosya: ${session.filename}`
        );
        return;
      }

      setFile(activeFile);
      setError(null);
      setPhase("uploading");

      uploadLog.info(`devam ediliyor, status sorgulanıyor: ${session.sessionId}`);

      let status;
      try {
        status = await api.uploadStatus(session.sessionId);
        const received = status.received_chunks ?? [];
        const missing = Array.from({ length: status.total_chunks ?? 0 }, (_, i) => i + 1).filter(
          (n) => !received.includes(n)
        );
        uploadLog.ok(
          `status: ${received.length}/${status.total_chunks} parça sunucuda — eksikler: [${missing.join(", ")}]`
        );
      } catch (statusError) {
        if (statusError instanceof ApiError && statusError.status === 404) {
          uploadLog.error("status 404 — session süresi dolmuş, baştan başlamak gerekiyor");
          expire();
          return;
        }
        uploadLog.error(`status alınamadı: ${statusError.message}`);
        setError(statusError.message);
        setPhase("paused");
        return;
      }

      const refreshed = { ...session, totalChunks: status.total_chunks ?? session.totalChunks };
      setPending(refreshed);
      await pump(activeFile, refreshed, status.received_chunks ?? []);
    },
    [expire, pump]
  );

  /** Sıradaki parçadan önce durur; session ve gönderilmiş parçalar korunur. */
  const pause = useCallback(() => {
    stopRef.current = true;
  }, []);

  /** Yüklemeyi tamamen bırakır (localStorage temizlenir, backend session TTL ile düşer). */
  const discard = useCallback(() => {
    stopRef.current = true;
    clearPendingUpload();
    setPending(null);
    setFile(null);
    setReceivedChunks([]);
    setError(null);
    setPhase("idle");
  }, []);

  /** "Oturum süresi doldu" uyarısını kapatır. */
  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
  }, []);

  // init tamamlanmadan da (phase "starting") kart dolu görünsün diye seçilen
  // dosyadan türetilen değerlere düşüyoruz.
  const totalChunks = pending?.totalChunks ?? (file ? chunkCount(file.size) : 0);
  const filename = pending?.filename ?? file?.name ?? null;
  const fileSize = pending?.fileSize ?? file?.size ?? null;
  const uploadedChunks = receivedChunks.length;

  const busy = phase === "starting" || phase === "uploading" || phase === "completing";
  // Baytlar gitse de parça, backend onaylayana kadar "yüklendi" sayılmıyor:
  // aksi halde tek parçalık dosyalarda "%100 · 0/1 parça yüklendi" gibi
  // çelişkili bir görüntü çıkıyor.
  const rawPercent =
    totalChunks > 0 ? ((uploadedChunks + Math.min(chunkProgress, 0.99)) / totalChunks) * 100 : 0;
  // complete/done aşamasında bütün parçalar gitmiş demektir.
  const percent =
    phase === "completing" || phase === "done" ? 100 : Math.min(100, Math.round(rawPercent));

  return {
    phase,
    busy,
    pending,
    file,
    filename,
    fileSize,
    online,
    /** Devam edilebilir bir session var ama File nesnesi bellekte yok (sayfa yenilenmiş). */
    needsFile: Boolean(pending) && !file,
    restoring,
    error,
    uploadedChunks,
    totalChunks,
    percent,
    start,
    resume,
    pause,
    discard,
    reset,
  };
}
