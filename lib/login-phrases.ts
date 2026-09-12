const PHRASES: string[] = [
  "¿Sos el que tiene\nque ser?",
  "¿Sos aquel que\ndebe ser?",
  "¿Quién sos?",
  "¿Sentiste tu\nllamado?",
  "Algo falta.\n¿Sabés qué es?",
  "¿Viste la señal?",
  "¿Qué tenés que dejar\nen el mundo?",
  "El mañana se\nescribe hoy.",
  "¿Quién te espera\nal otro lado?",
  "¿Estás listo para\ndejar huella?",
  "No todo es lo que\nparece. ¿Entrás?",
  "El ojo ya te\nvio llegar.",
  "No hay puertas.\nSolo mirada.",
  "¿Qué buscás\nacá dentro?",
  "La terminal espera.\n¿Y vos?",
];

let last = -1;

export function getRandomLoginPhrase(): string {
  if (PHRASES.length === 1) return PHRASES[0];
  let idx = last;
  while (idx === last) {
    idx = Math.floor(Math.random() * PHRASES.length);
  }
  last = idx;
  return PHRASES[idx];
}