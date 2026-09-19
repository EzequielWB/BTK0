import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

type Row = Record<string, unknown>;
type Store = Record<string, Row[]>;
type ExecResult = {
  data: Row[] | Row | null;
  error: { message: string } | null;
};

const DB_FILE = join(process.cwd(), ".data", "local-db.json");

const TABLES = [
  "password_config",
  "settings",
  "objectives",
  "days",
  "daily_objectives",
  "temporal_goals",
  "reminders",
  "day_flags",
  "annual_reminders",
  "annual_categories",
  "journal",
  "rumiaciones",
  "agenda_categories",
  "agenda_items",
  "day_goals",
  "weight",
  "weight_months",
];

function defaultSeed(): Store {
  const salt = "bitakra-v1-salt";
  const passwordHash = createHash("sha256")
    .update(`${salt}::bitakra`)
    .digest("hex");
  const now = new Date().toISOString();

  return {
    password_config: [
      { id: 1, salt, password_hash: passwordHash, updated_at: now },
    ],
    settings: [
      { id: 1, completion_mode: "off", threshold: 1, section_order: null, colors: null, counters: null, updated_at: now },
    ],
    objectives: [
      {
        id: randomUUID(),
        title: "Tomar agua",
        description: "Mantenerse hidratado durante el día",
        is_active: true,
        completable: false,
        sort_order: 1,
        created_at: now,
      },
      {
        id: randomUUID(),
        title: "Leer",
        description: "Leer al menos 15 minutos",
        is_active: true,
        completable: false,
        sort_order: 2,
        created_at: now,
      },
      {
        id: randomUUID(),
        title: "Moverse",
        description: "Hacer actividad física",
        is_active: true,
        completable: false,
        sort_order: 3,
        created_at: now,
      },
    ],
    days: [],
    daily_objectives: [],
    temporal_goals: [],
    reminders: [],
    annual_reminders: [],
    annual_categories: [],
    journal: [],
    rumiaciones: [],
    agenda_categories: [],
    agenda_items: [],
    day_goals: [],
    weight: [],
    weight_months: [],
  };
}

function load(): Store {
  let db: Store = {};
  if (existsSync(DB_FILE)) {
    try {
      db = JSON.parse(readFileSync(DB_FILE, "utf8")) as Store;
    } catch {
      db = {};
    }
  }
  for (const table of TABLES) {
    if (!db[table]) db[table] = [];
  }
  // settings es una tabla singleton (id=1): siempre debe existir la fila.
  const seed = defaultSeed();
  if (!db.settings || db.settings.length === 0) {
    db.settings = seed.settings;
  }
  return db;
}

