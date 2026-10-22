import { supabase } from './supabase';

export type Invite = { code: string; role: 'editor' | 'viewer' };

export async function getInvite(noteId: string): Promise<Invite | null> {
  const { data, error } = await supabase
    .from('note_invites')
    .select('code, role')
    .eq('note_id', noteId)
    .maybeSingle();
  if (error) throw error;
  return (data as Invite | null) ?? null;
}

export async function createInvite(noteId: string, role: Invite['role']): Promise<string> {
  const { data, error } = await supabase.rpc('create_invite', { nid: noteId, r: role });
  if (error) throw error;
  return data as string;
}

export async function revokeInvite(noteId: string): Promise<void> {
  const { error } = await supabase.from('note_invites').delete().eq('note_id', noteId);
  if (error) throw error;
}

/** Joins the note behind `code` and returns its id. */
export async function joinByCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_note_by_code', { c: code });
  if (error) {
    if (error.message.includes('invalid code')) throw new Error('ไม่พบรหัสนี้ หรือรหัสถูกปิดแล้ว');
    throw error;
  }
  return data as string;
}
