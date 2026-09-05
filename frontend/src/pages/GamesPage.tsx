import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Gamepad2, RefreshCw, Save, SquarePlus } from "lucide-react";

import { api, getApiError } from "../api/client";
import { Game, GameCategory, PricingMode } from "../api/types";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";

const categories: GameCategory[] = ["football", "other"];
const pricingModes: PricingMode[] = ["per_match", "per_time"];

function parseNumOrNull(val: string): number | null {
  const trimmed = val.trim();
  if (trimmed === "") return null;
  const num = Number(trimmed);
  return Number.isNaN(num) ? null : num;
}

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
  const [successMessage, setSuccessMessage] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);

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
        name: form.name.trim(),
        ai_label: form.ai_label.trim() || null,
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
      setSuccessMessage("New game created successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function saveGame(game: Game) {
    const update = edits[game.id] ?? {};
    const currentMode = update.pricing_mode ?? game.pricing_mode;

    const payload: Record<string, any> = {
      name: (update.name ?? game.name).trim(),
      ai_label: (update.ai_label !== undefined ? update.ai_label : game.ai_label)?.trim() || null,
      category: update.category ?? game.category,
      pricing_mode: currentMode,
      is_active: update.is_active !== undefined ? update.is_active : game.is_active,
    };

    if (currentMode === "per_match") {
      const ppm = update.price_per_match !== undefined ? update.price_per_match : game.price_per_match;
      payload.price_per_match = ppm !== null && ppm !== undefined ? Number(ppm) : 100;
      payload.price_per_hour = null;
      payload.billing_unit_minutes = null;
      payload.price_per_time_unit = null;
    } else {
      payload.price_per_match = null;
      const pph = update.price_per_hour !== undefined ? update.price_per_hour : game.price_per_hour;
      payload.price_per_hour = pph !== null && pph !== undefined ? Number(pph) : null;
      const bum = update.billing_unit_minutes !== undefined ? update.billing_unit_minutes : game.billing_unit_minutes;
      payload.billing_unit_minutes = bum ? Math.max(1, Number(bum)) : 20;
      const ppt = update.price_per_time_unit !== undefined ? update.price_per_time_unit : game.price_per_time_unit;
      payload.price_per_time_unit = ppt !== null && ppt !== undefined ? Number(ppt) : 100;
    }

    setSavingId(game.id);
    setError("");
    try {
      await api.patch(`/games/${game.id}`, payload);
      setEdits((prev) => {
        const next = { ...prev };
        delete next[game.id];
        return next;
      });
      setSuccessId(game.id);
      setSuccessMessage(`Pricing for "${game.name}" saved successfully!`);
      setTimeout(() => {
        setSuccessId(null);
        setSuccessMessage("");
      }, 3000);
      await loadGames();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingId(null);
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
          <p>Configure pricing rules for match-based and time-based games. Edit directly in the table and click Save (or press Enter).</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {successMessage && <div className="success-banner">{successMessage}</div>}

      <form className="toolbar-form form-card" onSubmit={createGame}>
        <label>
          Game name
          <input
            placeholder="Game name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
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
          <select
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value as GameCategory })}
          >
            {categories.map((category) => (
              <option value={category} key={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label>
          Pricing mode
          <select
            value={form.pricing_mode}
            onChange={(event) => setForm({ ...form, pricing_mode: event.target.value as PricingMode })}
          >
            {pricingModes.map((mode) => (
              <option value={mode} key={mode}>
                {mode === "per_match" ? "Per Match" : "Per Time (Block)"}
              </option>
            ))}
          </select>
        </label>
        {form.pricing_mode === "per_match" ? (
          <label>
            Match price (DA)
            <input
              placeholder="100"
              type="number"
              min="0"
              step="any"
              value={form.price_per_match}
              onChange={(event) => setForm({ ...form, price_per_match: event.target.value })}
              required
            />
          </label>
        ) : (
          <>
            <label>
              Block minutes
              <input
                placeholder="20"
                type="number"
                min="1"
                value={form.billing_unit_minutes}
                onChange={(event) => setForm({ ...form, billing_unit_minutes: event.target.value })}
                required
              />
            </label>
            <label>
              Price per block (DA)
              <input
                placeholder="100"
                type="number"
                min="0"
                step="any"
                value={form.price_per_time_unit}
                onChange={(event) => setForm({ ...form, price_per_time_unit: event.target.value })}
                required
              />
            </label>
            <label>
              Hourly fallback (DA)
              <input
                placeholder="Fallback only"
                type="number"
                min="0"
                step="any"
                value={form.price_per_hour}
                onChange={(event) => setForm({ ...form, price_per_hour: event.target.value })}
              />
            </label>
          </>
        )}
        <button className="primary-button" type="submit">
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
              <th>Match Price</th>
              <th>Block (min)</th>
              <th>Unit Price</th>
              <th>Hour Fallback</th>
              <th>Active</th>
              <th className="sticky-action-col">Save</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => {
              const gameEdit = edits[game.id];
              const isDirty = gameEdit !== undefined && Object.keys(gameEdit).length > 0;
              const currentMode = gameEdit?.pricing_mode ?? game.pricing_mode;
              const isMatch = currentMode === "per_match";

              return (
                <tr key={game.id} className={isDirty ? "dirty-row" : ""}>
                  <td>
                    <input
                      className="table-input"
                      value={gameEdit?.name ?? game.name}
                      onChange={(event) => updateEdit(game.id, { name: event.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && saveGame(game)}
                    />
                  </td>
                  <td>
                    <input
                      className="table-input"
                      placeholder="AI Label"
                      value={gameEdit?.ai_label !== undefined ? (gameEdit.ai_label ?? "") : (game.ai_label ?? "")}
                      onChange={(event) => updateEdit(game.id, { ai_label: event.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && saveGame(game)}
                    />
                  </td>
                  <td>
                    <select
                      className="table-input"
                      value={gameEdit?.category ?? game.category}
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
                      className="table-input"
                      value={currentMode}
                      onChange={(event) => updateEdit(game.id, { pricing_mode: event.target.value as PricingMode })}
                    >
                      {pricingModes.map((mode) => (
                        <option value={mode} key={mode}>
                          {mode === "per_match" ? "per match" : "per time"}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {isMatch ? (
                      <input
                        className="table-input"
                        type="number"
                        min="0"
                        step="any"
                        placeholder="100"
                        value={gameEdit?.price_per_match ?? game.price_per_match ?? ""}
                        onChange={(event) =>
                          updateEdit(game.id, { price_per_match: parseNumOrNull(event.target.value) as any })
                        }
                        onKeyDown={(e) => e.key === "Enter" && saveGame(game)}
                      />
                    ) : (
                      <span className="disabled-cell-text">—</span>
                    )}
                  </td>
                  <td>
                    {!isMatch ? (
                      <input
                        className="table-input"
                        type="number"
                        min="1"
                        placeholder="20"
                        value={gameEdit?.billing_unit_minutes ?? game.billing_unit_minutes ?? ""}
                        onChange={(event) =>
                          updateEdit(game.id, { billing_unit_minutes: parseNumOrNull(event.target.value) as any })
                        }
                        onKeyDown={(e) => e.key === "Enter" && saveGame(game)}
                      />
                    ) : (
                      <span className="disabled-cell-text">—</span>
                    )}
                  </td>
                  <td>
                    {!isMatch ? (
                      <input
                        className="table-input"
                        type="number"
                        min="0"
                        step="any"
                        placeholder="100"
                        value={gameEdit?.price_per_time_unit ?? game.price_per_time_unit ?? ""}
                        onChange={(event) =>
                          updateEdit(game.id, { price_per_time_unit: parseNumOrNull(event.target.value) as any })
                        }
                        onKeyDown={(e) => e.key === "Enter" && saveGame(game)}
                      />
                    ) : (
                      <span className="disabled-cell-text">—</span>
                    )}
                  </td>
                  <td>
                    {!isMatch ? (
                      <input
                        className="table-input"
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Fallback"
                        value={gameEdit?.price_per_hour ?? game.price_per_hour ?? ""}
                        onChange={(event) =>
                          updateEdit(game.id, { price_per_hour: parseNumOrNull(event.target.value) as any })
                        }
                        onKeyDown={(e) => e.key === "Enter" && saveGame(game)}
                      />
                    ) : (
                      <span className="disabled-cell-text">—</span>
                    )}
                  </td>
                  <td>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={gameEdit?.is_active ?? game.is_active}
                        onChange={(event) => updateEdit(game.id, { is_active: event.target.checked })}
                      />
                      <StatusBadge value={gameEdit?.is_active ?? game.is_active ? "active" : "inactive"} />
                    </label>
                  </td>
                  <td className="sticky-action-col">
                    <button
                      type="button"
                      className={isDirty ? "primary-button" : "secondary-button"}
                      disabled={savingId === game.id}
                      onClick={() => saveGame(game)}
                      title="Save changes to this game (or press Enter)"
                    >
                      {savingId === game.id ? (
                        <RefreshCw size={15} className="spin" />
                      ) : successId === game.id ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        <Save size={15} />
                      )}
                      {savingId === game.id
                        ? "Saving..."
                        : successId === game.id
                        ? "Saved!"
                        : isDirty
                        ? "Save *"
                        : "Save"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </DataTable>
    </section>
  );
}
