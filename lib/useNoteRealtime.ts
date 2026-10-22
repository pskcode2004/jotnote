import { useEffect, useRef } from 'react';
import { supabase } from './supabase';
import type { Block } from './blocks';

export type BlockEvent = { type: 'INSERT' | 'UPDATE' | 'DELETE'; row: Block };

export function useNoteRealtime(
  noteId: string,
  onChange: (e: BlockEvent) => void,
  onNoteGone: () => void
): void {
  const changeRef = useRef(onChange);
  const goneRef = useRef(onNoteGone);
  changeRef.current = onChange;
  goneRef.current = onNoteGone;

  useEffect(() => {
    const channel = supabase
      .channel(`blocks:${noteId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blocks', filter: `note_id=eq.${noteId}` },
        (p: any) => {
          const row = (p.eventType === 'DELETE' ? p.old : p.new) as Block;
          changeRef.current({ type: p.eventType, row });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notes', filter: `id=eq.${noteId}` },
        () => goneRef.current()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [noteId]);
}
