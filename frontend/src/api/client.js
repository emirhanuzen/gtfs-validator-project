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
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch {
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

function queryString(params) {
  if (!params) return "";
  const search = new URLSearchParams(params).toString();
  return search ? `?${search}` : "";
}

export const api = {
  listImports: () => request("/import_gtfs/"),

  getImport: (importId) => request(`/import_gtfs/${importId}`),

  uploadImport: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return request("/import_gtfs/", { method: "POST", body: formData });
  },

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
