import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBan,
  faCircleCheck,
  faFireFlameCurved,
} from "@fortawesome/free-solid-svg-icons";

import type { Verdict } from "@/lib/types";

const verdictStyles: Record<Verdict, string> = {
  HOT_DEAL: "border-blue-500/40 bg-blue-500/12 text-blue-800 dark:text-blue-200",
  OK_DEAL: "border-cyan-500/40 bg-cyan-500/12 text-cyan-800 dark:text-cyan-200",
  IGNORE: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
};

const verdictIcons: Record<Verdict, typeof faFireFlameCurved> = {
  HOT_DEAL: faFireFlameCurved,
  OK_DEAL: faCircleCheck,
  IGNORE: faBan,
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold ${verdictStyles[verdict]}`}
    >
      <FontAwesomeIcon icon={verdictIcons[verdict]} className="h-3 w-3" />
      {verdict.replace("_", " ")}
    </span>
  );
}
