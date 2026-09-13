export type Mood = 1 | 2 | 3 | 4 | 5;

/** Progresión: 1 (mal) es rojo, 3 medio amarillo, 5 (genial) verde neón. */
export const MOOD_COLORS: Record<number, string> = {
  1: "#ff3b5c",
  2: "#ff8a3c",
  3: "#ffe14a",
  4: "#a8e063",
  5: "#00ff9d",
};

export const MOODS: { value: Mood; face: string; label: string }[] = [
  { value: 1, face: "D:", label: "Mal" },
  { value: 2, face: ":(", label: "Apático" },
  { value: 3, face: ":|", label: "Neutral" },
  { value: 4, face: ":)", label: "Bien" },
  { value: 5, face: ":D", label: "Genial" },
];

export function moodLabel(mood: number): string {
  return MOODS.find((entry) => entry.value === mood)?.label ?? `Nivel ${mood}`;
}