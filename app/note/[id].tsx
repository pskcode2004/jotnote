import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { updateNoteTitle } from '../../lib/notes';
import {
  deleteBlock,
  insertBlockAt,
  listBlocks,
  saveOrder,
  updateBlock,
  type Block,
  type BlockPatch,
} from '../../lib/blocks';
import { listMembers, type Member } from '../../lib/members';
import { useNoteRealtime, type BlockEvent } from '../../lib/useNoteRealtime';
import { usePresence } from '../../lib/usePresence';
import { colors, fonts, radius } from '../../lib/theme';
import { BlockRow } from '../../components/BlockRow';
import { PresenceBar } from '../../components/PresenceBar';
import { ShareSheet } from '../../components/ShareSheet';
import { Card, Chip, T } from '../../components/ui';
import { AddBlockSheet } from '../../components/AddBlockSheet';
import { accents, insertIndex, type AddTarget } from '../../lib/sections';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [pendingType, setPendingType] = useState<Block['type'] | null>(null);

  const pending = useRef(new Map<string, { patch: BlockPatch; timer: ReturnType<typeof setTimeout> }>());
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef('');

  const people = usePresence(id, me);

  const myRole = members.find((m) => m.user_id === me?.id)?.role;
  const isOwner = myRole === 'owner';
  const editable = myRole === 'owner' || myRole === 'editor';

  const loadAll = useCallback(async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: note }, bl, mem] = await Promise.all([
        supabase.from('notes').select('title').eq('id', id).maybeSingle(),
        listBlocks(id),
        listMembers(id),
      ]);
      if (!note) {
        router.back();
        return;
      }
      setTitle(note.title);
      titleRef.current = note.title;
      setBlocks(bl);
      setMembers(mem);
      const mine = mem.find((m) => m.user_id === u.user!.id);
      setMe({ id: u.user.id, name: mine?.display_name || mine?.email || 'ฉัน' });
    } catch {
      router.back();
    }
  }, [id]);

  useEffect(() => {
    // async load: state is set after the awaited requests, not synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  const flush = useCallback(
    async (blockId: string) => {
      const entry = pending.current.get(blockId);
      if (!entry) return;
      clearTimeout(entry.timer);
      pending.current.delete(blockId);
      try {
        await updateBlock(blockId, entry.patch);
      } catch (e: any) {
        Alert.alert(
          'บันทึกไม่สำเร็จ',
          e.message === 'no permission' ? 'คุณไม่มีสิทธิ์แก้ไขโน้ตนี้' : e.message
        );
        loadAll();
      }
    },
    [loadAll]
  );

  // flush unsaved edits when leaving the screen
  useEffect(() => {
    const map = pending.current;
    return () => {
      for (const blockId of Array.from(map.keys())) {
        const entry = map.get(blockId)!;
        clearTimeout(entry.timer);
        map.delete(blockId);
        updateBlock(blockId, entry.patch).catch(() => {});
      }
      if (titleTimer.current) {
        clearTimeout(titleTimer.current);
        updateNoteTitle(id, titleRef.current).catch(() => {});
      }
    };
  }, [id]);

  function schedule(blockId: string, patch: BlockPatch, delay = 500) {
    const prev = pending.current.get(blockId);
    if (prev) clearTimeout(prev.timer);
    pending.current.set(blockId, {
      patch: { ...(prev?.patch ?? {}), ...patch },
      timer: setTimeout(() => flush(blockId), delay),
    });
  }

  function patchLocal(blockId: string, patch: BlockPatch) {
    setBlocks((bs) => bs.map((b) => (b.id === blockId ? { ...b, ...patch } : b)));
  }

  const onRealtime = useCallback(
    (e: BlockEvent) => {
      setBlocks((bs) => {
        if (e.type === 'DELETE') return bs.filter((b) => b.id !== e.row.id);
        if (e.type === 'INSERT') {
          if (bs.some((b) => b.id === e.row.id)) return bs;
          return [...bs, e.row].sort((a, b) => a.position - b.position);
        }
        // UPDATE: skip echoes of my own edits and blocks I am typing in
        if (e.row.updated_by === me?.id || pending.current.has(e.row.id)) return bs;
        return bs.map((b) => (b.id === e.row.id ? e.row : b)).sort((a, b) => a.position - b.position);
      });
    },
    [me?.id]
  );

  useNoteRealtime(id, onRealtime, () => router.back());

  // members changes (shared / removed) refresh the role
  useEffect(() => {
    const ch = supabase
      .channel(`members:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'note_members', filter: `note_id=eq.${id}` }, () =>
        loadAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, loadAll]);

  async function add(type: Block['type'], target: AddTarget) {
    try {
      const next = await insertBlockAt(id, type, insertIndex(blocks, target), blocks);
      setBlocks(next);
    } catch (e: any) {
      Alert.alert('เกิดข้อผิดพลาด', e.message);
    }
  }

  /** Text/checklist ask which heading to go under when the note has headings. */
  function requestAdd(type: Block['type']) {
    if (blocks.some((b) => b.type === 'heading')) setPendingType(type);
    else add(type, 'end');
  }

  async function remove(blockId: string) {
    const prev = blocks;
    setBlocks((bs) => bs.filter((b) => b.id !== blockId));
    pending.current.delete(blockId);
    try {
      await deleteBlock(blockId);
    } catch (e: any) {
      setBlocks(prev);
      Alert.alert('เกิดข้อผิดพลาด', e.message);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= blocks.length) return;
    const prev = blocks;
    const next = [...blocks];
    [next[index], next[j]] = [next[j], next[index]];
    setBlocks(next.map((b, i) => ({ ...b, position: i })));
    try {
      await saveOrder(next);
    } catch (e: any) {
      setBlocks(prev);
      Alert.alert('ย้ายไม่สำเร็จ', e.message);
    }
  }

  function changeTitle(t: string) {
    setTitle(t);
    titleRef.current = t;
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      titleTimer.current = null;
      updateNoteTitle(id, t).catch((e) => Alert.alert('บันทึกชื่อไม่สำเร็จ', e.message));
    }, 600);
  }

  const sectionAccents = accents(blocks);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 14 }} keyboardShouldPersistTaps="handled">
        <TextInput
          style={{ fontFamily: fonts.sb, fontSize: 28, color: colors.text, padding: 0 }}
          placeholder="ไม่มีชื่อ"
          placeholderTextColor={colors.sub}
          value={title}
          editable={editable}
          multiline
          onChangeText={changeTitle}
        />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {me ? <PresenceBar people={people} meId={me.id} /> : <View />}
          <Pressable
            onPress={() => setShareOpen(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#fff',
              borderRadius: radius.pill,
              paddingVertical: 7,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: colors.line,
            }}>
            <Ionicons name="share-social-outline" size={16} color={colors.navy} />
            <T w="m" size={13} color={colors.navy}>
              แชร์
            </T>
          </Pressable>
        </View>

        {!editable && !!myRole && (
          <T size={13} color={colors.orchid} w="m">
            โหมดดูอย่างเดียว: คุณแก้ไขโน้ตนี้ไม่ได้
          </T>
        )}

        <Card style={{ paddingVertical: 8 }}>
          {blocks.map((b, i) => (
            <BlockRow
              key={b.id}
              block={b}
              editable={editable}
              members={members}
              accent={sectionAccents[i]}
              onColor={(hex) => {
                patchLocal(b.id, { color: hex });
                schedule(b.id, { color: hex }, 0);
              }}
              canMoveUp={i > 0}
              canMoveDown={i < blocks.length - 1}
              onMove={(dir) => move(i, dir)}
              onChangeText={(t) => {
                patchLocal(b.id, { content: t });
                schedule(b.id, { content: t });
              }}
              onToggle={() => {
                patchLocal(b.id, { checked: !b.checked });
                schedule(b.id, { checked: !b.checked }, 0);
              }}
              onAssign={(uid) => {
                patchLocal(b.id, { assigned_to: uid });
                schedule(b.id, { assigned_to: uid }, 0);
              }}
              onDue={(d) => {
                patchLocal(b.id, { due_date: d });
                schedule(b.id, { due_date: d }, 0);
              }}
              onDelete={() => remove(b.id)}
            />
          ))}
          {blocks.length === 0 && (
            <T color={colors.sub} style={{ paddingVertical: 12, textAlign: 'center' }}>
              ยังไม่มีเนื้อหา
            </T>
          )}
        </Card>

        {editable && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chip label="+ หัวข้อ" onPress={() => add('heading', 'end')} />
            <Chip label="+ ข้อความ" onPress={() => requestAdd('text')} />
            <Chip label="+ เช็กลิสต์" onPress={() => requestAdd('checklist')} />
          </ScrollView>
        )}
      </ScrollView>

      <AddBlockSheet
        visible={pendingType !== null}
        typeLabel={pendingType === 'checklist' ? 'เช็กลิสต์' : 'ข้อความ'}
        headings={blocks.filter((b) => b.type === 'heading')}
        onClose={() => setPendingType(null)}
        onPick={(target) => {
          const t = pendingType;
          setPendingType(null);
          if (t) add(t, target);
        }}
      />
      <ShareSheet
        visible={shareOpen}
        noteId={id}
        noteTitle={title}
        members={members}
        isOwner={isOwner}
        onClose={() => setShareOpen(false)}
        onChanged={loadAll}
      />
    </KeyboardAvoidingView>
  );
}
