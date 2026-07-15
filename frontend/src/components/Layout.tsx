import { Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function Layout() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="app-shell">
      <Sidebar isAdmin={isAdmin} user={user} />
      <div className="main-area">
        <Topbar user={user} onLogout={logout} />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
