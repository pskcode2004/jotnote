import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type Present = { id: string; name: string };

export function usePresence(noteId: string, me: Present | null): Present[] {
  const [people, setPeople] = useState<Present[]>([]);

  useEffect(() => {
    if (!me) return;
    const channel = supabase.channel(`note:${noteId}`, { config: { presence: { key: me.id } } });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, any[]>;
        setPeople(
          Object.values(state)
            .map((metas) => metas[0] as Present)
            .filter(Boolean)
        );
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ id: me.id, name: me.name });
      });
    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [noteId, me?.id, me?.name]);

  return people;
}
