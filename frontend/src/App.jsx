import { Link, Route, Routes } from "react-router-dom";
import ImportListPage from "./pages/ImportListPage.jsx";
import ImportDetailPage from "./pages/ImportDetailPage.jsx";

function NotFound() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
      <p className="text-slate-600">Sayfa bulunamadı.</p>
      <Link to="/" className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline">
        Ana sayfaya dön
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-blue-600 text-sm font-bold text-white">
              GT
            </span>
            <span className="text-lg font-semibold tracking-tight">GTFS Doğrulama Paneli</span>
          </Link>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-slate-500 hover:text-slate-900 hover:underline"
          >
            API dokümanı
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<ImportListPage />} />
          <Route path="/imports/:importId" element={<ImportDetailPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
