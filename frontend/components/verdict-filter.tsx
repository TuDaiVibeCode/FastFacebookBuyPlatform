import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBan,
  faCircleCheck,
  faFireFlameCurved,
  faList,
} from "@fortawesome/free-solid-svg-icons";

import type { Verdict } from "@/lib/types";

const filters: Array<{
  label: string;
  value: Verdict | "ALL";
  icon: typeof faList;
}> = [
  { label: "All", value: "ALL", icon: faList },
  { label: "Hot", value: "HOT_DEAL", icon: faFireFlameCurved },
  { label: "Ok", value: "OK_DEAL", icon: faCircleCheck },
  { label: "Ignore", value: "IGNORE", icon: faBan },
];

export function VerdictFilter({
  active,
  basePath = "/",
}: {
  active: Verdict | "ALL";
  basePath?: string;
}) {
  return (
    <div className="grid w-full grid-cols-2 rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900 sm:inline-grid sm:w-auto sm:grid-cols-4">
      {filters.map((filter) => {
        const href =
          filter.value === "ALL" ? basePath : `${basePath}?verdict=${filter.value}`;
        const isActive = active === filter.value;
        return (
          <Link
            key={filter.value}
            href={href}
            className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-md px-2.5 py-2 text-center text-sm font-medium transition active:translate-y-px sm:px-3 ${
              isActive
                ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <FontAwesomeIcon icon={filter.icon} className="h-3.5 w-3.5" />
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}
