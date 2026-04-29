-- Fix merge_athletes_safe: avoid unique constraint violations on competition_results(competition_id, athlete_id).
-- If both winner and loser have a row for the same competition, keep the winner row and drop the loser row
-- before retargeting the remaining results.

create or replace function public.merge_athletes_safe(
  p_winner_id uuid,
  p_loser_ids uuid[],
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_winner public.athletes%rowtype;
  v_distinct_user_links int;
  v_distinct_dobs int;
  v_admin_id uuid;
begin
  -- Only admins may execute.
  if not public.jwt_is_app_admin() then
    raise exception 'Forbidden';
  end if;

  v_admin_id := auth.uid();

  if p_winner_id is null then
    raise exception 'p_winner_id is required';
  end if;
  if p_loser_ids is null or array_length(p_loser_ids, 1) is null then
    raise exception 'p_loser_ids is required';
  end if;

  -- Ensure winner exists.
  select * into v_winner from public.athletes where id = p_winner_id;
  if not found then
    raise exception 'Winner not found';
  end if;

  -- Ensure losers exist and do not include winner.
  if p_winner_id = any(p_loser_ids) then
    raise exception 'Losers must not include winner';
  end if;

  -- Safety check: do not auto-merge if more than one distinct non-null user_id exists in the set.
  select count(*) into v_distinct_user_links
  from (
    select distinct user_id
    from public.athletes
    where id = p_winner_id or id = any(p_loser_ids)
      and user_id is not null
  ) t;
  if coalesce(v_distinct_user_links, 0) > 1 then
    raise exception 'Safety check failed: multiple distinct user_id links';
  end if;

  -- Safety check: conflicting DOB values (two different non-null dates).
  select count(*) into v_distinct_dobs
  from (
    select distinct date_of_birth
    from public.athletes
    where (id = p_winner_id or id = any(p_loser_ids))
      and date_of_birth is not null
  ) t;
  if coalesce(v_distinct_dobs, 0) > 1 then
    raise exception 'Safety check failed: conflicting date_of_birth';
  end if;

  -- Fill missing winner fields from losers (first non-null by created_at).
  update public.athletes w
  set
    user_id = coalesce(w.user_id, agg.pick_uid),
    fai_licence = coalesce(w.fai_licence, agg.pick_fai),
    date_of_birth = coalesce(w.date_of_birth, agg.pick_dob),
    bio = coalesce(w.bio, agg.pick_bio),
    club = coalesce(w.club, agg.pick_club),
    website_url = coalesce(w.website_url, agg.pick_web),
    instagram_url = coalesce(w.instagram_url, agg.pick_ig),
    facebook_url = coalesce(w.facebook_url, agg.pick_fb),
    updated_at = now()
  from (
    select
      (array_agg(a.user_id order by a.created_at) filter (where a.user_id is not null))[1] as pick_uid,
      (array_agg(a.fai_licence order by a.created_at) filter (where a.fai_licence is not null and btrim(a.fai_licence) <> ''))[1] as pick_fai,
      (array_agg(a.date_of_birth order by a.created_at) filter (where a.date_of_birth is not null))[1] as pick_dob,
      (array_agg(a.bio order by a.created_at) filter (where a.bio is not null))[1] as pick_bio,
      (array_agg(a.club order by a.created_at) filter (where a.club is not null))[1] as pick_club,
      (array_agg(a.website_url order by a.created_at) filter (where a.website_url is not null))[1] as pick_web,
      (array_agg(a.instagram_url order by a.created_at) filter (where a.instagram_url is not null))[1] as pick_ig,
      (array_agg(a.facebook_url order by a.created_at) filter (where a.facebook_url is not null))[1] as pick_fb
    from public.athletes a
    where a.id = any(p_loser_ids)
  ) agg
  where w.id = p_winner_id;

  -- Prevent unique constraint violations on (competition_id, athlete_id) BEFORE retarget:
  -- if a winner row already exists in the same competition, drop the loser row(s).
  delete from public.competition_results cr_loser
  where cr_loser.athlete_id = any(p_loser_ids)
    and exists (
      select 1
      from public.competition_results cr_winner
      where cr_winner.competition_id = cr_loser.competition_id
        and cr_winner.athlete_id = p_winner_id
    );

  -- Retarget remaining results.
  update public.competition_results cr
  set athlete_id = p_winner_id,
      updated_at = now()
  where cr.athlete_id = any(p_loser_ids);

  -- Remove duplicate results within the same competition after merge: keep best wal_ar_score.
  delete from public.competition_results cr
  using (
    select id
    from (
      select id,
             row_number() over (
               partition by competition_id, athlete_id
               order by wal_ar_score desc nulls last, id asc
             ) as rn
      from public.competition_results
      where athlete_id = p_winner_id
    ) ranked
    where ranked.rn > 1
  ) d
  where cr.id = d.id;

  -- Delete losers.
  delete from public.athletes a
  where a.id = any(p_loser_ids);

  insert into public.athlete_merge_log (merged_by, winner_id, loser_ids, reason)
  values (v_admin_id, p_winner_id, p_loser_ids, p_reason);
end;
$$;

