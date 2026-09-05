import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  Gamepad2,
  LogOut,
  Monitor,
  Moon,
  Receipt,
  RefreshCw,
  Search,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import { Alert, Game, Post, Session, Worker } from "../api/types";
import { useTheme } from "../context/ThemeContext";

interface TopbarProps {
  user: Worker | null;
  onLogout: () => void;
  openAlertsCount?: number;
}

interface SearchItem {
  id: string;
  category: "Posts" | "Sessions" | "Games" | "Workers" | "Alerts";
  title: string;
  subtitle: string;
  link: string;
  icon: any;
}

export function Topbar({ user, onLogout, openAlertsCount = 0 }: TopbarProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Cached search records
  const [posts, setPosts] = useState<Post[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().slice(0, 10);
  const initials = (user?.name ?? "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  async function loadSearchData() {
    try {
      const promises: Promise<any>[] = [
        api.get<Post[]>("/posts"),
        api.get<Session[]>("/sessions/active"),
        api.get<Game[]>("/games"),
      ];
      if (user?.role === "admin") {
        promises.push(api.get<Worker[]>("/workers"));
        promises.push(api.get<Alert[]>("/alerts?status_filter=open"));
      }
      const results = await Promise.all(promises);
      setPosts(results[0]?.data ?? []);
      setSessions(results[1]?.data ?? []);
      setGames(results[2]?.data ?? []);
      if (user?.role === "admin") {
        setWorkers(results[3]?.data ?? []);
        setAlerts(results[4]?.data ?? []);
      }
      setDataLoaded(true);
    } catch {
      // Ignore background errors
    }
  }

  function handleFocus() {
    if (!dataLoaded) {
      loadSearchData();
    }
    setIsOpen(true);
  }

  // Filter results
  const results = useMemo<SearchItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const list: SearchItem[] = [];

    // Posts
    for (const post of posts) {
      if (post.name.toLowerCase().includes(q) || post.status.toLowerCase().includes(q)) {
        list.push({
          id: `post-${post.id}`,
          category: "Posts",
          title: post.name,
          subtitle: `Status: ${post.status}`,
          link: user?.role === "admin" ? "/posts" : "/",
          icon: Monitor,
        });
      }
    }

    // Sessions
    for (const session of sessions) {
      const matchId = String(session.id).includes(q);
      const matchClient = session.client_name?.toLowerCase().includes(q);
      const matchGame = session.game?.name?.toLowerCase().includes(q);
      if (matchId || matchClient || matchGame) {
        list.push({
          id: `session-${session.id}`,
          category: "Sessions",
          title: `Session #${session.id}${session.client_name ? ` • ${session.client_name}` : ""}`,
          subtitle: `${session.game?.name ?? "No game"} • ${session.status}`,
          link: "/sessions",
          icon: Receipt,
        });
      }
    }

    // Games
    for (const game of games) {
      if (
        game.name.toLowerCase().includes(q) ||
        game.ai_label?.toLowerCase().includes(q) ||
        game.category.toLowerCase().includes(q)
      ) {
        list.push({
          id: `game-${game.id}`,
          category: "Games",
          title: game.name,
          subtitle: `${game.category} • ${game.pricing_mode === "per_match" ? `${game.price_per_match ?? 100} DA/match` : `${game.price_per_time_unit ?? 100} DA/${game.billing_unit_minutes ?? 20}m`}`,
          link: user?.role === "admin" ? "/games" : "/",
          icon: Gamepad2,
        });
      }
    }

    // Workers
    if (user?.role === "admin") {
      for (const worker of workers) {
        if (
          worker.name.toLowerCase().includes(q) ||
          worker.username.toLowerCase().includes(q) ||
          worker.role.toLowerCase().includes(q)
        ) {
          list.push({
            id: `worker-${worker.id}`,
            category: "Workers",
            title: worker.name,
            subtitle: `${worker.role} (@${worker.username})`,
            link: "/workers",
            icon: Users,
          });
        }
      }

      // Alerts
      for (const alert of alerts) {
        if (
          alert.alert_type.toLowerCase().includes(q) ||
          alert.status.toLowerCase().includes(q) ||
          String(alert.session_id).includes(q)
        ) {
          list.push({
            id: `alert-${alert.id}`,
            category: "Alerts",
            title: `Alert: ${alert.alert_type.replace("_", " ")}`,
            subtitle: `Session #${alert.session_id} • Status: ${alert.status}`,
            link: "/alerts",
            icon: AlertTriangle,
          });
        }
      }
    }

    return list.slice(0, 15);
  }, [query, posts, sessions, games, workers, alerts, user]);

  // Group results
  const groupedResults = useMemo(() => {
    const map = new Map<string, SearchItem[]>();
    for (const item of results) {
      const existing = map.get(item.category) ?? [];
      existing.push(item);
      map.set(item.category, existing);
    }
    return map;
  }, [results]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(item: SearchItem) {
    setIsOpen(false);
    setQuery("");
    navigate(item.link);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length ? (prev + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      const target = results[selectedIndex] ?? results[0];
      if (target) {
        handleSelect(target);
      }
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-search-wrapper" ref={wrapperRef}>
        <div className="topbar-search">
          <Search size={17} aria-hidden="true" />
          <input
            ref={inputRef}
            aria-label="Search operations"
            placeholder="Search sessions, posts, workers, games..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setSelectedIndex(0);
            }}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button
              type="button"
              className="topbar-search-clear"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {isOpen && query.trim().length > 0 && (
          <div className="topbar-search-dropdown" role="listbox">
            {results.length === 0 ? (
              <div className="search-empty">No results found for &ldquo;{query}&rdquo;</div>
            ) : (
              Array.from(groupedResults.entries()).map(([category, items]) => (
                <div key={category} className="search-group">
                  <div className="search-group-title">{category}</div>
                  {items.map((item) => {
                    const Icon = item.icon;
                    const index = results.indexOf(item);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`search-item ${index === selectedIndex ? "selected" : ""}`}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <div className="search-item-icon">
                          <Icon size={16} />
                        </div>
                        <div className="search-item-info">
                          <span className="search-item-title">{item.title}</span>
                          <span className="search-item-subtitle">{item.subtitle}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="topbar-actions">
        <div className="topbar-date" title="Today">
          <CalendarDays size={16} />
          <span>{today}</span>
        </div>
        <select className="topbar-select" aria-label="Shift selector" defaultValue="live">
          <option value="live">Live shift</option>
        </select>
        <button
          className="icon-button"
          type="button"
          onClick={() => window.location.reload()}
          title="Refresh"
          aria-label="Refresh"
        >
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
        <button
          className="icon-button notification-button"
          type="button"
          onClick={() => navigate("/alerts")}
          title={openAlertsCount > 0 ? `${openAlertsCount} open alerts — Click to view` : "Notifications (no alerts)"}
          aria-label="Notifications"
        >
          <Bell size={18} />
          {openAlertsCount > 0 && <span className="notification-badge">{openAlertsCount}</span>}
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
