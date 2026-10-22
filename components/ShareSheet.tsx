import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, View } from 'react-native';
import { removeMember, shareNote, type Member } from '../lib/members';
import { createInvite, getInvite, revokeInvite, type Invite } from '../lib/invites';
import { userColor } from '../lib/userColor';
import { colors, radius } from '../lib/theme';
import { Avatar, Button, Card, Chip, Input, T } from './ui';

type Props = {
  visible: boolean;
  noteId: string;
  noteTitle: string;
  members: Member[];
  isOwner: boolean;
  onClose: () => void;
  onChanged: () => void;
};

const ROLE_TH = { owner: 'เจ้าของ', editor: 'แก้ไขได้', viewer: 'ดูอย่างเดียว' } as const;

export function ShareSheet({ visible, noteId, noteTitle, members, isOwner, onClose, onChanged }: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [invite, setInvite] = useState<Invite | null>(null);

  const loadInvite = useCallback(async () => {
    try {
      setInvite(await getInvite(noteId));
    } catch (e: any) {
      setMsg({ text: e.message, ok: false });
    }
  }, [noteId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (visible && isOwner) loadInvite();
  }, [visible, isOwner, loadInvite]);

  async function share() {
    setMsg(null);
    try {
      await shareNote(noteId, email, role);
      setEmail('');
      setMsg({ text: 'แชร์แล้ว', ok: true });
      onChanged();
    } catch (e: any) {
      setMsg({ text: e.message, ok: false });
    }
  }

  async function remove(userId: string) {
    try {
      await removeMember(noteId, userId);
      onChanged();
    } catch (e: any) {
      setMsg({ text: e.message, ok: false });
    }
  }

  async function makeInvite() {
    setMsg(null);
    try {
      const code = await createInvite(noteId, role);
      setInvite({ code, role });
    } catch (e: any) {
      setMsg({ text: e.message, ok: false });
    }
  }

  async function closeInvite() {
    try {
      await revokeInvite(noteId);
      setInvite(null);
    } catch (e: any) {
      setMsg({ text: e.message, ok: false });
    }
  }

  function sendInvite() {
    if (!invite) return;
    Share.share({
      message: `มาจดโน้ต "${noteTitle || 'ไม่มีชื่อ'}" ด้วยกันใน Jotnote\nรหัสเชิญ: ${invite.code}\n(เปิดแอป > กดไอคอนเข้าร่วม > ใส่รหัส)`,
    }).catch(() => {});
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#1D285E66' }} onPress={onClose} />
      <View
        style={{
          backgroundColor: colors.bg,
          padding: 20,
          gap: 12,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          maxHeight: '85%',
        }}>
        <T w="sb" size={20}>
          แชร์โน้ต
        </T>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
          {isOwner && (
            <>
              <T w="m" color={colors.sub} size={13}>
                สิทธิ์ของคนที่ได้รับเชิญ
              </T>
              <View style={{ flexDirection: 'row' }}>
                <Chip label="แก้ไขได้" active={role === 'editor'} onPress={() => setRole('editor')} />
                <Chip label="ดูอย่างเดียว" active={role === 'viewer'} onPress={() => setRole('viewer')} />
              </View>

              <Card style={{ gap: 10 }}>
                <T w="m">เชิญด้วยรหัส</T>
                {invite ? (
                  <>
                    <T w="sb" size={34} color={colors.navy} style={{ letterSpacing: 6, textAlign: 'center' }}>
                      {invite.code}
                    </T>
                    <T size={12} color={colors.sub} style={{ textAlign: 'center' }}>
                      ใครมีรหัสนี้เข้าร่วมได้ ({ROLE_TH[invite.role]})
                    </T>
                    <Button label="ส่งรหัสให้เพื่อน" onPress={sendInvite} />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button kind="soft" label="สร้างรหัสใหม่" onPress={makeInvite} style={{ flex: 1, paddingVertical: 10 }} />
                      <Button kind="danger" label="ปิดรหัส" onPress={closeInvite} style={{ flex: 1, paddingVertical: 10 }} />
                    </View>
                  </>
                ) : (
                  <Button label="สร้างรหัสเชิญ" onPress={makeInvite} />
                )}
              </Card>

              <Card style={{ gap: 10 }}>
                <T w="m">หรือเชิญด้วยอีเมล</T>
                <Input
                  placeholder="อีเมลเพื่อน"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
                <Button label="แชร์ด้วยอีเมล" onPress={share} />
              </Card>
            </>
          )}
          {!!msg && <T size={13} color={msg.ok ? colors.navy : colors.danger}>{msg.text}</T>}
          <T w="m" color={colors.sub} size={13}>
            คนที่เข้าถึงโน้ตนี้
          </T>
          {members.map((m) => (
            <View key={m.user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar name={m.display_name || m.email} color={userColor(m.user_id)} />
              <View style={{ flex: 1 }}>
                <T w="m">{m.display_name || m.email}</T>
                <T size={12} color={colors.sub}>
                  {m.email} · {ROLE_TH[m.role]}
                </T>
              </View>
              {isOwner && m.role !== 'owner' && (
                <Pressable onPress={() => remove(m.user_id)}>
                  <T w="m" size={13} color={colors.danger}>
                    นำออก
                  </T>
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>
        <Button kind="outline" label="ปิด" onPress={onClose} />
      </View>
    </Modal>
  );
}
