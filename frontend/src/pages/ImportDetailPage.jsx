import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StatusBadge from "../components/StatusBadge.jsx";
import ImportActions from "../components/ImportActions.jsx";
import ResourcePanel from "../components/ResourcePanel.jsx";
import Alert from "../components/Alert.jsx";
import Button from "../components/Button.jsx";
import Spinner from "../components/Spinner.jsx";
import { api } from "../api/client.js";
import { useImportStream } from "../hooks/useImportStream.js";
import { isTerminal } from "../lib/status.js";
import { formatDate, shortenChecksum } from "../lib/format.js";
import { RESOURCES, getResource } from "../lib/resources.js";

function MetaItem({ label, children, title }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-700" title={title}>
        {children}
      </dd>
    </div>
  );
}

const CONNECTION_LABEL = {
  live: "canlı (SSE)",
  polling: "yoklama (SSE kurulamadı)",
};

export default function ImportDetailPage() {
  const { importId } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [activeTab, setActiveTab] = useState(RESOURCES[0].key);
  // durum terminale geçtiğinde veri sekmelerini yeniden yüklemek için
  const [dataVersion, setDataVersion] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRecord(await api.getImport(importId));
      setError(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [importId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStreamUpdate = useCallback(
    (payload) => {
      setRecord((previous) => (previous ? { ...previous, ...payload } : previous));
      if (isTerminal(payload.status)) {
        // akıştan sadece status + error_message geliyor; updated_at için tam kaydı çekelim
        api.getImport(importId).then(setRecord).catch(() => {});
        setDataVersion((previous) => previous + 1);
      }
    },
    [importId]
  );

  const streaming = Boolean(record) && !isTerminal(record.status);
  const connection = useImportStream(importId, {
    enabled: streaming,
    onUpdate: handleStreamUpdate,
  });

  const resource = getResource(activeTab);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-900 hover:underline">
          ← İçe aktarma listesi
        </Link>
      </div>

      {error && (
        <Alert tone="error" title="İçe aktarma yüklenemedi">
          {error}
        </Alert>
      )}

      {loading && !record && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-8 text-slate-500">
          <Spinner /> Yükleniyor…
        </div>
      )}

      {record && (
        <>
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl font-semibold tracking-tight break-all">
                    {record.file_name}
                  </h1>
                  <StatusBadge status={record.status} />
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  İçe aktarma no: <span className="font-mono">{record.id}</span>
                  {streaming && CONNECTION_LABEL[connection] && (
                    <span className="ml-2 text-xs text-slate-400">
                      · durum {CONNECTION_LABEL[connection]} izleniyor
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button size="md" onClick={load}>
                  Yenile
                </Button>
                <ImportActions
                  record={record}
                  size="md"
                  onChanged={(updated) => {
                    setRecord(updated);
                    setDataVersion((previous) => previous + 1);
                  }}
                  onError={setActionError}
                />
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4">
              <MetaItem label="Oluşturulma">{formatDate(record.created_at)}</MetaItem>
              <MetaItem label="Güncellenme">{formatDate(record.updated_at)}</MetaItem>
              <MetaItem label="Durum kodu">
                <span className="font-mono text-xs">{record.status}</span>
              </MetaItem>
              <MetaItem label="Sağlama (sha256)" title={record.file_checksum ?? ""}>
                <span className="font-mono text-xs">{shortenChecksum(record.file_checksum)}</span>
              </MetaItem>
            </dl>

            {actionError && (
              <Alert tone="error" className="mt-4">
                {actionError}
              </Alert>
            )}

            {record.error_message && (
              <Alert
                tone={record.status === "failed" ? "error" : "warning"}
                title={record.status === "failed" ? "Hata mesajı" : "Uyarı"}
                className="mt-4"
              >
                <pre className="whitespace-pre-wrap font-mono text-xs">{record.error_message}</pre>
              </Alert>
            )}
          </section>

          <section>
            <div className="flex flex-wrap gap-1 border-b border-slate-200">
              {RESOURCES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`-mb-px rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === item.key
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
                  }`}
                >
                  {item.label}
                  <span className="ml-1.5 font-mono text-xs text-slate-400">{item.hint}</span>
                </button>
              ))}
            </div>

            <div className="mt-4">
              {!isTerminal(record.status) && (
                <Alert tone="info" className="mb-3">
                  İçe aktarma henüz tamamlanmadı; veriler işlem bittiğinde otomatik olarak
                  yüklenecek.
                </Alert>
              )}
              <ResourcePanel
                key={`${resource.key}-${dataVersion}`}
                importId={importId}
                resource={resource}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
