import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CreditCard,
  Gamepad2,
  Home,
  LucideIcon,
  Monitor,
  Info,
  Receipt,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { Worker } from "../api/types";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

const mainNavItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/posts", label: "Posts", icon: Monitor, adminOnly: true },
  { to: "/sessions", label: "Sessions", icon: Receipt },
  { to: "/games", label: "Games", icon: Gamepad2, adminOnly: true },
];

const operationNavItems: NavItem[] = [
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/workers", label: "Workers", icon: Users, adminOnly: true },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/alerts", label: "Alerts", icon: AlertTriangle, adminOnly: true },
];

const systemNavItems: NavItem[] = [
  { to: "/shift", label: "Shift", icon: CalendarClock },
  { to: "/about", label: "About", icon: Info },
];

function initials(name?: string) {
  return (name ?? "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function SidebarGroup({
  title,
  items,
  isAdmin,
  openAlertsCount,
}: {
  title: string;
  items: NavItem[];
  isAdmin: boolean;
  openAlertsCount?: number;
}) {
  const visibleItems = items.filter((item) => !item.adminOnly || isAdmin);
  if (visibleItems.length === 0) return null;
  return (
    <div className="sidebar-section">
      <span className="sidebar-section-title">{title}</span>
      <nav className="sidebar-nav" aria-label={title}>
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
            <Icon size={18} />
            <span>{label}</span>
            {to === "/alerts" && !!openAlertsCount && openAlertsCount > 0 && (
              <span className="sidebar-badge">{openAlertsCount}</span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function Sidebar({
  isAdmin,
  user,
  openAlertsCount,
}: {
  isAdmin: boolean;
  user: Worker | null;
  openAlertsCount?: number;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <Gamepad2 size={24} />
        </div>
        <div>
          <strong>GameRoom Ops</strong>
          <span>Management Suite</span>
        </div>
      </div>
      <div className="sidebar-groups">
        <SidebarGroup title="Main" items={mainNavItems} isAdmin={isAdmin} openAlertsCount={openAlertsCount} />
        <SidebarGroup title="Operations" items={operationNavItems} isAdmin={isAdmin} openAlertsCount={openAlertsCount} />
        <SidebarGroup title="System" items={systemNavItems} isAdmin={isAdmin} openAlertsCount={openAlertsCount} />
      </div>
      <div className="sidebar-user-card">
        <div className="sidebar-avatar">{initials(user?.name)}</div>
        <div>
          <strong>{user?.name ?? "Operator"}</strong>
          <span>{user?.role ?? "worker"}</span>
        </div>
        <span className="online-dot" aria-label="Online" />
      </div>
    </aside>
  );
}
