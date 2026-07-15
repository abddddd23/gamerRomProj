export type Role = "admin" | "worker";
export type PostStatus = "free" | "playing" | "paused" | "maintenance";
export type GameCategory = "football" | "other";
export type PricingMode = "per_match" | "per_time";
export type SessionStatus = "active" | "finished" | "cancelled";
export type PaymentStatus = "unpaid" | "partial" | "paid";
export type PaymentMethod = "cash" | "card" | "other";
export type AlertStatus = "open" | "reviewed" | "resolved";

export interface Worker {
  id: number;
  name: string;
  username: string;
  email: string;
  phone_number: string;
  role: Role;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: number;
  name: string;
  camera_url: string | null;
  status: PostStatus;
  created_at: string;
}

export interface Game {
  id: number;
  name: string;
  ai_label: string | null;
  category: GameCategory;
  pricing_mode: PricingMode;
  price_per_match: number | null;
  price_per_hour: number | null;
  billing_unit_minutes: number | null;
  price_per_time_unit: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Session {
  id: number;
  post_id: number;
  game_id: number | null;
  worker_id: number;
  client_name: string | null;
  start_time: string;
  end_time: string | null;
  status: SessionStatus;
  declared_match_count: number;
  detected_match_count: number;
  manual_adjustment_count: number;
  price_per_unit: number;
  expected_amount: number;
  paid_amount: number;
  difference_amount: number;
  payment_status: PaymentStatus;
  notes: string | null;
  created_at: string;
  post?: Post | null;
  game?: Game | null;
  worker?: Worker | null;
}

export interface Payment {
  id: number;
  session_id: number;
  worker_id: number;
  amount: number;
  method: PaymentMethod;
  reason: string | null;
  created_at: string;
}

export interface Alert {
  id: number;
  session_id: number;
  post_id: number;
  worker_id: number;
  alert_type: "underpaid" | "overpaid" | "count_mismatch" | "manual_override";
  expected_amount: number;
  paid_amount: number;
  difference_amount: number;
  status: AlertStatus;
  note: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Shift {
  id: number;
  worker_id: number;
  start_time: string;
  end_time: string | null;
  expected_revenue: number;
  declared_cash: number;
  actual_paid_revenue: number;
  difference_amount: number;
  status: "open" | "closed";
}

export interface RevenueBreakdown {
  id: number;
  name: string;
  expected_revenue: number;
  paid_revenue: number;
}

export interface DashboardReport {
  today_expected_revenue: number;
  today_paid_revenue: number;
  today_difference: number;
  active_sessions_count: number;
  open_alerts_count: number;
  revenue_by_worker: RevenueBreakdown[];
  revenue_by_post: RevenueBreakdown[];
  most_played_games: { id: number; name: string; sessions_count: number }[];
  detected_vs_declared_matches: { detected: number; declared: number };
}
