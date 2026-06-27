import Link from "next/link";
import type { Verdict } from "@/lib/types";

const OPTIONS: Array<{ label: string; value?: Verdict }> = [
  { label: "All" },
  { label: "Hot", value: "HOT_DEAL" },
  { label: "Ok", value: "OK_DEAL" },
  { label: "Ignore", value: "IGNORE" },
];

export function VerdictFilter({ active }: { active?: string }) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Filter by verdict">
      {OPTIONS.map((option) => {
        const selected = active === option.value || (!active && !option.value);
        const href = option.value ? `/?verdict=${option.value}` : "/";

        return (
          <Link
            key={option.label}
            href={href}
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              selected
                ? "border-[var(--accent)] bg-[var(--accent)] text-white dark:text-[#06201c]"
                : "border-[var(--border)] bg-[var(--panel)] text-[var(--foreground)] hover:border-[var(--accent)]"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
