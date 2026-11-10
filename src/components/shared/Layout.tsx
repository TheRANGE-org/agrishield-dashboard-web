import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";

export default function Layout() {
  const { pathname } = useLocation();
  const isMap = pathname === "/map";
  const wide = isMap || pathname === "/";

  return (
    <div
      className={
        isMap
          ? "flex h-dvh flex-col overflow-hidden bg-slate-50"
          : "flex min-h-screen flex-col bg-slate-50"
      }
    >
      <Header />
      <main
        className={
          isMap
            ? "flex min-h-0 w-full flex-1 flex-col"
            : wide
            ? "w-full flex-1 px-4 py-6 sm:px-6 lg:px-8"
            : "mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8"
        }
      >
        <Outlet />
      </main>
      <footer className="shrink-0 border-t border-slate-200 bg-white">
        <div
          className={[
            "px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between",
            wide ? "w-full" : "max-w-7xl mx-auto",
          ].join(" ")}
        >
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
