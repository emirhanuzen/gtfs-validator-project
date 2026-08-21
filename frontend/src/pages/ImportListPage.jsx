import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import UploadPanel from "../components/UploadPanel.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import ImportActions from "../components/ImportActions.jsx";
import Alert from "../components/Alert.jsx";
import Button from "../components/Button.jsx";
import Spinner from "../components/Spinner.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { api } from "../api/client.js";
import { isTerminal } from "../lib/status.js";
import { formatDate } from "../lib/format.js";

export default function ImportListPage() {
  const navigate = useNavigate();
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.listImports();
      setImports(data);
      setListError(null);
    } catch (error) {
      setListError(error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // İşlenmekte olan bir kayıt varsa listeyi periyodik tazele
  const loadRef = useRef(load);
  loadRef.current = load;
  const hasActive = imports.some((record) => !isTerminal(record.status));

  useEffect(() => {
    if (!hasActive) return undefined;
    const timer = setInterval(() => loadRef.current({ silent: true }), 3000);
    return () => clearInterval(timer);
  }, [hasActive]);

  /** Parçalar birleşip import kaydı oluştuğunda: listeye ekle + detaya git. */
  const handleUploaded = useCallback(
    (created) => {
      // complete ucu kaydı döndüremediyse (bkz. useResumableUpload) sadece listeyi tazeleriz.
      if (!created?.id) {
        loadRef.current();
        return;
      }
      setImports((previous) => [created, ...previous.filter((item) => item.id !== created.id)]);
      navigate(`/imports/${created.id}`);
    },
    [navigate]
  );

  const handleChanged = (updated) => {
    setImports((previous) =>
      previous.map((record) => (record.id === updated.id ? updated : record))
    );
  };

  const rows = [...imports].sort((a, b) => b.id - a.id);
  const showEmptyState = !loading && rows.length === 0 && !listError;

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">GTFS dosyası yükle</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
          Dosya 5 MB'lık parçalara bölünerek yüklenir; bağlantı koparsa kaldığı yerden devam
          edebilirsiniz. Yükleme bittiğinde doğrulama arka planda başlar.
        </p>
        <div className="mt-5">
          <UploadPanel onCompleted={handleUploaded} />
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">İçe aktarmalar</h2>
            <span className="rounded-full bg-slate-200/70 px-2 py-0.5 font-mono text-xs font-medium text-slate-600">
              {rows.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {hasActive && (
              <span className="flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                <Spinner className="h-3 w-3" />
                canlı güncelleniyor
              </span>
            )}
            <Button size="sm" onClick={() => load()}>
              Yenile
            </Button>
          </div>
        </div>

        {listError && (
          <Alert tone="error" title="Liste yüklenemedi" className="mt-4">
            {listError}
          </Alert>
        )}
        {actionError && (
          <Alert tone="error" className="mt-4">
            {actionError}
          </Alert>
        )}

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          {showEmptyState ? (
            <EmptyState
              title="Henüz bir içe aktarma yok"
              description="Yukarıdaki alana bir GTFS ZIP dosyası bırakın; yükleme ilerlemesini ve doğrulama durumunu buradan takip edeceksiniz."
              icon={
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3.75 9.75h16.5M8.25 4.5v15m-2.5 0h12.5a2 2 0 0 0 2-2v-11a2 2 0 0 0-2-2H5.75a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2Z" />
                </svg>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">No</th>
                    <th className="px-5 py-3">Dosya adı</th>
                    <th className="px-5 py-3">Durum</th>
                    <th className="px-5 py-3">Oluşturulma</th>
                    <th className="px-5 py-3">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                        <span className="inline-flex items-center gap-2">
                          <Spinner /> Yükleniyor…
                        </span>
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    rows.map((record) => (
                      <tr
                        key={record.id}
                        onClick={() => navigate(`/imports/${record.id}`)}
                        className="cursor-pointer transition-colors hover:bg-brand-50/50"
                      >
                        <td className="px-5 py-3 font-mono text-xs text-slate-400">{record.id}</td>
                        <td className="px-5 py-3">
                          <Link
                            to={`/imports/${record.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className="font-medium text-brand-700 decoration-brand-300 underline-offset-4 hover:underline"
                          >
                            {record.file_name}
                          </Link>
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={record.status} />
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-slate-600">
                          {formatDate(record.created_at)}
                        </td>
                        <td className="px-5 py-3" onClick={(event) => event.stopPropagation()}>
                          <ImportActions
                            record={record}
                            onChanged={handleChanged}
                            onError={setActionError}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
