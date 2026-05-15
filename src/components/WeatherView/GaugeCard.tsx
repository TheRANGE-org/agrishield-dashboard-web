import { ReactNode } from "react";

interface GaugeCardProps {
  title: string;
  currentValue: string;
  subtext: string;
  minLabel?: string;
  maxLabel?: string;
  percentage: number; // 0 to 100
  color: string;
  children?: ReactNode;
}

export default function GaugeCard({
  title,
  currentValue,
  subtext,
  minLabel,
  maxLabel,
  percentage,
  color,
  children
}: GaugeCardProps) {
  const radius = 40;
  const circumference = Math.PI * radius; // Semi-circle
  // Clamp percentage between 0 and 100
  const clamped = Math.max(0, Math.min(100, percentage));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col items-center">
      <h3 className="text-sm font-medium text-slate-700 w-full text-left mb-4">{title}</h3>
      
      <div className="relative w-48 h-24 flex justify-center overflow-hidden">
        {/* Background Arc */}
        <svg className="absolute w-full h-[200%] top-0 left-0" viewBox="0 0 100 100">
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Foreground Arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.5s ease-in-out" }}
          />
        </svg>

        {/* Value Overlay */}
        <div className="absolute bottom-0 flex flex-col items-center translate-y-1">
          <span className="text-2xl font-bold text-slate-900">{currentValue}</span>
          <span className="text-xs text-slate-500 font-medium">{subtext}</span>
        </div>
      </div>

      {/* Min/Max Labels */}
      <div className="w-full flex justify-between mt-2 px-2 text-xs font-semibold text-slate-400">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
      
      {children && (
        <div className="w-full mt-4 pt-4 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  );
}
