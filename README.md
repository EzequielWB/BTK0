# LA_BITAK0R4_

Bitácora personal de un solo usuario con estética HUD cyberpunk: registrá el día, marcá objetivos, dejá notas y aprendizajes, recordatorios, efemérides con categorías, y un espacio estilo "hoja" para pensamientos extensos. Todo en español rioplatense.

## Features

- **HUD cyberpunk**: reloj dual, LEDs de sistema, glitch, frase críptica en el login.
- **Objetivos diarios**: cada objetivo tiene 3 slots por día (✓ completo / − a medias / ✕ no), con % del día, y se puede **ignorar** un objetivo para un día (queda fuera de la cuenta).
- **Notas del día y aprendizajes** ("Qué aprendí"): por fecha, con marcado de colores en el calendario.
- **Recordatorios** ("recuerdos"): atados a una fecha, con estado pendiente/completo, editables y borrables. Los días con recordatorios pendientes se marcan en rojo en el calendario.
- **Efemérides**: fechas que se repiten todos los años (cumpleaños, aniversarios) agrupables en **categorías** propias (crear, renombrar, reordenar con ▲▼, borrar; "Sin separar" si no tienen). Al guardar una efeméride el menú te deja elegir dónde ubicarla. Se marcan en el calendario y aparecen en la vista del día.
- **La Hoja**: botón con forma de hoja en la cabecera del día → cuaderno blanco con renglones para pensamientos extensos, con autoguardado y una fila por día (1 fila = 1 día; si queda vacía se borra sola).
- **Metas temporales**: objetivos con rango de fechas ("Premios"), activos/desactivados, que se muestran solo los días dentro del rango.
- **Días destacados**: botón ★ en la vista del día (anillo dorado en el calendario).
- **Días futuros en solo lectura**: podés dejar recordatorios, pero no editar.

## Modos de almacenamiento

La app funciona con **Supabase** o en **modo LOCAL** sin ningún servicio externo:

| | LOCAL | SUPABASE |
|---|---|---|
| Cómo se activa | Sin `NEXT_PUBLIC_SUPABASE_URL` cargada (o con `LOCAL_MODE=1`) | Con las claves de Supabase cargadas |
| Dónde guarda | Archivo `.data/local-db.json` | Base Postgres del proyecto |
| Requisitos | Ninguno | Correr `supabase/schema.sql` en el SQL editor |

En el HUD el estado se refleja en los LEDs: **LOCAL / NO-DB** o **SUPA / SYNC**.

## Requisitos

- Node.js 18+ (probado con Node 20/24)
- npm

## Puesta en marcha

```bash
npm install
npm run dev     # desarrollo
# o para probarlo "en producción":
npm run build
npm start
```

Abrí `http://localhost:3000`.

**Clave de acceso**: por defecto es `bitakra` (definida en el seed local / en `password_config`). Se cambia desde **Ajustes → Cambiar clave**.

### Configure .env.local (opcional)

```bash
cp .env.local.example .env.local
```

Completando las claves de Supabase y/o OpenRouter. Sin `.env.local`, la app arranca igual en modo LOCAL.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (`next dev`) |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción (build previo) |
| `npm run lint` | ESLint |
| `npm run check` | TypeScript (`tsc --noEmit`) + ESLint |
| `npm run smoke` | Smoke test E2E (Playwright) |
| `npm run backup` | Respalda `.data/local-db.json` en `.data/backups/` |

## Smoke test

Requiere el server de producción corriendo en `http://localhost:3000` y la clave `bitakra`. Cubre el flujo completo: login, objetivos, ignorar, ajustes, notas, aprendizajes, La Hoja, stats, resumen IA, recordatorios, efemérides + categorías, día destacado y borrado defensivo del día.

```bash
npm run build
npm start                 # en otra terminal
npm run smoke
```

## Resumen mensual con IA (opcional)

En **Stats → "¿Cómo estuvo el mes?"** la app manda un resumen de los últimos 30 días a un modelo de texto. Necesitás:

- `OPENROUTER_API_KEY` (la usan el resumen y el chat de dinosaurios si se reactiva).
- `OPENROUTER_MODEL` (por defecto `google/gemma-4-31b-it:free`).
- Opcional `GROQ_API_KEY` como proveedor de respaldo.
- `SITE_URL` para que OpenRouter identifique el sitio.

Si no hay clave, el botón responde con un mensaje de error elegante; el resto de la app funciona igual.

## Despliegue en Vercel

1. Importá el proyecto (build estándar; `next build` se encarga solo).
2. Seteá en las variables de entorno las mismas del `.env.local` (Supabase y, si querés, OpenRouter).
3. En Supabase, corré `supabase/schema.sql` (idempotente) en el SQL editor del proyecto.

> Nota: la autenticación es por cookie propia (`bitakra_session`) y el acceso es de un solo usuario. El anon key del navegador queda bloqueado por RLS (sin políticas); todo pasa por el service role del servidor.

## Base de datos

El esquema completo (tablas + RLS) está en `supabase/schema.sql`. En modo LOCAL no se necesita nada: el archivo `.data/local-db.json` se crea solo y está gitignoreado.