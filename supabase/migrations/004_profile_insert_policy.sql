-- Allow users to insert their own profile row
-- Needed as fallback if handle_new_user trigger hasn't run yet
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
