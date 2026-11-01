-- Adspace: قاعدة البيانات الكاملة
-- الصق هذا الملف كاملا في Supabase → SQL Editor ثم اضغط Run

-- ============ 1) الملفات الشخصية والأدوار ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'advertiser' check (role in ('advertiser', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- دالة تتحقق هل المستخدم الحالي أدمن (security definer لتجنب تكرار سياسات RLS)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- إنشاء ملف شخصي تلقائيا عند تسجيل مستخدم جديد
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- المستخدم يعدل اسمه فقط، ولا يستطيع تغيير دوره
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

-- ============ 2) الإعلانات ============
create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  advertiser_name text not null check (char_length(advertiser_name) between 1 and 60),
  title text not null check (char_length(title) between 1 and 70),
  link_url text check (link_url is null or link_url ~* '^https?://'),
  cta_text text not null default 'اعرف أكثر' check (char_length(cta_text) between 1 and 20),
  contact text check (contact is null or char_length(contact) <= 80),
  image_path text not null,
  requested_days int not null default 7 check (requested_days between 1 and 365),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text check (reject_reason is null or char_length(reject_reason) <= 120),
  display_seconds int not null default 6 check (display_seconds between 2 and 30),
  sort_order int not null default 0,
  is_active boolean not null default true,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists ads_owner_idx on public.ads (owner_id, created_at desc);
create index if not exists ads_status_idx on public.ads (status, created_at);
create index if not exists ads_live_idx on public.ads (status, is_active, sort_order);

alter table public.ads enable row level security;

-- صاحب الإعلان يرى إعلاناته، والأدمن يرى كل شيء
drop policy if exists "ads_select_own_or_admin" on public.ads;
create policy "ads_select_own_or_admin" on public.ads
  for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- أي مستخدم مسجل يرسل إعلانا جديدا بحالة "قيد المراجعة" فقط
drop policy if exists "ads_insert_pending_own" on public.ads;
create policy "ads_insert_pending_own" on public.ads
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and status = 'pending'
    and start_at is null
    and end_at is null
    and decided_at is null
    and reject_reason is null
  );

-- الأدمن ينشر مباشرة أو يعدل أو يحذف أي إعلان
drop policy if exists "ads_admin_all" on public.ads;
create policy "ads_admin_all" on public.ads
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- المعلن يحذف إعلاناته التي ما زالت قيد المراجعة أو المرفوضة
drop policy if exists "ads_delete_own_unapproved" on public.ads;
create policy "ads_delete_own_unapproved" on public.ads
  for delete to authenticated
  using (owner_id = auth.uid() and status in ('pending', 'rejected'));

-- ============ 3) العرض العام للإعلانات الجارية ============
-- يعرض الأعمدة الآمنة فقط (بدون رقم التواصل) ويطبق شروط الحالة والتاريخ
create or replace view public.live_ads
with (security_invoker = false) as
select
  id,
  advertiser_name,
  title,
  link_url,
  cta_text,
  image_path,
  display_seconds,
  sort_order,
  end_at
from public.ads
where status = 'approved'
  and is_active
  and start_at <= now()
  and end_at > now();

grant select on public.live_ads to anon, authenticated;

-- ============ 4) إحصائيات المشاهدات والنقرات ============
create table if not exists public.ad_events (
  id bigint generated always as identity primary key,
  ad_id uuid not null references public.ads(id) on delete cascade,
  kind text not null check (kind in ('view', 'click')),
  created_at timestamptz not null default now()
);

create index if not exists ad_events_ad_idx on public.ad_events (ad_id, kind);

alter table public.ad_events enable row level security;

-- الزوار والمسجلون يسجلون الأحداث فقط على الإعلانات الجارية
drop policy if exists "events_insert_live" on public.ad_events;
create policy "events_insert_live" on public.ad_events
  for insert to anon, authenticated
  with check (exists (select 1 from public.live_ads l where l.id = ad_id));

-- الأدمن يقرأ الأحداث
drop policy if exists "events_select_admin" on public.ad_events;
create policy "events_select_admin" on public.ad_events
  for select to authenticated
  using (public.is_admin());

-- المعلن يرى إحصائيات إعلاناته، والأدمن يرى الكل (بدون كشف أحداث الآخرين)
create or replace function public.ad_stats()
returns table (ad_id uuid, views bigint, clicks bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    count(*) filter (where e.kind = 'view'),
    count(*) filter (where e.kind = 'click')
  from public.ads a
  left join public.ad_events e on e.ad_id = a.id
  where a.owner_id = auth.uid() or public.is_admin()
  group by a.id;
$$;

revoke all on function public.ad_stats() from public, anon;
grant execute on function public.ad_stats() to authenticated;

-- ============ 5) تخزين الصور ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ad-images', 'ad-images', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- المسار: <user_id>/<اسم-الملف>. القراءة عامة (الصور تعرض للزوار)
drop policy if exists "ad_images_upload_own" on storage.objects;
create policy "ad_images_upload_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ad-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "ad_images_delete_own_or_admin" on storage.objects;
create policy "ad_images_delete_own_or_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ad-images'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ============ 6) جعل حسابك أدمن ============
-- بعد أن تسجل دخولك مرة واحدة في التطبيق، شغل هذا السطر مع بريدك:
--
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'YOUR-EMAIL@example.com');