function save(db: Store): void {
  const dir = dirname(DB_FILE);
  mkdirSync(dir, { recursive: true });
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

class LocalQuery {
  private table: string;
  private op: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  private payload: Row | null = null;
  private conflictColumn: string | null = null;
  private columns = "*";
  private filters: Array<(row: Row) => boolean> = [];
  private orders: Array<{ column: string; ascending: boolean }> = [];
  private limitCount: number | null = null;
  private singleMode: "none" | "single" | "maybe" = "none";

  constructor(table: string) {
    this.table = table;
  }

  select(columns = "*") {
    this.columns = columns;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  is(column: string, value: unknown) {
    // null/undefined se tratan igual (columnas opcionales ausentes en local).
    this.filters.push((row) => (row[column] ?? null) === value);
    return this;
  }

  ilike(column: string, value: unknown) {
    // Comparación texto case-insensitive (aproximación al ILIKE de Postgres).
    const target = String(value).toLowerCase();
    this.filters.push((row) => {
      const cell = row[column];
      return typeof cell === "string" && cell.toLowerCase() === target;
    });
    return this;
  }

  in(column: string, values: unknown[]) {
    const set = new Set(values);
    this.filters.push((row) => set.has(row[column]));
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push(
      (row) => (row[column] as string | number) >= (value as string | number)
    );
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push(
      (row) => (row[column] as string | number) <= (value as string | number)
    );
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: opts?.ascending ?? true });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.singleMode = "single";
    return this;
  }

  maybeSingle() {
    this.singleMode = "maybe";
    return this;
  }

  insert(payload: Row) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }

  upsert(payload: Row, opts?: { onConflict?: string }) {
    this.op = "upsert";
    this.payload = payload;
    this.conflictColumn = opts?.onConflict || null;
    return this;
  }

  update(payload: Row) {
    this.op = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.op = "delete";
    return this;
  }

  private project(row: Row): Row {
    if (this.columns === "*") return { ...row };
    const cols = this.columns
      .split(",")
      .map((column) => column.trim())
      .filter(Boolean);
    const out: Row = {};
    for (const column of cols) out[column] = row[column];
    return out;
  }

  private applyOrder(rows: Row[]): Row[] {
    if (this.orders.length === 0) return rows;
    const sorted = [...rows];
    sorted.sort((a, b) => {
      for (const { column, ascending } of this.orders) {
        const av = a[column] as string | number;
        const bv = b[column] as string | number;
        if (av === bv) continue;
        const cmp = av < bv ? -1 : 1;
        return ascending ? cmp : -cmp;
      }
      return 0;
    });
    return sorted;
  }

  private withDefaults(payload: Row): Row {
    const now = new Date().toISOString();
    const row: Row = { ...payload };
    if (row.id === undefined) row.id = randomUUID();
    if (row.created_at === undefined) row.created_at = now;
    if (row.updated_at === undefined) row.updated_at = now;
    return row;
  }

  private run(): ExecResult {
    const db = load();
    const rows = (db[this.table] ??= []);

    let resultRows: Row[];

    if (this.op === "select") {
      resultRows = rows.filter((row) => this.filters.every((filter) => filter(row)));
      resultRows = this.applyOrder(resultRows);
      if (this.limitCount !== null) resultRows = resultRows.slice(0, this.limitCount);
    } else if (this.op === "insert" || this.op === "upsert") {
      const payload = { ...(this.payload ?? {}) };
      if (this.op === "upsert" && this.conflictColumn) {
        const conflict = this.conflictColumn as string;
        const existingIndex = rows.findIndex(
          (row) => row[conflict] === payload[conflict]
        );
        if (existingIndex >= 0) {
          const merged = { ...rows[existingIndex], ...payload };
          rows[existingIndex] = merged;
          resultRows = [merged];
        } else {
          const created = this.withDefaults(payload);
          rows.push(created);
          resultRows = [created];
        }
      } else {
        const created = this.withDefaults(payload);
        rows.push(created);
        resultRows = [created];
      }
    } else if (this.op === "update") {
      const matched = rows.filter((row) =>
        this.filters.every((filter) => filter(row))
      );
      for (const row of matched) Object.assign(row, this.payload ?? {});
      resultRows = matched;
    } else {
      const matched = rows.filter((row) =>
        this.filters.every((filter) => filter(row))
      );
      for (const row of matched) {
        const index = rows.indexOf(row);
        if (index >= 0) rows.splice(index, 1);
      }
      resultRows = [];
    }

    if (this.op !== "select") save(db);

    const projected = resultRows.map((row) => this.project(row));

    let data: Row[] | Row | null = projected;
    let error: { message: string } | null = null;

    if (this.singleMode === "single") {
      if (projected.length === 0) {
        data = null;
        error = { message: "No rows found" };
      } else if (projected.length > 1) {
        data = null;
        error = { message: "Multiple rows found" };
      } else {
        data = projected[0];
      }
    } else if (this.singleMode === "maybe") {
      data = projected[0] ?? null;
    }

    const mutationWithoutSelect =
      (this.op === "update" || this.op === "delete") && this.columns === "*";

    return { data: mutationWithoutSelect ? null : data, error };
  }

  then<TResult1 = ExecResult, TResult2 = never>(
    onfulfilled?: (value: ExecResult) => TResult1 | PromiseLike<TResult1>,
    onrejected?: (reason: unknown) => TResult2 | PromiseLike<TResult2>
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve()
      .then(() => this.run())
      .then(onfulfilled, onrejected);
  }
}

function arToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysISO(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Ídem lib/completion.statusOf: filas viejas usaban boolean "completed".
function statusOfRow(row: Row): string {
  const status = row.status as string | undefined;
  if (
    status === "none" ||
    status === "partial" ||
    status === "done" ||
    status === "ignored"
  ) {
    return status;
  }
  return row.completed ? "done" : "none";
}

// Congela el valor de los días pasados (replica freeze_day_scores).
function freezeDayScoresLocal(db: Store): boolean {
  const today = arToday();
  const settings = (db.settings ?? []).find((row) => row.id === 1);
  const mode = (settings?.completion_mode as string | undefined) ?? "off";
  const threshold = Math.max(1, Number(settings?.threshold ?? 1));
  const now = new Date().toISOString();

  let changed = false;
  for (const day of db.days ?? []) {
    const dayDate = day.date as string;
    if (dayDate >= today || day.score_frozen_at) continue;

    const activeCount = (db.objectives ?? []).filter(
      (objective) =>
        objective.is_active === true &&
        ((objective.created_at as string)?.slice(0, 10) ?? "0000-00-00") <= dayDate
    ).length;

    let points = 0;
    let ignored = 0;
    for (const entry of db.daily_objectives ?? []) {
      if (entry.day_id !== day.id) continue;
      const status = statusOfRow(entry);
      if (status === "ignored") ignored++;
      else if (status === "done") points += 1;
      else if (status === "partial") points += 0.5;
    }

    const total = Math.max(0, activeCount - ignored);
    let percent: number | null = null;
    let fulfilled = false;
    if (total > 0) {
      percent = Math.min(100, Math.round((points / total) * 100));
      if (mode === "count") fulfilled = points >= threshold;
      else if (mode === "percent") {
        fulfilled = percent >= Math.min(100, threshold);
      }
    }

    day.percent = percent;
    day.fulfilled = fulfilled;
    day.score_frozen_at = now;
    day.updated_at = now;
    changed = true;
  }
  return changed;
}

// Arrastra objetivos del día pendientes hacia la fecha siguiente (replica
// rollover_pending_day_goals): llena los huecos hasta hoy, nunca a futuro.
function rolloverDayGoalsLocal(db: Store): boolean {
  const today = arToday();
  let changed = false;

  for (let guard = 0; guard < 60; guard++) {
    let inserted = false;
    const goals = db.day_goals ?? [];
    for (const goal of goals) {
      const nextDate = addDaysISO(goal.date as string, 1);
      if (nextDate > today) continue;
      if (goal.completed_at) continue;
      if (goal.rollover_stopped) continue;
      const alreadyCopied = goals.some(
        (copy) =>
          (copy.date as string) === nextDate &&
          (copy.rollover_from as string | undefined) === goal.id
      );
      if (alreadyCopied) continue;
      (db.day_goals ??= []).push({
        id: randomUUID(),
        date: nextDate,
        title: goal.title,
        rollover_from: goal.id,
        created_at: new Date().toISOString(),
      });
      inserted = true;
      changed = true;
    }
    if (!inserted) break;
  }
  return changed;
}

// Cancela el arrastre de toda la cadena de un day_goal (replica
// stop_day_goal_chain): marca los ancestros y las copias.
function stopDayGoalChainLocal(db: Store, goalId: string): boolean {
  const goals = db.day_goals ?? [];
  const chain = new Set<string>();
  const queue = [goalId];

  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (chain.has(id)) continue;
    chain.add(id);
    for (const goal of goals) {
      if ((goal.rollover_from as string | undefined) === id) {
        queue.push(goal.id as string);
      }
    }
    const goal = goals.find((row) => row.id === id);
    if (goal?.rollover_from) queue.push(goal.rollover_from as string);
  }

  let changed = false;
  for (const goal of goals) {
    if (chain.has(goal.id as string) && goal.rollover_stopped !== true) {
      goal.rollover_stopped = true;
      changed = true;
    }
  }
  return changed;
}

export function createLocalClient() {
  return {
    from: (table: string) => new LocalQuery(table),
    rpc: async (
      name: string,
      args?: Record<string, unknown>
    ): Promise<ExecResult> => {
      const db = load();
      let changed = false;
      if (name === "auto_complete_expired_reminders") {
        const today = arToday();
        for (const row of db.reminders ?? []) {
          if (!row.completed_at && (row.date as string) < today) {
            row.completed_at = row.date;
            changed = true;
          }
        }
      } else if (name === "freeze_day_scores") {
        changed = freezeDayScoresLocal(db);
      } else if (name === "rollover_pending_day_goals") {
        changed = rolloverDayGoalsLocal(db);
      } else if (name === "stop_day_goal_chain") {
        const goalId = String(args?.goal_id ?? "");
        if (goalId) changed = stopDayGoalChainLocal(db, goalId);
      } else {
        return {
          data: null,
          error: { message: `RPC '${name}' no implementado en modo local.` },
        };
      }
      if (changed) save(db);
      return { data: null, error: null };
    },
  };
}