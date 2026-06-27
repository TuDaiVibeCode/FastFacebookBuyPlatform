type TraceDisplayProps = {
  trace?: string[];
  compact?: boolean;
};

export function TraceDisplay({ trace = [], compact = false }: TraceDisplayProps) {
  if (trace.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        No processing trace has been returned yet.
      </p>
    );
  }

  return (
    <ol
      className={`grid gap-2 ${
        compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"
      }`}
    >
      {trace.map((step, index) => (
        <li
          key={`${step}-${index}`}
          className="flex min-h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2 text-sm"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-xs font-semibold text-[var(--background)]">
            {index + 1}
          </span>
          <span className="break-words font-mono text-xs">{step}</span>
        </li>
      ))}
    </ol>
  );
}
