import { Link, useLocation } from "react-router-dom";

export default function Header() {
  const { pathname } = useLocation();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          {/* Shield icon */}
          <svg
            width="26"
            height="26"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M16 2 L28 7 L28 16 C28 23 22 29 16 31 C10 29 4 23 4 16 L4 7 Z"
              fill="#16a34a"
              opacity="0.12"
            />
            <path
              d="M16 2 L28 7 L28 16 C28 23 22 29 16 31 C10 29 4 23 4 16 L4 7 Z"
              fill="none"
              stroke="#16a34a"
              strokeWidth="1.75"
            />
            <circle cx="16" cy="17" r="2" fill="#16a34a" />
            <path
              d="M11 14 Q13 11 16 11 Q19 11 21 14"
              stroke="#16a34a"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M8 11 Q11 7 16 7 Q21 7 24 11"
              stroke="#16a34a"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              opacity="0.45"
            />
          </svg>
          <div>
            <span className="font-semibold text-slate-900 text-sm leading-tight block">
              AgriShield
            </span>
            <span className="text-xs text-slate-400 leading-tight block">
              Sensor Dashboard
            </span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1 ml-4">
          <Link
            to="/"
            className={[
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              pathname === "/"
                ? "bg-slate-100 text-slate-900"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50",
            ].join(" ")}
          >
            Fleet
          </Link>
          <Link
            to="/compare"
            className={[
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              pathname === "/compare"
                ? "bg-slate-100 text-slate-900"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50",
            ].join(" ")}
          >
            Compare
          </Link>
          <Link
            to="/weather"
            className={[
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              pathname === "/weather"
                ? "bg-slate-100 text-slate-900"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50",
            ].join(" ")}
          >
            Weather
          </Link>
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Foundation tag */}
        <span className="hidden sm:block text-xs text-slate-400 font-medium">
          TheRANGE Foundation
        </span>
      </div>
    </header>
  );
}
