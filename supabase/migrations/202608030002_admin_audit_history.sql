begin;

create or replace function public.admin_list_alpha_audit_logs()
returns table (
  id uuid,
  actor_display_name text,
  action text,
  target_type text,
  target_display_name text,
  detail jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with audit as (
    select
      log.*,
      case
        when log.target_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then log.target_id::uuid
        else null
      end as target_uuid
    from public.app_admin_audit_logs log
    where auth.uid() is not null
      and public.is_alpha_admin(auth.uid())
    order by log.created_at desc
    limit 100
  )
  select
    audit.id,
    coalesce(actor.display_name, 'MECHORI運営'),
    audit.action,
    audit.target_type,
    coalesce(
      case audit.target_type
        when 'user' then target_user.display_name
        when 'feedback' then feedback_user.display_name
        when 'entitlement' then entitlement_user.display_name
        else null
      end,
      audit.target_type
    ),
    audit.detail ||
      case
        when audit.action = 'entitlement_granted' and granted_entitlement.reason is not null
          then jsonb_build_object('reason', granted_entitlement.reason)
        else '{}'::jsonb
      end,
    audit.created_at
  from audit
  left join public.app_user_profiles actor
    on actor.user_id = audit.actor_user_id
  left join public.app_user_profiles target_user
    on audit.target_type = 'user'
    and target_user.user_id = audit.target_uuid
  left join public.alpha_feedback feedback
    on audit.target_type = 'feedback'
    and feedback.id = audit.target_uuid
  left join public.app_user_profiles feedback_user
    on feedback_user.user_id = feedback.user_id
  left join public.app_user_entitlements entitlement
    on audit.target_type = 'entitlement'
    and entitlement.id = audit.target_uuid
  left join public.app_user_profiles entitlement_user
    on entitlement_user.user_id = entitlement.user_id
  left join public.app_user_entitlements granted_entitlement
    on granted_entitlement.id = case
      when audit.detail->>'entitlementId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (audit.detail->>'entitlementId')::uuid
      else null
    end
  order by audit.created_at desc;
$$;

revoke all on function public.admin_list_alpha_audit_logs()
  from public, anon, authenticated;
grant execute on function public.admin_list_alpha_audit_logs()
  to authenticated;

comment on function public.admin_list_alpha_audit_logs() is
  'Returns the latest privileged alpha-operation audit entries to alpha administrators only.';

create or replace function public.admin_update_alpha_feedback(
  p_feedback_id uuid,
  p_status text,
  p_admin_note text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_admin_note text := left(trim(coalesce(p_admin_note, '')), 4000);
begin
  if auth.uid() is null or not public.is_alpha_staff(auth.uid()) then
    raise exception 'staff_required';
  end if;
  if p_status not in ('new', 'reviewing', 'planned', 'resolved', 'closed') then
    raise exception 'invalid_feedback_status';
  end if;
  update public.alpha_feedback feedback
  set status = p_status,
      admin_note = normalized_admin_note,
      updated_at = now()
  where feedback.id = p_feedback_id;
  if not found then return false; end if;
  insert into public.app_admin_audit_logs (
    actor_user_id, action, target_type, target_id, detail
  ) values (
    auth.uid(), 'feedback_updated', 'feedback', p_feedback_id::text,
    jsonb_build_object('status', p_status, 'adminNote', normalized_admin_note)
  );
  return true;
end;
$$;

create or replace function public.admin_grant_alpha_entitlement(
  p_user_id uuid,
  p_plan_code text,
  p_source text,
  p_ends_at timestamptz,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  entitlement_id uuid;
  normalized_reason text := trim(coalesce(p_reason, ''));
begin
  if auth.uid() is null or not public.is_alpha_admin(auth.uid()) then
    raise exception 'admin_required';
  end if;
  if p_plan_code not in ('free', 'owner_plus') then raise exception 'invalid_plan_code'; end if;
  if p_source not in ('billing', 'admin_grant', 'founding_tester', 'free_trial', 'campaign', 'migration') then
    raise exception 'invalid_entitlement_source';
  end if;
  if p_ends_at is not null and p_ends_at <= now() then raise exception 'invalid_entitlement_end'; end if;
  if char_length(normalized_reason) not between 1 and 1000 then
    raise exception 'invalid_entitlement_reason';
  end if;

  update public.app_user_entitlements entitlement
  set status = 'revoked', updated_at = now()
  where entitlement.user_id = p_user_id
    and entitlement.status = 'active';

  insert into public.app_user_entitlements (
    user_id, plan_code, source, ends_at, granted_by_user_id, reason
  ) values (
    p_user_id, p_plan_code, p_source, p_ends_at, auth.uid(), normalized_reason
  ) returning id into entitlement_id;

  insert into public.app_admin_audit_logs (
    actor_user_id, action, target_type, target_id, detail
  ) values (
    auth.uid(), 'entitlement_granted', 'user', p_user_id::text,
    jsonb_build_object(
      'planCode', p_plan_code,
      'source', p_source,
      'entitlementId', entitlement_id,
      'endsAt', p_ends_at,
      'reason', normalized_reason
    )
  );
  return entitlement_id;
end;
$$;

revoke all on function public.admin_update_alpha_feedback(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.admin_grant_alpha_entitlement(uuid, text, text, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.admin_update_alpha_feedback(uuid, text, text)
  to authenticated;
grant execute on function public.admin_grant_alpha_entitlement(uuid, text, text, timestamptz, text)
  to authenticated;

commit;
