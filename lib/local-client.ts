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
  "notes",
  "learnings",
  "reminders",
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
    settings: [{ id: 1, completion_mode: "off", threshold: 1, updated_at: now }],
    objectives: [
      {
        id: randomUUID(),
        title: "Tomar agua",
        description: "Mantenerse hidratado durante el día",
        is_active: true,
        sort_order: 1,
        created_at: now,
      },
      {
        id: randomUUID(),
        title: "Leer",
        description: "Leer al menos 15 minutos",
        is_active: true,
        sort_order: 2,
        created_at: now,
      },
      {
        id: randomUUID(),
        title: "Moverse",
        description: "Hacer actividad física",
        is_active: true,
        sort_order: 3,
        created_at: now,
      },
    ],
    days: [],
    daily_objectives: [],
    temporal_goals: [],
    notes: [],
    learnings: [],
    reminders: [],
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

export function createLocalClient() {
  return {
    from: (table: string) => new LocalQuery(table),
  };
}