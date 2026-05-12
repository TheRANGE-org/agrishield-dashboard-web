import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  detail?: string;
}

export default function ErrorState({
  message = "Unable to load data",
  detail,
}: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 gap-3"
      role="alert"
    >
      <AlertCircle className="h-8 w-8 text-red-400" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-700">{message}</p>
      {detail && <p className="text-xs text-slate-400 max-w-sm text-center">{detail}</p>}
    </div>
  );
}
