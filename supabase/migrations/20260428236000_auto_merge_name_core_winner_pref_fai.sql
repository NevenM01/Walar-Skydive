-- Update auto_merge_athletes_name_core winner selection:
-- Prefer user_id, then FAI presence, then results_count, then oldest created_at.
-- Also align name_core normalization with the current athlete_duplicates_report definition.

create or replace function public.auto_merge_athletes_name_core(
  p_group_limit int default 200
)
returns table (
  merged_groups int,
  merged_athletes int,
  skipped_groups int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group record;
  v_winner_id uuid;
  v_loser_ids uuid[];
  v_loser_count int;
  v_skipped int := 0;
  v_merged_groups int := 0;
  v_merged_athletes int := 0;
begin
  if not public.jwt_is_app_admin() then
    raise exception 'Forbidden';
  end if;

  for v_group in
    with stats as (
      select
        a.id,
        a.user_id,
        nullif(lower(btrim(a.fai_licence)), '') as fai_norm,
        a.country_code,
        a.created_at,
        coalesce((select count(*)::int from public.competition_results cr where cr.athlete_id = a.id), 0) as results_count,
        lower(
          regexp_replace(
            btrim(
              case
                when
                  array_length(regexp_split_to_array(regexp_replace(btrim(a.display_name), '\s+', ' ', 'g'), ' '), 1) >= 3
                  and regexp_replace(btrim(a.display_name), '\s+', ' ', 'g') ~ '\s+[A-Z0-9ŠĐČĆŽ ]*(TEAM|INTERNATIONAL|CLUB)\s*$'
                then regexp_replace(
                  btrim(a.display_name),
                  '\s+(?:[A-Z0-9ŠĐČĆŽ]{2,}\s+){0,4}(?:TEAM|INTERNATIONAL|CLUB)\s*$',
                  '',
                  'g'
                )
                else a.display_name
              end
            ),
            '\s+',
            ' ',
            'g'
          )
        ) as name_core_norm
      from public.athletes a
      where a.display_name is not null and btrim(a.display_name) <> ''
    ),
    groups as (
      select
        name_core_norm,
        (array_agg(country_code order by created_at) filter (where country_code is not null and country_code not in ('XX','XXX')))[1] as real_country,
        count(*)::int as n,
        (count(*) filter (where user_id is not null or fai_norm is not null))::int as anchors,
        (count(*) filter (where user_id is null and fai_norm is null and results_count = 0))::int as junk
      from stats
      where name_core_norm is not null and name_core_norm <> ''
      group by name_core_norm
      having count(*) >= 2
    )
    select *
    from groups
    where real_country is not null
      and anchors >= 1
      and junk >= 1
    order by n desc, name_core_norm asc
    limit greatest(p_group_limit, 0)
  loop
    -- Winner: user_id > FAI > results > oldest
    select s.id into v_winner_id
    from (
      select
        st.*,
        case when st.user_id is not null then 1 else 0 end as has_user,
        case when st.fai_norm is not null then 1 else 0 end as has_fai
      from (
        select
          a.id,
          a.user_id,
          nullif(lower(btrim(a.fai_licence)), '') as fai_norm,
          a.country_code,
          a.created_at,
          coalesce((select count(*)::int from public.competition_results cr where cr.athlete_id = a.id), 0) as results_count,
          lower(
            regexp_replace(
              btrim(
                case
                  when
                    array_length(regexp_split_to_array(regexp_replace(btrim(a.display_name), '\s+', ' ', 'g'), ' '), 1) >= 3
                    and regexp_replace(btrim(a.display_name), '\s+', ' ', 'g') ~ '\s+[A-Z0-9ŠĐČĆŽ ]*(TEAM|INTERNATIONAL|CLUB)\s*$'
                  then regexp_replace(
                    btrim(a.display_name),
                    '\s+(?:[A-Z0-9ŠĐČĆŽ]{2,}\s+){0,4}(?:TEAM|INTERNATIONAL|CLUB)\s*$',
                    '',
                    'g'
                  )
                  else a.display_name
                end
              ),
              '\s+',
              ' ',
              'g'
            )
          ) as name_core_norm
        from public.athletes a
      ) st
      where st.name_core_norm = v_group.name_core_norm
        and (st.country_code = v_group.real_country or st.country_code in ('XX','XXX'))
    ) s
    order by s.has_user desc, s.has_fai desc, s.results_count desc, s.created_at asc
    limit 1;

    if v_winner_id is null then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    -- Losers: only junk rows (no user, no FAI, 0 results), same name_core and placeholder/real country.
    select array_agg(a.id order by a.created_at asc) into v_loser_ids
    from public.athletes a
    where a.id <> v_winner_id
      and a.user_id is null
      and nullif(lower(btrim(a.fai_licence)), '') is null
      and coalesce((select count(*)::int from public.competition_results cr where cr.athlete_id = a.id), 0) = 0
      and lower(
        regexp_replace(
          btrim(
            case
              when
                array_length(regexp_split_to_array(regexp_replace(btrim(a.display_name), '\s+', ' ', 'g'), ' '), 1) >= 3
                and regexp_replace(btrim(a.display_name), '\s+', ' ', 'g') ~ '\s+[A-Z0-9ŠĐČĆŽ ]*(TEAM|INTERNATIONAL|CLUB)\s*$'
              then regexp_replace(
                btrim(a.display_name),
                '\s+(?:[A-Z0-9ŠĐČĆŽ]{2,}\s+){0,4}(?:TEAM|INTERNATIONAL|CLUB)\s*$',
                '',
                'g'
              )
              else a.display_name
            end
          ),
          '\s+',
          ' ',
          'g'
        )
      ) = v_group.name_core_norm
      and (
        a.country_code = v_group.real_country
        or a.country_code in ('XX','XXX')
      );

    v_loser_count := coalesce(array_length(v_loser_ids, 1), 0);
    if v_loser_count <= 0 then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    begin
      perform public.merge_athletes_safe_clear_junk_dob(
        v_winner_id,
        v_loser_ids,
        'auto_merge_name_core'
      );
      v_merged_groups := v_merged_groups + 1;
      v_merged_athletes := v_merged_athletes + v_loser_count;
    exception
      when others then
        v_skipped := v_skipped + 1;
    end;
  end loop;

  merged_groups := v_merged_groups;
  merged_athletes := v_merged_athletes;
  skipped_groups := v_skipped;
  return next;
end;
$$;

revoke all on function public.auto_merge_athletes_name_core(int) from public;
grant execute on function public.auto_merge_athletes_name_core(int) to authenticated;
grant execute on function public.auto_merge_athletes_name_core(int) to service_role;

