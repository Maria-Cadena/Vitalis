-- VITALIS: ejecutar en Supabase > SQL Editor antes de publicar el formulario.
-- Guarda interesados comerciales solamente. NO almacenar información clínica.
create table if not exists public.vitalis_interesados (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 2 and 100),
  institucion text not null check (char_length(institucion) between 2 and 140),
  email text not null check (char_length(email) between 5 and 180),
  telefono text not null check (telefono ~ '^\+[1-9][0-9]{7,14}$'),
  ciudad text not null check (char_length(ciudad) between 2 and 80),
  tipo text not null check (tipo in ('consultorio','centro_medico','laboratorio','clinica','hospital','red','otro')),
  plan text not null check (plan in ('inicial','profesional','centro','institucional','enterprise')),
  precio_bs integer,
  consentimiento boolean not null check (consentimiento = true),
  consentimiento_sms boolean not null default false,
  origen text not null default 'landing_vitalis' check (origen = 'landing_vitalis'),
  estado text not null default 'nuevo' check (estado in ('nuevo','contactado','descartado')),
  creado_en timestamptz not null default now(),
  constraint vitalis_plan_precio_correcto check (
    (plan = 'inicial' and precio_bs = 249) or
    (plan = 'profesional' and precio_bs = 499) or
    (plan = 'centro' and precio_bs = 899) or
    (plan = 'institucional' and precio_bs = 1499) or
    (plan = 'enterprise' and precio_bs is null)
  )
);

create unique index if not exists vitalis_interesados_email_unico
  on public.vitalis_interesados (lower(email));
create index if not exists vitalis_interesados_plan_fecha
  on public.vitalis_interesados (plan, creado_en desc);

alter table public.vitalis_interesados enable row level security;
revoke all on table public.vitalis_interesados from anon, authenticated;
grant select, insert, update on table public.vitalis_interesados to service_role;
-- No se crean políticas RLS públicas. El navegador solo llama a la función de Vercel.
