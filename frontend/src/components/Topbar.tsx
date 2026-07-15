import { Bell, CalendarDays, LogOut, Moon, RefreshCw, Search, Sun } from "lucide-react";

import { Worker } from "../api/types";
import { useTheme } from "../context/ThemeContext";

interface TopbarProps {
  user: Worker | null;
  onLogout: () => void;
}

export function Topbar({ user, onLogout }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const today = new Date().toISOString().slice(0, 10);
  const initials = (user?.name ?? "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <header className="topbar">
      <div className="topbar-search">
        <Search size={17} aria-hidden="true" />
        <input aria-label="Search operations" placeholder="Search sessions, posts, workers" />
      </div>
      <div className="topbar-actions">
        <div className="topbar-date" title="Today">
          <CalendarDays size={16} />
          <span>{today}</span>
        </div>
        <select className="topbar-select" aria-label="Shift selector" defaultValue="live">
          <option value="live">Live shift</option>
        </select>
        <button className="icon-button" type="button" onClick={() => window.location.reload()} title="Refresh" aria-label="Refresh">
          <RefreshCw size={18} />
        </button>
        <button
          className="icon-button"
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="icon-button notification-button" type="button" title="Notifications" aria-label="Notifications">
          <Bell size={18} />
          <span />
        </button>
      </div>
      <div className="topbar-user">
        <div>
          <strong>{user?.name}</strong>
          <span>{user?.role}</span>
        </div>
        <div className="user-avatar" aria-hidden="true">
          {initials}
        </div>
        <button className="icon-button" onClick={onLogout} title="Log out" aria-label="Log out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
