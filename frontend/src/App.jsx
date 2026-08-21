import { Link, Route, Routes } from "react-router-dom";
import ImportListPage from "./pages/ImportListPage.jsx";
import ImportDetailPage from "./pages/ImportDetailPage.jsx";
import { API_BASE } from "./api/client.js";

function NotFound() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-card">
      <p className="text-4xl font-semibold tracking-tight text-slate-300">404</p>
      <p className="mt-2 text-slate-600">Aradığınız sayfa bulunamadı.</p>
      <Link
        to="/"
        className="mt-4 inline-block text-sm font-medium text-brand-600 underline-offset-4 hover:underline"
      >
        Ana sayfaya dön
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm shadow-brand-600/30 transition-transform duration-200 group-hover:scale-105">
              GT
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-base font-semibold tracking-tight text-slate-900">
                GTFS Doğrulama Paneli
              </span>
              <span className="text-xs text-slate-400">içe aktarma ve veri denetimi</span>
            </span>
          </Link>
          <a
            href={`${API_BASE}/docs`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            API dokümanı
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M13.5 6H18v4.5M17.5 6.5 10 14M16 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h4" />
            </svg>
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <Routes>
          <Route path="/" element={<ImportListPage />} />
          <Route path="/imports/:importId" element={<ImportDetailPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-8 text-xs text-slate-400">
        FastAPI · Celery · PostgreSQL · MinIO üzerinde çalışan GTFS doğrulama servisinin arayüzü.
      </footer>
    </div>
  );
}
