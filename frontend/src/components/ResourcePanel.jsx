import { useCallback, useEffect, useState } from "react";
import Button from "./Button.jsx";
import Alert from "./Alert.jsx";
import Spinner from "./Spinner.jsx";
import EditModal from "./EditModal.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";
import EmptyState from "./EmptyState.jsx";
import { api } from "../api/client.js";
import { isMutable } from "../lib/resources.js";
import { formatCell } from "../lib/format.js";

export default function ResourcePanel({ importId, resource }) {
  const pageSize = resource.pageSize ?? 100;
  const mutable = isMutable(resource);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState(null);

  const [editingRow, setEditingRow] = useState(null);
  const [deletingRow, setDeletingRow] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = resource.paginated ? { limit: pageSize, offset: page * pageSize } : undefined;
      const data = await api.listResource(importId, resource.key, params);
      setRows(Array.isArray(data) ? data : []);
      setError(null);
    } catch (requestError) {
      setError(requestError);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [importId, resource.key, resource.paginated, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const handleEditSubmit = async (patch) => {
    const updated = await api.updateResource(importId, resource.key, editingRow.id, patch);
    setRows((previous) => previous.map((row) => (row.id === updated.id ? updated : row)));
    setEditingRow(null);
    setNotice("Kayıt güncellendi.");
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteResource(importId, resource.key, deletingRow.id);
      setRows((previous) => previous.filter((row) => row.id !== deletingRow.id));
      setDeletingRow(null);
      setNotice("Kayıt silindi.");
    } catch (requestError) {
      setDeleteError(requestError.message);
    } finally {
      setDeleting(false);
    }
  };

  const columnCount = resource.columns.length + (mutable ? 1 : 0);
  const rangeStart = page * pageSize + 1;
  const rangeEnd = page * pageSize + rows.length;

  return (
    <div>
      {error && (
        <Alert tone="error" title={`${resource.label} listesi yüklenemedi`} className="mb-3">
          <p>{error.message}</p>
          {error.status >= 500 && (
            <p className="mt-1 text-xs opacity-80">
              500 hatası genellikle backend yanıt şeması ile veritabanı tipinin uyuşmamasından
              kaynaklanır (metinsel bir trip_id alanının int olarak tanımlanması gibi). API
              loglarına bakmakta fayda var.
            </p>
          )}
        </Alert>
      )}

      {notice && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs font-medium text-emerald-700 underline-offset-2 hover:underline"
          >
            kapat
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        {resource.paginated && (
          // Tablonun altındaki sayfalama 100 satırın ardında kaldığı için üstte de gösteriliyor.
          <PaginationBar
            className="border-b border-slate-200 bg-slate-50/80"
            page={page}
            pageSize={pageSize}
            rows={rows}
            loading={loading}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onChange={setPage}
          />
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                {resource.columns.map((column) => (
                  <th key={column.key} className="px-5 py-3 whitespace-nowrap">
                    {column.label}
                  </th>
                ))}
                {mutable && <th className="px-5 py-3 text-right">İşlemler</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={columnCount} className="px-5 py-12 text-center text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Spinner /> Yükleniyor…
                    </span>
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && !error && (
                <tr>
                  <td colSpan={columnCount} className="p-0">
                    <EmptyState
                      title={
                        page > 0
                          ? "Bu sayfada kayıt yok"
                          : `${resource.label} kaydı bulunamadı`
                      }
                      description={
                        page > 0
                          ? "Önceki sayfaya dönebilirsiniz."
                          : `Bu içe aktarmada ${resource.hint} dosyasından gelen bir kayıt yok.`
                      }
                    />
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-brand-50/40">
                    {resource.columns.map((column) => (
                      <td key={column.key} className="px-5 py-2.5 whitespace-nowrap text-slate-700">
                        {formatCell(row[column.key])}
                      </td>
                    ))}
                    {mutable && (
                      <td className="px-5 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingRow(row)}>
                            Düzenle
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => {
                              setDeleteError(null);
                              setDeletingRow(row);
                            }}
                          >
                            Sil
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {resource.paginated && (
          <PaginationBar
            className="border-t border-slate-200 bg-slate-50/70"
            page={page}
            pageSize={pageSize}
            rows={rows}
            loading={loading}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onChange={setPage}
          />
        )}
      </div>

      {editingRow && (
        <EditModal
          key={editingRow.id}
          open
          resource={resource}
          row={editingRow}
          onSubmit={handleEditSubmit}
          onClose={() => setEditingRow(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deletingRow)}
        title="Kaydı sil"
        message={`Bu kayıt (no: ${deletingRow?.id}) kalıcı olarak silinecek. Devam edilsin mi?`}
        loading={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => setDeletingRow(null)}
      />
    </div>
  );
}

/**
 * Sayfalanan kaynaklar (şimdilik stop_times) için önceki/sonraki denetimi.
 * Tablonun hem üstünde hem altında gösteriliyor: 100 satırlık tabloda alttaki
 * denetim ekranın çok aşağısında kalıyor ve fark edilmiyordu.
 */
function PaginationBar({ page, pageSize, rows, loading, rangeStart, rangeEnd, onChange, className = "" }) {
  const hasNext = rows.length === pageSize;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 ${className}`}>
      <div className="text-xs text-slate-600">
        <span className="font-medium text-slate-700">
          {rows.length > 0 ? `${rangeStart}–${rangeEnd} arası kayıt` : "Kayıt yok"}
        </span>
        <span className="text-slate-400"> · sayfa {page + 1} · sayfa başına {pageSize}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={page === 0 || loading} onClick={() => onChange(Math.max(0, page - 1))}>
          ← Önceki
        </Button>
        <Button size="sm" disabled={!hasNext || loading} onClick={() => onChange(page + 1)}>
          Sonraki →
        </Button>
      </div>
    </div>
  );
}
