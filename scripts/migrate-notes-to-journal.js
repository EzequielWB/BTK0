// Migra las tablas notes y learnings hacia journal (La Hoja) en modo local.
// 1) Hace un backup en .data/backups/ (reusa la lógica de backup-db.js).
// 2) Agrupa notas/aprendizajes por fecha y los vuelca en el content del
//    journal de ese día con subtítulos separados.
// 3) Vacía las tablas notes y learnings.
//
// Uso: node scripts/migrate-notes-to-journal.js
const fs = require("node:fs");
const path = require("node:path");

const dbFile = path.join(process.cwd(), ".data", "local-db.json");
const backupsDir = path.join(process.cwd(), ".data", "backups");
const KEEP = 10;

if (!fs.existsSync(dbFile)) {
  console.log("No hay DB local (" + dbFile + "). Nada que migrar.");
  process.exit(0);
}

function stamp(d) {
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-` +
    `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

fs.mkdirSync(backupsDir, { recursive: true });
const target = path.join(backupsDir, `local-db-${stamp(new Date())}.json`);
fs.copyFileSync(dbFile, target);
console.log("Backup creado: " + target);

const copies = fs
  .readdirSync(backupsDir)
  .filter((f) => /^local-db-\d{8}-\d{6}\.json$/.test(f))
  .sort()
  .reverse();
for (const oldCopy of copies.slice(KEEP)) {
  fs.unlinkSync(path.join(backupsDir, oldCopy));
  console.log("Backup viejo eliminado: " + oldCopy);
}

const db = JSON.parse(fs.readFileSync(dbFile, "utf8"));
const notes = db.notes ?? [];
const learnings = db.learnings ?? [];
const journal = db.journal ?? [];

const byDate = new Map();
for (const item of notes) {
  const bucket = byDate.get(item.date) ?? { notes: [], learnings: [] };
  bucket.notes.push(item);
  byDate.set(item.date, bucket);
}
for (const item of learnings) {
  const bucket = byDate.get(item.date) ?? { notes: [], learnings: [] };
  bucket.learnings.push(item);
  byDate.set(item.date, bucket);
}

if (byDate.size === 0) {
  console.log("No hay notas/aprendizajes que migrar. Listo (solo backup).");
  process.exit(0);
}

function block(title, items) {
  const lines = [`— ${title} —`];
  for (const item of items) lines.push(`• ${item.content}`);
  return lines.join("\n");
}

function buildContent(existing, bucket) {
  const parts = [];
  if (existing && existing.trim()) parts.push(existing.trimEnd());
  if (bucket.notes.length) parts.push(block("Notas del día", bucket.notes));
  if (bucket.learnings.length) parts.push(block("Qué aprendí", bucket.learnings));
  return parts.join("\n\n");
}

const journalByDate = new Map(journal.map((row) => [row.date, row]));
const now = new Date().toISOString();
let migratedDates = 0;
let created = 0;
let merged = 0;

for (const [date, bucket] of byDate) {
  const existing = journalByDate.get(date);
  const content = buildContent(existing?.content ?? "", bucket);
  if (existing) {
    existing.content = content;
    existing.updated_at = now;
    merged++;
  } else {
    journal.push({ date, content, updated_at: now, created_at: now });
    created++;
  }
  migratedDates++;
}

db.journal = journal;
db.notes = [];
db.learnings = [];
fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));

console.log(
  `Migradas notas/aprendizajes de ${migratedDates} fecha(s): ` +
    `${created} hoja(s) creada(s), ${merged} hoja(s) fusionada(s).`
);
console.log("Tablas notes y learnings vaciadas.");