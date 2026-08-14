begin;

revoke all on function public.is_test_operator(uuid)
  from public, anon, authenticated;
revoke all on function public.create_test_invitation(text, text, timestamptz, integer)
  from public, anon, authenticated;
revoke all on function public.redeem_test_invitation(text)
  from public, anon, authenticated;

grant execute on function public.is_test_operator(uuid) to authenticated;
grant execute on function public.create_test_invitation(text, text, timestamptz, integer) to authenticated;
grant execute on function public.redeem_test_invitation(text) to authenticated;

commit;
