update public.profiles
set community_visible = true, updated_at = now()
where onboarding_complete = true and community_visible = false;
