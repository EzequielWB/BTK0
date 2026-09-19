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
  completable boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- Para DB ya existentes (idempotente): objetivos "completable" permiten
-- registrar una nota de qué se hizo ese día.
alter table objectives add column if not exists completable boolean not null default false;

-- ------------------------------------------------------------
-- days: un registro por día calendario (id autogenerado por fecha)
-- ------------------------------------------------------------
create table if not exists days (
  id         uuid primary key default gen_random_uuid(),
  date       date not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ánimo del día (1 = mal, 5 = genial). NULL = sin registrar.
alter table days add column if not exists mood int check (mood between 1 and 5);

-- "Congelado" del valor del día: una vez que el día pasó, se calcula una sola
-- vez (primer render posterior) y se guarda acá. percent = % de objetivos
-- (0-100, null si el día no tuvo objetivos contables), fulfilled = día
-- cumplido según Ajustes, score_frozen_at = momento en que se congeló (null =
-- todavía no congelado). Recalcular/agregar objetivos después no los cambia.
alter table days add column if not exists percent int;
alter table days add column if not exists fulfilled boolean;
alter table days add column if not exists score_frozen_at timestamptz;

-- La columna notes fue reemplazada por la tabla notes (varias por día)
alter table days drop column if exists notes;

-- Las tablas notes y learnings fueron retiradas: sus datos se migraron a la
-- tabla journal ("La Hoja", una fila por día). Si por error siguen existiendo
-- en bases viejas, se pueden dropear:
--   drop table if exists notes, learnings;

-- ------------------------------------------------------------
-- daily_objectives: estado por día de cada objetivo.
-- status: none (no hecho), partial (a medias), done (hecho),
-- ignored (excluido del día: no cuenta en % ni en métricas).
-- Antes era boolean "completed"; filas viejas se migran leyendo status.
-- ------------------------------------------------------------
create table if not exists daily_objectives (
  id           uuid primary key default gen_random_uuid(),
  day_id       uuid not null references days(id) on delete cascade,
  objective_id uuid not null references objectives(id) on delete cascade,
  status       text not null default 'none'
    check (status in ('none', 'partial', 'done', 'ignored')),
  unique (day_id, objective_id)
);

-- Nota del día para objetivos "completable": texto corto de qué se hizo.
-- Se guarda por día y por objetivo; no influye en % ni en el calendario.
alter table daily_objectives add column if not exists note text;

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

-- Fecha en que la meta temporal se marcó completada (null = pendiente).
alter table temporal_goals add column if not exists completed_at timestamptz;

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

-- Orden de las tarjetas de la vista del día (JSON: array de claves de sección).
alter table settings add column if not exists section_order text;

-- Colores del tema de la bitácora (JSON: objeto de hex #rrggbb para cada
-- variable --cyb-* del shell; coincide con lib/colors.ts).
alter table settings add column if not exists colors text;

-- Contadores del banner (JSON: {box, text, items[]} de lib/counters.ts).
-- Cada ítem cuenta días manuales que suman 1 por día desde last_date;
-- box/text son el color global del recuadro y de la letra.
alter table settings add column if not exists counters text;

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
-- annual_categories: categorías para ordenar las efemérides
-- (cumpleaños, aniversarios...). Reordenables con sort_order.
-- ------------------------------------------------------------
create table if not exists annual_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- annual_reminders: efemérides: fechas que se repiten todos los
-- años (cumpleaños, aniversarios). Guardan solo mes y día (sin
-- año) y no tienen estado "completo": se recalculan solas cada
-- año en su propia pestaña y se marcan en el calendario.
-- category_id en NULL = "sin separar".
-- ------------------------------------------------------------
create table if not exists annual_reminders (
  id          uuid primary key default gen_random_uuid(),
  month       int not null check (month between 1 and 12),
  day         int not null check (day between 1 and 31),
  content     text not null,
  created_at  timestamptz not null default now(),
  category_id uuid references annual_categories(id) on delete set null
);

-- ------------------------------------------------------------
-- journal: "la hoja" de pensamientos del día. UNA fila por día
-- (date es PK), sin historial: se crea al guardar con texto y se
-- borra si queda vacía. content se comprime solo (TOAST).
-- ------------------------------------------------------------
create table if not exists journal (
  date       date primary key,
  content    text not null default '',
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- weight: peso corporal diario. UNA fila por día (date es PK),
-- al estilo de journal: se crea/actualiza con upsert. value en
-- kg, 1 decimal, rango 20–400.
-- ------------------------------------------------------------
create table if not exists weight (
  date       date primary key,
  value      numeric(5,1) not null check (value between 20 and 400),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- weight_months: resumen mensual que se "congela" al cerrar un
-- mes (se recalcula y guarda cuando se registra el primer peso
-- del mes siguiente). month = primer día del mes (PK).
-- count = cantidad de días con registro; avg con 2 decimales.
-- ------------------------------------------------------------
create table if not exists weight_months (
  month      date primary key,
  value_min  numeric(5,1) not null,
  value_max  numeric(5,1) not null,
  value_avg  numeric(5,2) not null,
  count      int not null default 0,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- rumiaciones: "Rumiaciones" — pensamientos constantes, NO atados
-- a un día: un solo texto que siempre está. Fila única (id=1)
-- estilo settings. Se crea al guardar con texto y se borra (o
-- queda vacía) si no hay contenido.
-- NOTA: si ya se había creado con la forma anterior (date pk,
-- una fila por día), dropearla y volver a correr este bloque:
--   drop table if exists rumiaciones;
-- ------------------------------------------------------------
create table if not exists rumiaciones (
  id         int primary key default 1,
  content    text not null default '',
  updated_at timestamptz not null default now()
);

insert into rumiaciones (id, content) values (1, '')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- day_goals: "objetivos del día" — lista por día que se arma SOLO
-- desde la vista del día (a diferencia de objectives, que son
-- globales). Independiente de la eficiencia/estadísticas y del
-- marcado verde del calendario. completed_at: null = pendiente.
-- ------------------------------------------------------------
create table if not exists day_goals (
  id           uuid primary key default gen_random_uuid(),
  date         date not null,
  title        text not null,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

-- Objetivos del día que quedan pendientes: se arrastran como copia al día
-- siguiente. rollover_from = id del objetivo del día anterior del que esta
-- fila es copia (null = es la fila original). rollover_stopped = la cadena
-- fue cancelada (al borrar un eslabón); los miembros que queden ya no se
-- arrastran más.
alter table day_goals add column if not exists rollover_from uuid references day_goals(id) on delete set null;
alter table day_goals add column if not exists rollover_stopped boolean not null default false;

-- ------------------------------------------------------------
-- agenda_categories: categorías del "Cuaderno" (anotador libre).
-- Cada categoría agrupa ítems de texto plano (recetas, ideas...).
-- ------------------------------------------------------------
create table if not exists agenda_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- agenda_items: notas dentro de una categoría. Título + texto libre.
-- Siempre pertenecen a una categoría; si se borra la categoría,
-- se borran con ella (on delete cascade).
-- ------------------------------------------------------------
create table if not exists agenda_items (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references agenda_categories(id) on delete cascade,
  title       text not null,
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Índices útiles
-- ------------------------------------------------------------
create index if not exists idx_days_date on days(date);
create index if not exists idx_annual_reminders_md on annual_reminders(month, day);
create index if not exists idx_reminders_date on reminders(date);
create index if not exists idx_daily_objectives_day on daily_objectives(day_id);
create index if not exists idx_daily_objectives_objective on daily_objectives(objective_id);
create index if not exists idx_temporal_goals_range on temporal_goals(start_date, end_date);
create index if not exists idx_day_flags_date on day_flags(date);
create index if not exists idx_agenda_items_category on agenda_items(category_id, created_at);
create index if not exists idx_day_goals_date on day_goals(date, created_at);
create index if not exists idx_day_goals_rollover_from on day_goals(rollover_from);

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
alter table reminders enable row level security;
alter table day_flags enable row level security;
alter table daily_objectives enable row level security;
alter table temporal_goals enable row level security;
alter table annual_reminders enable row level security;
alter table annual_categories enable row level security;
alter table journal enable row level security;
alter table weight enable row level security;
alter table weight_months enable row level security;
alter table agenda_categories enable row level security;
alter table agenda_items enable row level security;
alter table day_goals enable row level security;
alter table rumiaciones enable row level security;

-- ------------------------------------------------------------
-- Función: auto-completar recordatorios vencidos
-- Marca completed_at = fecha del recordatorio para todos los
-- recordatorios que ya pasaron (date < hoy en Argentina) y están
-- pendientes. Idempotente: una vez completados no vuelve a tocarlos.
-- Se invoca desde el render del día con un solo RPC (en vez de un
-- update por recordatorio).
-- ------------------------------------------------------------
create or replace function auto_complete_expired_reminders()
returns void
language sql
security definer
set search_path = public
as $$
  update reminders r
  set completed_at = r.date::timestamptz
  where r.date < (now() at time zone 'America/Argentina/Buenos_Aires')::date
    and r.completed_at is null;
$$;

-- ------------------------------------------------------------
-- Función: congelar el valor de los días que ya pasaron
-- calcula percent/fulfilled de cada día con date < hoy en
-- Argentina que todavía no está congelado (score_frozen_at null)
-- y lo guarda. Idempotente: una vez congelado no se vuelve a
-- tocar, así agregar/editar objetivos después no cambia el color
-- del calendario ni las estadísticas de días pasados.
--
-- El denominador usa los objetivos ACTIVOS en el momento del
-- freeze con created_at <= fecha del día (los objetivos creados
-- después de ese día no cuentan para ese día). Replica la lógica
-- de lib/completion.ts: done=1, partial=0.5, ignored queda fuera
-- del numerador y del denominador; fulfilled según settings
-- (completion_mode / threshold); modo "off" => fulfilled=false.
-- ------------------------------------------------------------
create or replace function freeze_day_scores()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  today_d date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  r record;
  cfg_mode text;
  cfg_threshold int;
  act_total int;
  ign int;
  pts numeric;
  total int;
  pct int;
  ful boolean;
begin
  select completion_mode, threshold into cfg_mode, cfg_threshold
  from settings
  where id = 1;
  if not found then
    cfg_mode := 'off';
    cfg_threshold := 1;
  end if;
  cfg_threshold := greatest(1, coalesce(cfg_threshold, 1));

  for r in
    select
      d.id,
      d.date,
      (select count(*) from objectives o
        where o.is_active
          and o.created_at::date <= d.date) as act_total,
      count(*) filter (where doe.status = 'ignored') as ign,
      coalesce(sum(case doe.status
                     when 'done' then 1
                     when 'partial' then 0.5
                     else 0 end), 0) as pts
    from days d
    left join daily_objectives doe on doe.day_id = d.id
    where d.date < today_d
      and d.score_frozen_at is null
    group by d.id, d.date
  loop
    act_total := coalesce(r.act_total, 0);
    ign := coalesce(r.ign, 0);
    pts := coalesce(r.pts, 0);
    total := greatest(0, act_total - ign);
    pct := null;
    ful := false;
    if total > 0 then
      pct := least(100, round((pts / total * 100)::numeric)::int);
      if cfg_mode = 'count' then
        ful := pts >= cfg_threshold;
      elsif cfg_mode = 'percent' then
        ful := pct >= least(100, cfg_threshold);
      end if;
    end if;
    update days
    set percent = pct,
        fulfilled = ful,
        score_frozen_at = now(),
        updated_at = now()
    where id = r.id;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Función: arrastrar objetivos del día pendientes al día siguiente
-- Los day_goals con completed_at null cuyo día ya pasó se copian a
-- date+1 (uno por día), y así recursivamente hasta llegar a hoy:
-- rellena huecos de días. Nunca copia a días futuros. Idempotente:
-- no duplica (solo copia si no existe ya una copia de esa cadena
-- para date+1) y no copia cadenas canceladas (rollover_stopped) ni
-- filas completadas. Se invoca desde el render del día, antes del
-- query de day_goals, para que el día visto muestre los arrastrados.
-- ------------------------------------------------------------
create or replace function rollover_pending_day_goals()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  today_d date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  inserted int;
  guard int := 0;
begin
  loop
    insert into day_goals (date, title, rollover_from, created_at)
    select g.date + 1, g.title, g.id, now()
    from day_goals g
    where g.date + 1 <= today_d
      and g.completed_at is null
      and coalesce(g.rollover_stopped, false) is not true
      and not exists (
        select 1 from day_goals c
        where c.date = g.date + 1
          and c.rollover_from = g.id
      );
    get diagnostics inserted = row_count;
    guard := guard + 1;
    exit when inserted = 0 or guard >= 60;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Función: cancelar el arrastre de toda una cadena de day_goals
-- Marca rollover_stopped = true en el objetivo indicado y en toda
-- su cadena: sus ancestros (los días anteriores por rollover_from)
-- y sus copias (los días siguientes que lo tienen como rollover_from).
-- Se llama antes de borrar un day_goal para que el pendiente del
-- día anterior no "resucite" al día siguiente. Idempotente.
-- ------------------------------------------------------------
create or replace function stop_day_goal_chain(goal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with recursive chain as (
    select g.id from day_goals g where g.id = goal_id
    union
    select g.id from day_goals g join chain c on g.rollover_from = c.id
    union
    select g.id from day_goals g join chain c on c.rollover_from = g.id
  )
  update day_goals g
  set rollover_stopped = true
  where g.id in (select id from chain);
end;
$$;