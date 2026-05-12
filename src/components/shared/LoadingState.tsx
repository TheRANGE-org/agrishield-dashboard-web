interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({
  message = "Loading…",
}: LoadingStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 gap-4"
      role="status"
      aria-live="polite"
    >
      {/* Spinner */}
      <svg
        className="animate-spin h-8 w-8 text-green-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
