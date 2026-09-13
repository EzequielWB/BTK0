# .retirado — S4GR3t_ (chatbot de ánimo) deshabilitado

Carpeta oculta (empieza con `.`) del repositorio. Contiene todo lo relacionado
con la asistente de ánimo `S4GR3t_`, retirada de la app en diciembre de 2026
por decisión del usuario. No la usa el código actual; se conserva por si algún
día se quiere restaurar.

## Contenido

- `app/api/mood/route.ts` — endpoint `POST /api/mood` (personalidad y chat).
- `components/mood-picker.tsx` — selector de ánimo (5 estados) y punto de entrada.
- `components/mood-reaction.tsx` — globo conversacional (typewriter, botón
  CONTESTAR, vibración, historial).
- `public/munieco.png` — avatar del bot (84×84).

## Cómo restaurar

1. Volver cada archivo a su ruta original en `app/`, `components/` y `public/`.
2. En `app/bitacora/[date]/page.tsx` re-agregar:
   - `import { MoodPicker } from "@/components/mood-picker";`
   - la card `Ánimo · ¿cómo estuvo?` con `<MoodPicker date={date}
     initialMood={dayRow?.mood ?? null} previousMoods={previousMoods} />`
   - el cómputo de `previousMoods` (historial de los últimos 6 días con mood).
3. Correr `npm run build` (regenera el precache del service worker, que ya no
   incluye `/munieco.png`).

## Notas

- `lib/mood.ts` (colores/etiquetas de ánimo) quedó en `lib/` porque el
  calendario aún pinta las celdas según el mood guardado con
  `MOOD_COLORS` en `components/calendar-nav.tsx`.
- Los estados de ánimo ya registrados siguen existiendo en la base y
  colorean el calendario; del nuevo registro se encargaba la UI retirada.
- El resumen mensual (`app/api/monthly/`) no es parte del bot y sigue activo.