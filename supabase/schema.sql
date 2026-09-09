-- ============================================================
-- LA BITAK0R4_ DE EZEQUIEL - Esquema de base de datos
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- password_config: contraseña única de acceso a la app
-- (el hash SHA-256 se calcula sobre salt + "::" + password)
-- ------------------------------------------------------------
create table if not exists password_config (
  id            int primary key default 1,
  salt          text not null,
  password_hash text not null,
  updated_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- objectives: objetivos generales recurrentes (todos los días)
-- ------------------------------------------------------------
create table if not exists objectives (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- days: un registro por día calendario (id autogenerado por fecha)
-- ------------------------------------------------------------
create table if not exists days (
  id         uuid primary key default gen_random_uuid(),
  date       date not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- La columna notes fue reemplazada por la tabla notes (varias por día)
alter table days drop column if exists notes;

-- ------------------------------------------------------------
-- notes: notas que se van agregando a lo largo de un día
-- ------------------------------------------------------------
create table if not exists notes (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  content    text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- learnings: aprendizajes nuevos ("qué aprendí") de cada día
-- ------------------------------------------------------------
create table if not exists learnings (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  content    text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- daily_objectives: estado por día de cada objetivo.
-- status: none (no hecho), partial (a medias), done (hecho). Antes
-- era boolean "completed"; filas viejas se migran leyendo status.
-- ------------------------------------------------------------
create table if not exists daily_objectives (
  id           uuid primary key default gen_random_uuid(),
  day_id       uuid not null references days(id) on delete cascade,
  objective_id uuid not null references objectives(id) on delete cascade,
  status       text not null default 'none'
    check (status in ('none', 'partial', 'done')),
  unique (day_id, objective_id)
);

-- ------------------------------------------------------------
-- temporal_goals: metas con rango de fechas ("del X al Y")
-- ------------------------------------------------------------
create table if not exists temporal_goals (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  start_date  date not null,
  end_date    date not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  check (end_date >= start_date)
);

-- ------------------------------------------------------------
-- settings: configuración general (fila única id=1)
-- completion_mode: "off" | "count" | "percent" -> cómo se define
-- que un día está "cumplido" para marcarlo en el calendario.
-- threshold: cantidad de objetivos cumplidos (modo count) o
-- porcentaje mínimo (modo percent).
-- ------------------------------------------------------------
create table if not exists settings (
  id              int primary key default 1,
  completion_mode text not null default 'off'
                  check (completion_mode in ('off', 'count', 'percent')),
  threshold       int not null default 1,
  updated_at      timestamptz not null default now()
);

insert into settings (id, completion_mode, threshold)
values (1, 'off', 1)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- reminders: recordatorios ("recuerdos") atados a una fecha.
-- Activos mientras date >= hoy; al pasar la fecha quedan en el
-- historial del día pero dejan de marcar el calendario.
-- completed_at: cuando se marca "completo" (null = pendiente).
-- ------------------------------------------------------------
create table if not exists reminders (
  id           uuid primary key default gen_random_uuid(),
  date         date not null,
  content      text not null,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);
-- Para DB ya existentes (idempotente): agrega la columna si falta.
alter table reminders add column if not exists completed_at timestamptz;

-- ------------------------------------------------------------
-- day_flags: días "destacados" por el usuario (anillo dorado en
-- el calendario). Independiente de la tabla days (se puede
-- destacar cualquier fecha, incluso futura).
-- ------------------------------------------------------------
create table if not exists day_flags (
  date       date primary key,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- push_subscriptions: suscripciones de notificaciones push.
-- El cron manda las notificaciones y borra las que expiran (404/410).
-- ------------------------------------------------------------
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  endpoint    text not null unique,
  keys_p256dh text not null,
  keys_auth   text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Índices útiles
-- ------------------------------------------------------------
create index if not exists idx_days_date on days(date);
create index if not exists idx_notes_date on notes(date, created_at);
create index if not exists idx_learnings_date on learnings(date, created_at);
create index if not exists idx_reminders_date on reminders(date);
create index if not exists idx_daily_objectives_day on daily_objectives(day_id);
create index if not exists idx_daily_objectives_objective on daily_objectives(objective_id);
create index if not exists idx_temporal_goals_range on temporal_goals(start_date, end_date);
create index if not exists idx_day_flags_date on day_flags(date);

-- ------------------------------------------------------------
-- Row Level Security:
-- Se habilita RLS pero NO se crean políticas de acceso.
-- Solo el service role key (que se usa del lado del servidor)
-- puede acceder a las tablas. El anon key del navegador queda
-- bloqueado, aunque se filtre o se exponga.
-- ------------------------------------------------------------
alter table password_config enable row level security;
alter table settings enable row level security;
alter table objectives enable row level security;
alter table days enable row level security;
alter table notes enable row level security;
alter table learnings enable row level security;
alter table reminders enable row level security;
alter table push_subscriptions enable row level security;
alter table day_flags enable row level security;
alter table daily_objectives enable row level security;
alter table temporal_goals enable row level security;