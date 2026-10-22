import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';
import { Button, Input, Orb, T } from './ui';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError('');
    const res =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { display_name: name.trim() } },
          });
    if (res.error) setError(thaiAuthError(res.error.message));
    else if (mode === 'signup' && !res.data.session)
      setError('กรุณายืนยันอีเมล หรือปิด Confirm email ใน Supabase');
    setBusy(false);
  }

  const login = mode === 'login';
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginBottom: 8, gap: 14 }}>
          <Orb size={120} />
          <T w="sb" size={30} style={{ textAlign: 'center', lineHeight: 42 }}>
            จดโน้ต<T w="sb" size={30} color={colors.orchid}>ร่วมกัน</T>
          </T>
          <T color={colors.sub} style={{ textAlign: 'center' }}>
            {login ? 'เข้าสู่ระบบเพื่อเริ่มจดกับเพื่อน' : 'สร้างบัญชีเพื่อเริ่มใช้งาน'}
          </T>
        </View>
        {!login && <Input placeholder="ชื่อที่แสดง" value={name} onChangeText={setName} />}
        <Input
          placeholder="อีเมล"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Input
          placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {!!error && <T color={colors.danger} size={13}>{error}</T>}
        <Button label={login ? 'เข้าสู่ระบบ  →' : 'สร้างบัญชี  →'} onPress={submit} disabled={busy} />
        <Link href={login ? '/(auth)/signup' : '/(auth)/login'} style={{ textAlign: 'center', marginTop: 4 }}>
          <T w="m" color={colors.navy}>
            {login ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
          </T>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function thaiAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  if (m.includes('already registered')) return 'อีเมลนี้ถูกใช้สมัครแล้ว';
  if (m.includes('password')) return 'รหัสผ่านไม่ผ่านเงื่อนไข (อย่างน้อย 6 ตัวอักษร)';
  if (m.includes('signups are disabled')) return 'ระบบปิดรับสมัครอยู่';
  if (m.includes('valid email') || m.includes('invalid email')) return 'รูปแบบอีเมลไม่ถูกต้อง';
  if (m.includes('network')) return 'เชื่อมต่ออินเทอร์เน็ตไม่ได้';
  return msg;
}
