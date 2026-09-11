// Respalda la DB local (modo sin Supabase) en .data/backups/.
// Mantiene las últimas 10 copias y borra las más viejas.
const fs = require("node:fs");
const path = require("node:path");

const dbFile = path.join(process.cwd(), ".data", "local-db.json");
const backupsDir = path.join(process.cwd(), ".data", "backups");
const KEEP = 10;

if (!fs.existsSync(dbFile)) {
  console.log("No hay DB local todavía (" + dbFile + "). Nada que respaldar.");
  process.exit(0);
}

fs.mkdirSync(backupsDir, { recursive: true });

function stamp(d) {
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-` +
    `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

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