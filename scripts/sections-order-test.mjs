// Regresión de parseDaySectionOrder (lib/sections.ts): las configuraciones
// guardadas de "orden de la bitácora" que todavía nombran claves retiradas
// (cita, objetivos_globales, notas_aprendizajes) deben seguir siendo una
// permutación válida del orden canónico actual, conservar el orden relativo de
// las claves que sobreviven y ubicar las faltantes en su posición canónica.
// Ejecutar: node scripts/sections-order-test.mjs  (requiere Node >= 23)
import assert from "node:assert/strict";
import {
  DEFAULT_DAY_SECTION_ORDER,
  parseDaySectionOrder,
  isDaySectionOrder,
} from "../lib/sections.ts";

const canonical = [...DEFAULT_DAY_SECTION_ORDER];

function assertPermutation(order) {
  assert.equal(order.length, canonical.length);
  assert.equal(new Set(order).size, canonical.length);
  for (const key of order) {
    assert.ok(canonical.includes(key), `clave desconocida: ${key}`);
  }
  assert.ok(isDaySectionOrder(order));
}

function assertStoredOrderPreserved(raw, order) {
  const stored = JSON.parse(raw).filter((key) => canonical.includes(key));
  const positions = stored.map((key) => order.indexOf(key));
  positions.forEach((position, index) => {
    if (index > 0) {
      assert.ok(
        position > positions[index - 1],
        `se alteró el orden relativo guardado en ${raw}`
      );
    }
  });
}

// Config vieja: incluye las claves retiradas y no conoce "la_hoja".
const legacy = JSON.stringify([
  "efemerides",
  "objetivos_globales",
  "cita",
  "objetivos",
  "objetivos_dia",
  "metas_activas",
  "recordatorios",
  "notas_aprendizajes",
]);
const legacyOut = parseDaySectionOrder(legacy);
assertPermutation(legacyOut);
assertStoredOrderPreserved(legacy, legacyOut);
assert.equal(legacyOut.at(-1), "la_hoja");
assert.equal(legacyOut.includes("cita"), false);
assert.equal(legacyOut.includes("objetivos_globales"), false);
assert.equal(legacyOut.includes("notas_aprendizajes"), false);

// Sin config (o con basura): orden canónico completo.
for (const raw of [null, undefined, "", "[]", "not json", '{"a":1}', '["bogus"]']) {
  const out = parseDaySectionOrder(raw);
  assert.deepEqual(out, canonical);
  assertPermutation(out);
}

// Órdenes parciales: se respeta lo guardado y lo faltante se inserta en su
// posición canónica, nunca amontonado al final.
for (const raw of [
  '["la_hoja"]',
  '["metas_activas"]',
  '["objetivos","la_hoja"]',
  '["recordatorios","efemerides"]',
]) {
  const out = parseDaySectionOrder(raw);
  assertPermutation(out);
  assertStoredOrderPreserved(raw, out);
}
assert.deepEqual(parseDaySectionOrder('["la_hoja"]'), canonical);

// Una config que ya está completa y desordenada se respeta tal cual.
const custom = ["la_hoja", "efemerides", "recordatorios", "objetivos", "metas_activas", "objetivos_dia"];
assert.deepEqual(parseDaySectionOrder(JSON.stringify(custom)), custom);

// Claves repetidas o desconocidas se descartan sin duplicar.
const dirty = parseDaySectionOrder('["cita","cita","bogus","efemerides","efemerides"]');
assertPermutation(dirty);
assert.equal(dirty.filter((key) => key === "efemerides").length, 1);
assert.equal(dirty.includes("cita"), false);

console.log("sections-order-test: OK");
