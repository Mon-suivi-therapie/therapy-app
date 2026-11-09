-- =====================================================================
-- CORRECTIF : donne accès à tout compte CONNECTÉ (le tien, le seul existant).
-- À lancer dans Supabase > SQL Editor > Run. Aucun email à modifier.
--
-- Pré-requis : Authentication > Sign In / Providers > "Allow new users to
-- sign up" doit être DÉSACTIVÉ (sinon quelqu'un pourrait créer un compte).
-- Tes données ne sont pas touchées : seules les règles d'accès changent.
-- =====================================================================

do $$
declare
  t text;
  r record;
  tables text[] := array[
    'historique_prises','cycle_temperature','rdv_medicaux','suivi_glycemie','suivi_poids',
    'tests_ovulation','suivi_pma','examens_pma','questions_medecin','rdv_a_prendre',
    'suivi_douleur_fatigue','suivi_neuro','resultats_bilans','medicaments','config_grossesse'
  ];
begin
  foreach t in array tables loop
    if to_regclass('public.' || quote_ident(t)) is null then
      continue;
    end if;
    for r in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', r.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "compte connecte" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
