-- BGM Business Growth Game — Supabase MVP schema
-- Run in Supabase SQL Editor. Set up Supabase Auth before launch if you need verified identities.
create extension if not exists pgcrypto;

create table if not exists public.bgm_members (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(trim(display_name)) between 2 and 60),
  whatsapp_phone text not null,
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);
create unique index if not exists bgm_members_phone_unique on public.bgm_members (whatsapp_phone);

create table if not exists public.bgm_challenge_sets (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null unique,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  expert_skill text not null default 'Customer Discovery',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.bgm_questions (
  id uuid primary key default gen_random_uuid(),
  challenge_set_id uuid not null references public.bgm_challenge_sets(id) on delete cascade,
  position smallint not null check (position between 1 and 10),
  skill_category text not null,
  prompt_en text not null,
  prompt_ar text not null,
  options_en jsonb not null check (jsonb_typeof(options_en) = 'array' and jsonb_array_length(options_en) = 4),
  options_ar jsonb not null check (jsonb_typeof(options_ar) = 'array' and jsonb_array_length(options_ar) = 4),
  correct_option smallint not null check (correct_option between 0 and 3),
  explanation_en text not null,
  explanation_ar text not null,
  points integer not null default 10 check (points between 0 and 100),
  unique (challenge_set_id, position)
);

create table if not exists public.bgm_answers (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.bgm_members(id) on delete cascade,
  question_id uuid not null references public.bgm_questions(id) on delete cascade,
  selected_option smallint not null check (selected_option between 0 and 3),
  is_correct boolean not null,
  points_awarded integer not null default 0,
  submitted_at timestamptz not null default now(),
  unique (member_id, question_id)
);

create index if not exists bgm_answers_submitted_at_idx on public.bgm_answers(submitted_at);
create index if not exists bgm_questions_set_idx on public.bgm_questions(challenge_set_id, position);

alter table public.bgm_members enable row level security;
alter table public.bgm_challenge_sets enable row level security;
alter table public.bgm_questions enable row level security;
alter table public.bgm_answers enable row level security;

-- No direct anonymous table access. Client interactions must use carefully scoped RPCs.
revoke all on public.bgm_members from anon, authenticated;
revoke all on public.bgm_challenge_sets from anon, authenticated;
revoke all on public.bgm_questions from anon, authenticated;
revoke all on public.bgm_answers from anon, authenticated;

-- Public challenge payload intentionally excludes correct_option and explanations until answer submission.
create or replace function public.bgm_get_active_challenge(p_now timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_set public.bgm_challenge_sets%rowtype;
  v_questions jsonb;
begin
  select * into v_set
  from public.bgm_challenge_sets
  where is_published = true and starts_at <= p_now and ends_at > p_now
  order by starts_at desc limit 1;

  if not found then
    return jsonb_build_object('active', false);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id, 'position', q.position, 'skill_category', q.skill_category,
    'prompt_en', q.prompt_en, 'prompt_ar', q.prompt_ar,
    'options_en', q.options_en, 'options_ar', q.options_ar, 'points', q.points
  ) order by q.position), '[]'::jsonb)
  into v_questions
  from public.bgm_questions q where q.challenge_set_id = v_set.id;

  return jsonb_build_object(
    'active', true, 'challenge_set_id', v_set.id,
    'starts_at', v_set.starts_at, 'ends_at', v_set.ends_at,
    'expert_skill', v_set.expert_skill, 'questions', v_questions
  );
end;
$$;

-- MVP registration: phone is private because there is no public member-list endpoint.
-- Configure verified phone authentication / OTP before relying on phone numbers as proof of identity.
create or replace function public.bgm_register_member(p_display_name text, p_whatsapp_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_member public.bgm_members%rowtype;
begin
  if length(trim(coalesce(p_display_name,''))) < 2 or length(trim(coalesce(p_display_name,''))) > 60 then
    raise exception 'Please enter a display name between 2 and 60 characters';
  end if;
  if length(regexp_replace(coalesce(p_whatsapp_phone,''), '[^0-9+]', '', 'g')) < 8 then
    raise exception 'Please enter a valid WhatsApp number';
  end if;

  insert into public.bgm_members(display_name, whatsapp_phone)
  values (trim(p_display_name), regexp_replace(p_whatsapp_phone, '[^0-9+]', '', 'g'))
  on conflict (whatsapp_phone) do update
    set display_name = excluded.display_name, is_active = true
  returning * into v_member;

  return jsonb_build_object('member_id', v_member.id, 'display_name', v_member.display_name);
end;
$$;

create or replace function public.bgm_submit_answer(p_member_id uuid, p_question_id uuid, p_selected_option smallint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q public.bgm_questions%rowtype;
  v_set public.bgm_challenge_sets%rowtype;
  v_correct boolean;
  v_points integer;
begin
  if p_selected_option not between 0 and 3 then raise exception 'Invalid answer option'; end if;

  select q.* into v_q
  from public.bgm_questions q
  join public.bgm_challenge_sets s on s.id = q.challenge_set_id
  where q.id = p_question_id and s.is_published = true
    and s.starts_at <= now() and s.ends_at > now();

  if not found then raise exception 'This question is not active'; end if;
  select * into v_set from public.bgm_challenge_sets where id = v_q.challenge_set_id;

  if not exists(select 1 from public.bgm_members where id = p_member_id and is_active = true) then
    raise exception 'Please register before answering';
  end if;

  v_correct := (p_selected_option = v_q.correct_option);
  v_points := case when v_correct then v_q.points else 0 end;

  insert into public.bgm_answers(member_id, question_id, selected_option, is_correct, points_awarded)
  values (p_member_id, p_question_id, p_selected_option, v_correct, v_points)
  on conflict (member_id, question_id) do nothing;

  if not found then
    return jsonb_build_object('accepted', false, 'reason', 'already_answered');
  end if;

  return jsonb_build_object(
    'accepted', true, 'correct', v_correct, 'points_awarded', v_points,
    'explanation_en', v_q.explanation_en, 'explanation_ar', v_q.explanation_ar
  );
end;
$$;

create or replace function public.bgm_get_leaderboard(p_week_start date default date_trunc('week', timezone('Africa/Cairo', now()))::date)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.points desc, r.correct_answers desc, r.display_name asc), '[]'::jsonb)
  from (
    select m.display_name,
           sum(a.points_awarded)::integer as points,
           count(*) filter (where a.is_correct)::integer as correct_answers
    from public.bgm_members m
    join public.bgm_answers a on a.member_id = m.id
    join public.bgm_questions q on q.id = a.question_id
    join public.bgm_challenge_sets s on s.id = q.challenge_set_id
    where m.is_active = true
      and s.challenge_date >= coalesce(p_week_start, date_trunc('week', timezone('Africa/Cairo', now()))::date)
      and s.challenge_date < coalesce(p_week_start, date_trunc('week', timezone('Africa/Cairo', now()))::date) + 7
    group by m.id, m.display_name
    order by points desc, correct_answers desc, m.display_name asc
    limit 100
  ) r;
$$;

-- Organizer/admin policies should be added only after an authenticated admin role is configured.
grant execute on function public.bgm_get_active_challenge(timestamptz) to anon, authenticated;
grant execute on function public.bgm_register_member(text,text) to anon, authenticated;
grant execute on function public.bgm_submit_answer(uuid,uuid,smallint) to anon, authenticated;
grant execute on function public.bgm_get_leaderboard(date) to anon, authenticated;
