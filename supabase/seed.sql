-- ============================================================
-- Datos iniciales. Ejecutar después de schema.sql
-- ============================================================

-- Contraseña inicial por defecto: bitakra
-- IMPORTANTE: cambiarla después desde la app (Ajustes > Cambiar contraseña)
insert into password_config (id, salt, password_hash)
values (
  1,
  'bitakra-v1-salt',
  encode(digest(concat('bitakra-v1-salt', '::', 'bitakra'), 'sha256'), 'hex')
)
on conflict (id) do nothing;

-- Objetivos de ejemplo (se pueden borrar/editar desde Ajustes)
insert into objectives (title, description, sort_order) values
  ('Tomar agua', 'Mantenerse hidratado durante el día', 1),
  ('Leer', 'Leer al menos 15 minutos', 2),
  ('Moverse', 'Hacer actividad física', 3)
on conflict do nothing;