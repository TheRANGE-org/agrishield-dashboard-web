import { Outlet } from "react-router-dom";
import Header from "./Header";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            © {new Date().getFullYear()} TheRANGE Foundation
          </span>
          <a
            href="/diagnostics"
            className="text-xs text-slate-300 hover:text-slate-500 transition-colors"
            title="Operator diagnostics"
          >
            Diagnostics
          </a>
        </div>
      </footer>
    </div>
  );
}
