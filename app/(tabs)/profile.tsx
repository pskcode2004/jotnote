import { useCallback, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import {
  changePassword,
  deleteMyAccount,
  getMyProfile,
  updateDisplayName,
  type MyProfile,
} from '../../lib/profile';
import { colors } from '../../lib/theme';
import { Avatar, Button, Card, Input, T } from '../../components/ui';

export default function Profile() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  useFocusEffect(
    useCallback(() => {
      getMyProfile()
        .then((p) => {
          setProfile(p);
          setName(p.display_name);
        })
        .catch((e) => Alert.alert('เกิดข้อผิดพลาด', e.message));
    }, [])
  );

  async function run(fn: () => Promise<void>, ok: string) {
    try {
      await fn();
      Alert.alert('สำเร็จ', ok);
    } catch (e: any) {
      Alert.alert('เกิดข้อผิดพลาด', e.message);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'ลบบัญชี?',
      'บัญชีและโน้ตทั้งหมดที่คุณเป็นเจ้าของจะถูกลบถาวร ย้อนกลับไม่ได้',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบบัญชี',
          style: 'destructive',
          onPress: () => deleteMyAccount().catch((e) => Alert.alert('เกิดข้อผิดพลาด', e.message)),
        },
      ]
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: 64, paddingBottom: 120, gap: 16 }}
      keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Avatar name={profile?.display_name || profile?.email || '?'} size={84} />
        <T w="sb" size={22}>
          {profile?.display_name || '...'}
        </T>
        <T color={colors.sub}>{profile?.email ?? ''}</T>
      </View>

      <Card style={{ gap: 10 }}>
        <T w="m">ชื่อที่แสดง</T>
        <Input value={name} onChangeText={setName} placeholder="ชื่อของคุณ" />
        <Button
          label="บันทึกชื่อ"
          onPress={() =>
            run(async () => {
              await updateDisplayName(name);
              setProfile((p) => (p ? { ...p, display_name: name.trim() } : p));
            }, 'อัปเดตชื่อแล้ว')
          }
        />
      </Card>

      <Card style={{ gap: 10 }}>
        <T w="m">เปลี่ยนรหัสผ่าน</T>
        <Input
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)"
        />
        <Button
          kind="soft"
          label="เปลี่ยนรหัสผ่าน"
          onPress={() =>
            run(async () => {
              await changePassword(password);
              setPassword('');
            }, 'เปลี่ยนรหัสผ่านแล้ว')
          }
        />
      </Card>

      <Button kind="outline" label="ออกจากระบบ" onPress={() => supabase.auth.signOut()} />
      <Button kind="danger" label="ลบบัญชี" onPress={confirmDelete} />
    </ScrollView>
  );
}
