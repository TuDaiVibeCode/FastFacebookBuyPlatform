"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartSimple,
  faChevronLeft,
  faChevronRight,
  faComments,
  faUser,
  faShieldHalved,
  faStore,
} from "@fortawesome/free-solid-svg-icons";

type AppSidebarProps = {
  active: "browse" | "chat" | "demo" | "auth";
};

const links = [
  { href: "/", label: "Browse", key: "browse", icon: faStore },
  { href: "/chat", label: "Chat", key: "chat", icon: faComments },
  { href: "/demo", label: "Demo", key: "demo", icon: faChartSimple },
  { href: "/auth/login", label: "Auth", key: "auth", icon: faUser },
] as const;

export function AppSidebar({ active }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("deal-radar-sidebar");
    setCollapsed(saved === "collapsed");
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("deal-radar-sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  }

  return (
    <aside
      className={`side-rail ${collapsed ? "is-collapsed" : ""}`}
      aria-label="Deal Radar navigation"
    >
      <Link href="/" className="rail-logo" aria-label="Deal Radar home">
        <span>
          <FontAwesomeIcon icon={faShieldHalved} />
        </span>
        <strong className="rail-text">Deal Radar</strong>
      </Link>
      <button
        type="button"
        className="rail-toggle"
        onClick={toggleSidebar}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} />
        <span className="rail-text">{collapsed ? "Expand" : "Collapse"}</span>
      </button>
      <nav>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={active === link.key ? "active" : ""}
          >
            <FontAwesomeIcon icon={link.icon} />
            <span className="rail-text">{link.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
