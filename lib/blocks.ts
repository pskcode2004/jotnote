import { supabase } from './supabase';

export type Block = {
  id: string;
  note_id: string;
  position: number;
  type: 'text' | 'checklist' | 'heading';
  content: string;
  checked: boolean;
  assigned_to: string | null;
  due_date: string | null;
  color: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type BlockPatch = Partial<
  Pick<Block, 'content' | 'checked' | 'assigned_to' | 'due_date' | 'position' | 'color'>
>;

export async function listBlocks(noteId: string): Promise<Block[]> {
  const { data, error } = await supabase
    .from('blocks')
    .select('*')
    .eq('note_id', noteId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Block[];
}

export async function addBlock(
  noteId: string,
  type: Block['type'],
  position: number
): Promise<Block> {
  const { data, error } = await supabase
    .from('blocks')
    .insert({ note_id: noteId, type, position })
    .select('*')
    .single();
  if (error) throw error;
  return data as Block;
}

/** Inserts a block at `index` and renumbers the blocks after it. Returns the new ordered list. */
export async function insertBlockAt(
  noteId: string,
  type: Block['type'],
  index: number,
  current: Block[]
): Promise<Block[]> {
  const created = await addBlock(noteId, type, index);
  const next = [...current.slice(0, index), created, ...current.slice(index)];
  await saveOrder(next);
  return next.map((b, i) => ({ ...b, position: i }));
}

export async function updateBlock(id: string, patch: BlockPatch): Promise<void> {
  const { data, error } = await supabase.from('blocks').update(patch).eq('id', id).select('id');
  if (error) throw error;
  // RLS silently filters rows the user may not edit
  if (!data || data.length === 0) throw new Error('no permission');
}

export async function deleteBlock(id: string): Promise<void> {
  const { error } = await supabase.from('blocks').delete().eq('id', id);
  if (error) throw error;
}

/** Rewrites positions to 0..n-1 following the given order; only changed rows are written. */
export async function saveOrder(ordered: Block[]): Promise<void> {
  const changed = ordered.map((b, i) => ({ b, i })).filter(({ b, i }) => b.position !== i);
  await Promise.all(changed.map(({ b, i }) => updateBlock(b.id, { position: i })));
}

export type TaskRow = Block & { note_title: string };

export async function listMyTasks(): Promise<TaskRow[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('not signed in');
  const { data, error } = await supabase
    .from('blocks')
    .select('*, notes(title)')
    .eq('assigned_to', u.user.id)
    .eq('type', 'checklist');
  if (error) throw error;
  const rows = (data ?? []).map((r: any) => {
    const { notes, ...rest } = r;
    return { ...rest, note_title: notes?.title ?? '' } as TaskRow;
  });
  // unchecked first, then earliest due date (no date last), then newest
  return rows.sort((a, b) => {
    if (a.checked !== b.checked) return a.checked ? 1 : -1;
    if (a.due_date !== b.due_date) {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date < b.due_date ? -1 : 1;
    }
    return a.updated_at < b.updated_at ? 1 : -1;
  });
}
