import { Game, Session } from "../api/types";

export function getBillingUnitMinutes(game?: Game | null) {
  return game?.billing_unit_minutes ?? 20;
}

export function getPricePerTimeUnit(game?: Game | null) {
  if (!game) return null;
  if (game.price_per_time_unit !== null) return game.price_per_time_unit;
  if (game.price_per_hour !== null) return game.price_per_hour / 3;
  return null;
}

export function getSessionDurationSeconds(session: Session) {
  const start = new Date(session.start_time).getTime();
  const end = session.end_time ? new Date(session.end_time).getTime() : Date.now();
  return Math.max((end - start) / 1000, 0);
}

export function getBilledUnits(session: Session, game?: Game | null) {
  if (!game || game.pricing_mode !== "per_time") return null;
  const unitMinutes = getBillingUnitMinutes(game);
  return Math.max(1, Math.ceil(getSessionDurationSeconds(session) / (unitMinutes * 60)));
}

export function formatDuration(session: Session) {
  const totalMinutes = Math.max(Math.floor(getSessionDurationSeconds(session) / 60), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function billingRuleLabel(game?: Game | null) {
  if (!game) return "Not assigned";
  if (game.pricing_mode === "per_match") return "Per match";
  return `${getBillingUnitMinutes(game)} min blocks`;
}
