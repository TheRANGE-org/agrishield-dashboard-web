interface Props {
  note: string;
}

/** Subtle hint below a chart when data exists but coverage is sparse. */
export default function PartialDataNote({ note }: Props) {
  return (
    <p className="mt-1.5 px-1 text-xs text-amber-700/90" role="note">
      {note}
    </p>
  );
}
