"use client";

import { useState, useTransition } from "react";
import { saveMoodAction } from "@/lib/actions";
import { MOOD_COLORS, MOODS, moodLabel } from "@/lib/mood";
import { MoodReaction } from "@/components/mood-reaction";

export function MoodPicker({
  date,
  initialMood,
  previousMoods,
}: {
  date: string;
  initialMood: number | null;
  previousMoods: number[];
}) {
  const [mood, setMood] = useState<number | null>(initialMood);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [reaction, setReaction] = useState<number | null>(null);

  function pick(value: number) {
    if (pending) return;
    const next = mood === value ? null : value;
    setMood(next);
    setMessage(null);
    if (next === null) {
      setReaction(null);
    } else {
      setReaction(next);
    }
    startTransition(async () => {
      const res = await saveMoodAction(date, next);
      if (res?.error) {
        setMood(initialMood);
        setMessage(res.error);
        setReaction(null);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-1">
        {MOODS.map(({ value, face, label }) => {
          const on = mood === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => pick(value)}
              disabled={pending}
              aria-pressed={on}
              aria-label={`Ánimo: ${label}`}
              title={label}
              className={`cyb-mood-btn ${on ? "on" : ""}`}
            >
              {face}
            </button>
          );
        })}
      </div>

      {mood && (
        <div
          className="cyb-mood-battery"
          role="img"
          aria-label={`Ánimo ${moodLabel(mood)} (${mood}/5)`}
        >
          {[1, 2, 3, 4, 5].map((level) => (
            <i
              key={level}
              className={level <= mood ? "lit" : ""}
              style={
                level <= mood
                  ? { background: MOOD_COLORS[level] }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {message && (
        <p role="status" aria-live="polite" className="cyb-hint text-sm">
          {message}
        </p>
      )}

      {reaction !== null && reaction === mood && (
        <MoodReaction
          key={`${date}-${reaction}`}
          date={date}
          mood={reaction}
          previousMoods={previousMoods}
          onClose={() => setReaction(null)}
        />
      )}
    </div>
  );
}