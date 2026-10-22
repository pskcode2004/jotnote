import { supabase } from './supabase';

export type MyProfile = { id: string; email: string; display_name: string };

export async function getMyProfile(): Promise<MyProfile> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('not signed in');
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .eq('id', u.user.id)
    .single();
  if (error) throw error;
  return data as MyProfile;
}

export async function updateDisplayName(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('กรุณากรอกชื่อ');
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('not signed in');
  const { error } = await supabase.from('profiles').update({ display_name: trimmed }).eq('id', u.user.id);
  if (error) throw error;
}

export async function changePassword(password: string): Promise<void> {
  if (password.length < 6) throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  await supabase.auth.signOut();
}
