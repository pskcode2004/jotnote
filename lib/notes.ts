import { supabase } from './supabase';

export type Note = { id: string; owner_id: string; title: string; updated_at: string };

export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('not signed in');
  return data.user.id;
}

export async function listNotes(): Promise<{ mine: Note[]; shared: Note[] }> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from('notes')
    .select('id, owner_id, title, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  const all = (data ?? []) as Note[];
  return {
    mine: all.filter((n) => n.owner_id === uid),
    shared: all.filter((n) => n.owner_id !== uid),
  };
}

export async function createNote(title: string): Promise<Note> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from('notes')
    .insert({ owner_id: uid, title })
    .select('id, owner_id, title, updated_at')
    .single();
  if (error) throw error;
  const { error: be } = await supabase
    .from('blocks')
    .insert({ note_id: data.id, position: 0, type: 'text', content: '' });
  if (be) throw be;
  return data as Note;
}

export async function updateNoteTitle(id: string, title: string): Promise<void> {
  const { error } = await supabase.from('notes').update({ title }).eq('id', id);
  if (error) throw error;
}

export async function leaveNote(noteId: string): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase
    .from('note_members')
    .delete()
    .eq('note_id', noteId)
    .eq('user_id', uid);
  if (error) throw error;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
}
