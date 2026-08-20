import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import UploadDropzone from "../components/UploadDropzone.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import ImportActions from "../components/ImportActions.jsx";
import Alert from "../components/Alert.jsx";
import Button from "../components/Button.jsx";
import Spinner from "../components/Spinner.jsx";
import { api } from "../api/client.js";
import { isTerminal } from "../lib/status.js";
import { formatDate } from "../lib/format.js";

export default function ImportListPage() {
  const navigate = useNavigate();
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

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

  const handleUpload = async (file) => {
    setUploading(true);
    setUploadError(null);
    try {
      const created = await api.uploadImport(file);
      setImports((previous) => [created, ...previous.filter((item) => item.id !== created.id)]);
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleChanged = (updated) => {
    setImports((previous) =>
      previous.map((record) => (record.id === updated.id ? updated : record))
    );
  };

  const rows = [...imports].sort((a, b) => b.id - a.id);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-xl font-semibold tracking-tight">GTFS dosyası yükle</h1>
        <p className="mt-1 text-sm text-slate-500">
          Yüklenen dosya arka planda doğrulanır; durumu aşağıdaki tablodan takip edebilirsiniz.
        </p>
        <div className="mt-4">
          <UploadDropzone onUpload={handleUpload} uploading={uploading} />
        </div>
        {uploadError && (
          <Alert tone="error" title="Yükleme başarısız" className="mt-3">
            {uploadError}
          </Alert>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            İçe aktarmalar{" "}
            <span className="text-sm font-normal text-slate-400">({rows.length})</span>
          </h2>
          <div className="flex items-center gap-3">
            {hasActive && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
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
          <Alert tone="error" title="Liste yüklenemedi" className="mt-3">
            {listError}
          </Alert>
        )}
        {actionError && (
          <Alert tone="error" className="mt-3">
            {actionError}
          </Alert>
        )}

        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">No</th>
                  <th className="px-4 py-2.5">Dosya adı</th>
                  <th className="px-4 py-2.5">Durum</th>
                  <th className="px-4 py-2.5">Oluşturulma</th>
                  <th className="px-4 py-2.5">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      <span className="inline-flex items-center gap-2">
                        <Spinner /> Yükleniyor…
                      </span>
                    </td>
                  </tr>
                )}

                {!loading && rows.length === 0 && !listError && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Henüz bir içe aktarma yok. Yukarıdan bir GTFS ZIP dosyası yükleyin.
                    </td>
                  </tr>
                )}

                {!loading &&
                  rows.map((record) => (
                    <tr
                      key={record.id}
                      onClick={() => navigate(`/imports/${record.id}`)}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{record.id}</td>
                      <td className="px-4 py-2.5">
                        <Link
                          to={`/imports/${record.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {record.file_name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">
                        {formatDate(record.created_at)}
                      </td>
                      <td className="px-4 py-2.5" onClick={(event) => event.stopPropagation()}>
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
        </div>
      </section>
    </div>
  );
}
