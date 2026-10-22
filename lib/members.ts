import { supabase } from './supabase';

export type Member = {
  user_id: string;
  email: string;
  display_name: string;
  role: 'owner' | 'editor' | 'viewer';
};

export async function listMembers(noteId: string): Promise<Member[]> {
  const { data: note, error: ne } = await supabase
    .from('notes')
    .select('owner_id')
    .eq('id', noteId)
    .maybeSingle();
  if (ne) throw ne;
  if (!note) throw new Error('ไม่พบโน้ต');

  const [{ data: owner }, { data: rows, error }] = await Promise.all([
    supabase.from('profiles').select('id, email, display_name').eq('id', note.owner_id).single(),
    supabase.from('note_members').select('user_id, role, profiles(email, display_name)').eq('note_id', noteId),
  ]);
  if (error) throw error;

  const members: Member[] = [];
  if (owner) {
    members.push({ user_id: owner.id, email: owner.email, display_name: owner.display_name, role: 'owner' });
  }
  for (const r of (rows ?? []) as any[]) {
    members.push({
      user_id: r.user_id,
      email: r.profiles?.email ?? '',
      display_name: r.profiles?.display_name ?? '',
      role: r.role,
    });
  }
  return members;
}

export async function shareNote(
  noteId: string,
  email: string,
  role: 'editor' | 'viewer'
): Promise<void> {
  const { data: me } = await supabase.auth.getUser();
  const { data: profile, error: pe } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  if (pe) throw pe;
  if (!profile) throw new Error('ไม่พบผู้ใช้ที่ใช้อีเมลนี้');
  if (profile.id === me.user?.id) throw new Error('แชร์ให้ตัวเองไม่ได้');

  const { error } = await supabase
    .from('note_members')
    .insert({ note_id: noteId, user_id: profile.id, role });
  if (error) {
    if (error.code === '23505') throw new Error('แชร์ให้คนนี้ไปแล้ว');
    throw error;
  }
}

export async function removeMember(noteId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('note_members')
    .delete()
    .eq('note_id', noteId)
    .eq('user_id', userId);
  if (error) throw error;
}
