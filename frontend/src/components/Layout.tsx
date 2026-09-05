import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import { api } from "../api/client";
import { Alert } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const [openAlertsCount, setOpenAlertsCount] = useState(0);

  const fetchAlertsCount = useCallback(async () => {
    if (!isAdmin) {
      setOpenAlertsCount(0);
      return;
    }
    try {
      const { data } = await api.get<Alert[]>("/alerts?status_filter=open");
      setOpenAlertsCount(data.length);
    } catch {
      // Ignore background fetch failure
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchAlertsCount();
    const interval = setInterval(fetchAlertsCount, 8000);
    return () => clearInterval(interval);
  }, [fetchAlertsCount]);

  return (
    <div className="app-shell">
      <Sidebar isAdmin={isAdmin} user={user} openAlertsCount={openAlertsCount} />
      <div className="main-area">
        <Topbar user={user} onLogout={logout} openAlertsCount={openAlertsCount} />
        <main className="content">
          <Outlet context={{ refreshAlertsCount: fetchAlertsCount }} />
        </main>
      </div>
    </div>
  );
}

