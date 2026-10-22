import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createNote, deleteNote, leaveNote, listNotes, type Note } from '../../lib/notes';
import { listMyTasks } from '../../lib/blocks';
import { joinByCode } from '../../lib/invites';
import { getMyProfile } from '../../lib/profile';
import { supabase } from '../../lib/supabase';
import { timeAgo } from '../../lib/dates';
import { colors, radius } from '../../lib/theme';
import { Button, Card, Chip, GradientFab, Input, Orb, T } from '../../components/ui';

type Filter = 'all' | 'mine' | 'shared';
type Row = Note & { owned: boolean };

export default function NotesScreen() {
  const router = useRouter();
  const [mine, setMine] = useState<Note[]>([]);
  const [shared, setShared] = useState<Note[]>([]);
  const [name, setName] = useState('');
  const [openTasks, setOpenTasks] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [r, p, tasks] = await Promise.all([listNotes(), getMyProfile(), listMyTasks()]);
      setMine(r.mine);
      setShared(r.shared);
      setName(p.display_name);
      setOpenTasks(tasks.filter((t) => !t.checked).length);
    } catch (e: any) {
      Alert.alert('เกิดข้อผิดพลาด', e.message);
    }
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // live list: someone shared a note with me / removed me / changed a note
  useEffect(() => {
    const reload = () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(load, 400);
    };
    const ch = supabase
      .channel('notes-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'note_members' }, reload)
      .subscribe();
    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      supabase.removeChannel(ch);
    };
  }, [load]);

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    const all: Row[] = [
      ...(filter === 'shared' ? [] : mine.map((n) => ({ ...n, owned: true }))),
      ...(filter === 'mine' ? [] : shared.map((n) => ({ ...n, owned: false }))),
    ];
    return all
      .filter((n) => !q || (n.title || 'ไม่มีชื่อ').toLowerCase().includes(q))
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  }, [mine, shared, query, filter]);

  async function create() {
    if (busy) return;
    setBusy(true);
    try {
      const n = await createNote(newTitle.trim() || 'ไม่มีชื่อ');
      setCreating(false);
      setNewTitle('');
      load();
      router.push(`/note/${n.id}`);
    } catch (e: any) {
      Alert.alert('เกิดข้อผิดพลาด', e.message);
    }
    setBusy(false);
  }

  async function join() {
    if (joinBusy || !code.trim()) return;
    setJoinBusy(true);
    try {
      const noteId = await joinByCode(code);
      setJoining(false);
      setCode('');
      load();
      router.push(`/note/${noteId}`);
    } catch (e: any) {
      Alert.alert('เข้าร่วมไม่สำเร็จ', e.message);
    }
    setJoinBusy(false);
  }

  function manage(n: Row) {
    const act = async (fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (e: any) {
        Alert.alert('เกิดข้อผิดพลาด', e.message);
      }
      load();
    };
    if (n.owned) {
      Alert.alert(n.title || 'ไม่มีชื่อ', 'ลบโน้ตนี้ของทุกคนใช่ไหม?', [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'ลบ', style: 'destructive', onPress: () => act(() => deleteNote(n.id)) },
      ]);
    } else {
      Alert.alert(n.title || 'ไม่มีชื่อ', 'ออกจากโน้ตที่แชร์นี้? คุณจะเข้าถึงไม่ได้อีก', [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'ออก', style: 'destructive', onPress: () => act(() => leaveNote(n.id)) },
      ]);
    }
  }

  const header = (
    <View style={{ gap: 16, paddingBottom: 8 }}>
      <View>
        <T w="sb" size={26}>
          สวัสดี, {name || '...'}
        </T>
        <T color={colors.sub}>วันนี้จะจดอะไรดี?</T>
      </View>

      <LinearGradient
        colors={['#F6EEF6', '#FBE9DF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radius.lg, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Orb size={86} />
        <View style={{ flex: 1, gap: 8 }}>
          <T w="sb" size={17}>
            {openTasks > 0 ? `คุณมีงานค้าง ${openTasks} รายการ` : 'ไม่มีงานค้าง เยี่ยมมาก!'}
          </T>
          <Button
            kind="outline"
            label="ดูงานของฉัน"
            onPress={() => router.push('/(tabs)/tasks')}
            style={{ paddingVertical: 8, alignSelf: 'flex-start' }}
          />
        </View>
      </LinearGradient>

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Input
          boxStyle={{ flex: 1 }}
          placeholder="ค้นหาโน้ต"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        <Pressable
          onPress={() => setJoining(true)}
          style={{
            height: 50,
            paddingHorizontal: 14,
            borderRadius: 18,
            backgroundColor: colors.orchidSoft,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 6,
          }}>
          <Ionicons name="enter-outline" size={20} color={colors.navy} />
          <T w="m" size={13} color={colors.navy}>
            ใส่รหัส
          </T>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Chip label="ทั้งหมด" active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="ของฉัน" active={filter === 'mine'} onPress={() => setFilter('mine')} />
        <Chip label="แชร์กับฉัน" active={filter === 'shared'} onPress={() => setFilter('shared')} />
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={rows}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: 20, paddingTop: 64, paddingBottom: 180, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <T color={colors.sub} style={{ textAlign: 'center', marginTop: 24 }}>
            {query ? 'ไม่พบโน้ตที่ค้นหา' : 'ยังไม่มีโน้ต กด + เพื่อสร้างโน้ตแรก'}
          </T>
        }
        renderItem={({ item }) => (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 }}>
            <Pressable
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
              onPress={() => router.push(`/note/${item.id}`)}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: colors.orchidSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name={item.owned ? 'document-text' : 'people'} size={22} color={colors.orchid} />
              </View>
              <View style={{ flex: 1 }}>
                <T w="m" size={16} numberOfLines={1}>
                  {item.title || 'ไม่มีชื่อ'}
                </T>
                <T size={12} color={colors.sub}>
                  {item.owned ? 'ของฉัน' : 'แชร์กับฉัน'} · แก้ไข{timeAgo(item.updated_at)}
                </T>
              </View>
            </Pressable>
            <Pressable
              onPress={() => manage(item)}
              hitSlop={6}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FBECEC',
              }}>
              <Ionicons name={item.owned ? 'trash-outline' : 'exit-outline'} size={20} color={colors.danger} />
            </Pressable>
          </Card>
        )}
      />
      <GradientFab onPress={() => setCreating(true)} />
      <Modal visible={joining} transparent animationType="fade" onRequestClose={() => setJoining(false)}>
        <View style={{ flex: 1, backgroundColor: '#1D285E66', justifyContent: 'center', padding: 24 }}>
          <Card style={{ gap: 14 }}>
            <T w="sb" size={20}>
              เข้าร่วมด้วยรหัส
            </T>
            <T size={13} color={colors.sub}>
              ใส่รหัสเชิญ 6 ตัวที่เพื่อนส่งให้
            </T>
            <Input
              autoFocus
              placeholder="เช่น K7M2QX"
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
              onSubmitEditing={join}
              style={{ letterSpacing: 4, fontSize: 20 }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                kind="outline"
                label="ยกเลิก"
                onPress={() => {
                  setJoining(false);
                  setCode('');
                }}
                style={{ flex: 1 }}
              />
              <Button
                label={joinBusy ? 'กำลังเข้าร่วม...' : 'เข้าร่วม'}
                onPress={join}
                disabled={joinBusy || code.trim().length < 6}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
      <Modal visible={creating} transparent animationType="fade" onRequestClose={() => setCreating(false)}>
        <View style={{ flex: 1, backgroundColor: '#1D285E66', justifyContent: 'center', padding: 24 }}>
          <Card style={{ gap: 14 }}>
            <T w="sb" size={20}>
              สร้างโน้ตใหม่
            </T>
            <Input
              autoFocus
              placeholder="ตั้งชื่อโน้ต"
              value={newTitle}
              onChangeText={setNewTitle}
              onSubmitEditing={create}
              returnKeyType="done"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                kind="outline"
                label="ยกเลิก"
                onPress={() => {
                  setCreating(false);
                  setNewTitle('');
                }}
                style={{ flex: 1 }}
              />
              <Button label={busy ? 'กำลังสร้าง...' : 'สร้างโน้ต'} onPress={create} disabled={busy} style={{ flex: 1 }} />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}
