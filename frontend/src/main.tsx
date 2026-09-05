import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AlertsPage } from "./pages/AlertsPage";
import { AboutPage } from "./pages/AboutPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { GamesPage } from "./pages/GamesPage";
import { LoginPage } from "./pages/LoginPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { PostsPage } from "./pages/PostsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SessionsPage } from "./pages/SessionsPage";
import { SetupPage } from "./pages/SetupPage";
import { ShiftPage } from "./pages/ShiftPage";
import { WorkersPage } from "./pages/WorkersPage";
import "./styles/styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route element={<ProtectedRoute allowPasswordChange />}>
              <Route path="/change-password" element={<ChangePasswordPage />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="/sessions" element={<SessionsPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/shift" element={<ShiftPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route element={<ProtectedRoute adminOnly />}>
                  <Route path="/posts" element={<PostsPage />} />
                  <Route path="/games" element={<GamesPage />} />
                  <Route path="/workers" element={<WorkersPage />} />
                  <Route path="/alerts" element={<AlertsPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
