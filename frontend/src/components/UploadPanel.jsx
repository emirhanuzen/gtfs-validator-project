import { useRef } from "react";
import UploadDropzone from "./UploadDropzone.jsx";
import ProgressBar from "./ProgressBar.jsx";
import Button from "./Button.jsx";
import Alert from "./Alert.jsx";
import Spinner from "./Spinner.jsx";
import { useResumableUpload } from "../hooks/useResumableUpload.js";
import { CHUNK_SIZE, formatBytes, remainingMinutes } from "../lib/upload.js";

const PHASE_TEXT = {
  starting: "Yükleme oturumu açılıyor…",
  uploading: "Parçalar yükleniyor…",
  completing: "Parçalar birleştiriliyor, içe aktarma başlatılıyor…",
  done: "Yükleme tamamlandı, içe aktarma başladı.",
};

/**
 * Parçalı yükleme akışının tamamı: dosya seçimi, ilerleme çubuğu,
 * hata durumunda "devam et" ve süresi dolan oturum uyarısı.
 */
export default function UploadPanel({ onCompleted }) {
  const upload = useResumableUpload({ onCompleted });
  const resumeInputRef = useRef(null);

  const { phase, pending, filename, fileSize, needsFile, percent, uploadedChunks, totalChunks } =
    upload;

  const paused = phase === "paused";
  const finished = phase === "done";
  // Dosya seçilir seçilmez (init cevabı beklenmeden) kart görünür olsun.
  const showCard = Boolean(filename) && phase !== "idle" && phase !== "expired";

  if (!showCard) {
    return (
      <div className="space-y-3">
        {phase === "expired" && (
          <Alert tone="warning" title="Yükleme oturumunun süresi doldu">
            Yarım kalan yükleme 30 dakikadan uzun süre beklediği için silindi. Dosyayı baştan
            yüklemeniz gerekiyor.
          </Alert>
        )}
        {upload.error && (
          <Alert tone="error" title="Yükleme başlatılamadı">
            {upload.error}
          </Alert>
        )}
        <UploadDropzone
          onSelect={upload.start}
          disabled={upload.busy}
          hint={[
            { icon: "file", label: "ZIP arşivi" },
            { icon: "chunks", label: `${formatBytes(CHUNK_SIZE)} parçalar` },
            { icon: "resume", label: "kaldığı yerden devam eder" },
          ]}
        />
      </div>
    );
  }

  const remaining = remainingMinutes(pending);
  const tone = finished ? "success" : upload.error ? "warning" : "brand";
  const statusText = paused ? "Yükleme durdu" : PHASE_TEXT[phase] ?? "Yükleniyor…";

  return (
    <div
      className={`rounded-2xl border bg-white p-6 shadow-card transition-colors ${
        finished
          ? "border-emerald-300 ring-1 ring-emerald-200"
          : paused
            ? "border-amber-300 ring-1 ring-amber-200"
            : "border-brand-300 ring-1 ring-brand-200"
      }`}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
              finished
                ? "bg-emerald-50 text-emerald-600"
                : paused
                  ? "bg-amber-50 text-amber-600"
                  : "bg-brand-50 text-brand-600"
            }`}
          >
            {finished ? (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m5 13 4 4L19 7" />
              </svg>
            ) : paused ? (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M10 5.5v13M14 5.5v13" />
              </svg>
            ) : (
              <Spinner className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{filename}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {fileSize ? `${formatBytes(fileSize)} · ` : ""}
              {statusText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {phase === "uploading" && (
            <Button size="sm" variant="secondary" onClick={upload.pause}>
              Duraklat
            </Button>
          )}
          {paused && !needsFile && (
            <Button size="sm" variant="primary" onClick={() => upload.resume()}>
              Devam et
            </Button>
          )}
          {paused && needsFile && (
            <>
              <Button size="sm" variant="primary" onClick={() => resumeInputRef.current?.click()}>
                Dosyayı seçip devam et
              </Button>
              <input
                ref={resumeInputRef}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  event.target.value = "";
                  if (selected) upload.resume(selected);
                }}
              />
            </>
          )}
          {paused && (
            <Button size="sm" variant="ghost" onClick={upload.discard}>
              Vazgeç
            </Button>
          )}
        </div>
      </div>

      <ProgressBar
        className="mt-5"
        size="lg"
        value={percent}
        tone={tone}
        animated={phase === "uploading" || phase === "completing" || phase === "starting"}
        label={
          finished ? "Tamamlandı" : paused ? "Duraklatıldı" : phase === "completing" ? "İşleniyor" : "Yükleniyor"
        }
        sublabel={
          upload.restoring
            ? "Kaldığı yer sorgulanıyor…"
            : `${uploadedChunks}/${totalChunks} parça yüklendi · parça boyutu ${formatBytes(CHUNK_SIZE)}`
        }
      />

      {paused && upload.error && (
        <Alert tone="warning" title="Yükleme durdu — devam etmek için tıklayın" className="mt-4">
          <p>{upload.error}</p>
          <p className="mt-1">
            {uploadedChunks > 0
              ? `Tamamlanan ${uploadedChunks} parça sunucuda duruyor; `
              : "Henüz tamamlanan parça yok; "}
            {needsFile ? "aynı dosyayı seçtiğinizde" : "devam ettiğinizde"} sadece eksik parçalar
            gönderilir. Yarım kalan parça sunucuda saklanmaz, o parça baştan gider.
          </p>
          {!upload.online && (
            <p className="mt-1 font-medium">
              Tarayıcı şu anda çevrimdışı görünüyor; bağlantı gelince tekrar deneyin.
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {needsFile ? (
              <Button size="md" variant="primary" onClick={() => resumeInputRef.current?.click()}>
                Dosyayı seçip devam et
              </Button>
            ) : (
              <Button size="md" variant="primary" onClick={() => upload.resume()}>
                Devam et
              </Button>
            )}
            <Button size="md" variant="secondary" onClick={upload.discard}>
              Vazgeç
            </Button>
          </div>
        </Alert>
      )}

      {paused && !upload.error && needsFile && (
        <Alert tone="info" className="mt-4">
          Yarım kalan bir yükleme bulundu. Devam etmek için aynı dosyayı ({filename}) yeniden seçin
          — sadece eksik parçalar gönderilecek.
        </Alert>
      )}

      {pending?.sessionId && (
        <p className="mt-3 text-xs text-slate-400">
          Oturum no: <span className="font-mono">{pending.sessionId.slice(0, 12)}…</span>
          {!finished && remaining !== null && remaining > 0 && (
            <> · yaklaşık {remaining} dk sonra sona erer</>
          )}
        </p>
      )}
    </div>
  );
}
