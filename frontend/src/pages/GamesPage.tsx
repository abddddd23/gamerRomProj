import { FormEvent, useEffect, useState } from "react";
import { Gamepad2, Save, SquarePlus } from "lucide-react";

import { api, getApiError } from "../api/client";
import { Game, GameCategory, PricingMode } from "../api/types";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";

const categories: GameCategory[] = ["football", "other"];
const pricingModes: PricingMode[] = ["per_match", "per_time"];

export function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [form, setForm] = useState({
    name: "",
    ai_label: "",
    category: "football" as GameCategory,
    pricing_mode: "per_match" as PricingMode,
    price_per_match: "100",
    price_per_hour: "",
    billing_unit_minutes: "20",
    price_per_time_unit: "100",
  });
  const [edits, setEdits] = useState<Record<number, Partial<Game>>>({});
  const [error, setError] = useState("");

  async function loadGames() {
    const { data } = await api.get<Game[]>("/games");
    setGames(data);
  }

  useEffect(() => {
    loadGames().catch((err) => setError(getApiError(err)));
  }, []);

  async function createGame(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post("/games", {
        name: form.name,
        ai_label: form.ai_label || null,
        category: form.category,
        pricing_mode: form.pricing_mode,
        price_per_match: form.pricing_mode === "per_match" ? Number(form.price_per_match) : null,
        price_per_hour: form.pricing_mode === "per_time" && form.price_per_hour ? Number(form.price_per_hour) : null,
        billing_unit_minutes: form.pricing_mode === "per_time" ? Number(form.billing_unit_minutes) : null,
        price_per_time_unit: form.pricing_mode === "per_time" ? Number(form.price_per_time_unit) : null,
        is_active: true,
      });
      setForm({
        name: "",
        ai_label: "",
        category: "football",
        pricing_mode: "per_match",
        price_per_match: "100",
        price_per_hour: "",
        billing_unit_minutes: "20",
        price_per_time_unit: "100",
      });
      await loadGames();
      setError("");
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function saveGame(game: Game) {
    const update = edits[game.id] ?? {};
    try {
      await api.patch(`/games/${game.id}`, {
        name: update.name ?? game.name,
        ai_label: (update.ai_label ?? game.ai_label) || null,
        category: update.category ?? game.category,
        pricing_mode: update.pricing_mode ?? game.pricing_mode,
        price_per_match: update.price_per_match ?? game.price_per_match,
        price_per_hour: update.price_per_hour ?? game.price_per_hour,
        billing_unit_minutes: update.billing_unit_minutes ?? game.billing_unit_minutes,
        price_per_time_unit: update.price_per_time_unit ?? game.price_per_time_unit,
        is_active: update.is_active ?? game.is_active,
      });
      await loadGames();
      setError("");
    } catch (err) {
      setError(getApiError(err));
    }
  }

  function updateEdit(gameId: number, update: Partial<Game>) {
    setEdits((current) => ({ ...current, [gameId]: { ...current[gameId], ...update } }));
  }

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <h1>Games</h1>
          <p>Configure pricing rules for match-based and time-based games.</p>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <form className="toolbar-form form-card" onSubmit={createGame}>
        <label>
          Game name
          <input placeholder="Game name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label>
          AI label
          <input
            placeholder="FC, GTA, MK"
            value={form.ai_label}
            onChange={(event) => setForm({ ...form, ai_label: event.target.value })}
          />
        </label>
        <label>
          Category
        <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as GameCategory })}>
          {categories.map((category) => (
            <option value={category} key={category}>
              {category}
            </option>
          ))}
        </select>
        </label>
        <label>
          Pricing
        <select
          value={form.pricing_mode}
          onChange={(event) => setForm({ ...form, pricing_mode: event.target.value as PricingMode })}
        >
          {pricingModes.map((mode) => (
            <option value={mode} key={mode}>
              {mode}
            </option>
          ))}
        </select>
        </label>
        <label>
          Match price
        <input
          placeholder="Match price"
          type="number"
          value={form.price_per_match}
          onChange={(event) => setForm({ ...form, price_per_match: event.target.value })}
        />
        </label>
        <label>
          Price per 20 min
        <input
          placeholder="Price per block"
          type="number"
          value={form.price_per_time_unit}
          onChange={(event) => setForm({ ...form, price_per_time_unit: event.target.value })}
        />
        </label>
        <label>
          Block minutes
        <input
          placeholder="20"
          type="number"
          value={form.billing_unit_minutes}
          onChange={(event) => setForm({ ...form, billing_unit_minutes: event.target.value })}
        />
        </label>
        <label>
          Hourly fallback
        <input
          placeholder="Fallback only"
          type="number"
          value={form.price_per_hour}
          onChange={(event) => setForm({ ...form, price_per_hour: event.target.value })}
        />
        </label>
        <button className="primary-button">
          <SquarePlus size={17} />
          Add game
        </button>
      </form>

      <DataTable
        empty={games.length === 0}
        emptyState={<EmptyState title="No games yet" description="Create games and pricing rules." icon={Gamepad2} />}
      >
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>AI label</th>
              <th>Category</th>
              <th>Pricing</th>
              <th>Match</th>
              <th>Block</th>
              <th>Unit price</th>
              <th>Hour fallback</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={game.id}>
                <td>
                  <input value={edits[game.id]?.name ?? game.name} onChange={(event) => updateEdit(game.id, { name: event.target.value })} />
                </td>
                <td>
                  <input
                    value={edits[game.id]?.ai_label ?? game.ai_label ?? ""}
                    onChange={(event) => updateEdit(game.id, { ai_label: event.target.value })}
                  />
                </td>
                <td>
                  <select
                    value={edits[game.id]?.category ?? game.category}
                    onChange={(event) => updateEdit(game.id, { category: event.target.value as GameCategory })}
                  >
                    {categories.map((category) => (
                      <option value={category} key={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={edits[game.id]?.pricing_mode ?? game.pricing_mode}
                    onChange={(event) => updateEdit(game.id, { pricing_mode: event.target.value as PricingMode })}
                  >
                    {pricingModes.map((mode) => (
                      <option value={mode} key={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    value={edits[game.id]?.price_per_match ?? game.price_per_match ?? ""}
                    onChange={(event) => updateEdit(game.id, { price_per_match: Number(event.target.value) })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={edits[game.id]?.billing_unit_minutes ?? game.billing_unit_minutes ?? ""}
                    onChange={(event) => updateEdit(game.id, { billing_unit_minutes: Number(event.target.value) })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={edits[game.id]?.price_per_time_unit ?? game.price_per_time_unit ?? ""}
                    onChange={(event) => updateEdit(game.id, { price_per_time_unit: Number(event.target.value) })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={edits[game.id]?.price_per_hour ?? game.price_per_hour ?? ""}
                    onChange={(event) => updateEdit(game.id, { price_per_hour: Number(event.target.value) })}
                  />
                </td>
                <td>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={edits[game.id]?.is_active ?? game.is_active}
                      onChange={(event) => updateEdit(game.id, { is_active: event.target.checked })}
                    />
                    <StatusBadge value={edits[game.id]?.is_active ?? game.is_active ? "active" : "inactive"} />
                  </label>
                </td>
                <td>
                  <button className="secondary-button" onClick={() => saveGame(game)}>
                    <Save size={16} />
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>
    </section>
  );
}
