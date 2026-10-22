import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listMyTasks, updateBlock, type TaskRow } from '../../lib/blocks';
import { formatDue, isOverdue } from '../../lib/dates';
import { colors } from '../../lib/theme';
import { Card, T } from '../../components/ui';

export default function Tasks() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setTasks(await listMyTasks());
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

  async function toggle(t: TaskRow) {
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, checked: !x.checked } : x)));
    try {
      await updateBlock(t.id, { checked: !t.checked });
    } catch (e: any) {
      Alert.alert('เกิดข้อผิดพลาด', e.message === 'no permission' ? 'คุณไม่มีสิทธิ์แก้ไขรายการนี้' : e.message);
      load();
    }
  }

  const open = tasks.filter((t) => !t.checked).length;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      data={tasks}
      keyExtractor={(t) => t.id}
      contentContainerStyle={{ padding: 20, paddingTop: 64, paddingBottom: 120, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 8 }}>
          <T w="sb" size={26}>
            งานของฉัน
          </T>
          <T color={colors.sub}>งานที่เพื่อนมอบหมายให้ จากทุกโน้ต · ค้าง {open} รายการ</T>
        </View>
      }
      ListEmptyComponent={
        <T color={colors.sub} style={{ textAlign: 'center', marginTop: 24 }}>
          ยังไม่มีงานที่ถูกมอบหมายให้คุณ
        </T>
      }
      renderItem={({ item }) => {
        const late = isOverdue(item.due_date, item.checked);
        return (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={() => toggle(item)} hitSlop={8}>
              <Ionicons
                name={item.checked ? 'checkmark-circle' : 'ellipse-outline'}
                size={28}
                color={item.checked ? colors.orchid : colors.sub}
              />
            </Pressable>
            <Pressable style={{ flex: 1 }} onPress={() => router.push(`/note/${item.note_id}`)}>
              <T
                w="m"
                size={16}
                color={item.checked ? colors.sub : colors.text}
                style={item.checked ? { textDecorationLine: 'line-through' } : undefined}>
                {item.content || '(ว่าง)'}
              </T>
              <T size={12} color={colors.sub}>
                {item.note_title || 'ไม่มีชื่อ'}
                {item.due_date ? `  ·  ครบกำหนด ${formatDue(item.due_date)}` : ''}
              </T>
              {late && (
                <T w="sb" size={12} color={colors.danger}>
                  เลยกำหนดแล้ว
                </T>
              )}
            </Pressable>
          </Card>
        );
      }}
    />
  );
}
