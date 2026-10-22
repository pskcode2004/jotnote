import { Modal, Pressable, ScrollView, View } from 'react-native';
import type { Block } from '../lib/blocks';
import type { AddTarget } from '../lib/sections';
import { colors, radius } from '../lib/theme';
import { Button, T } from './ui';

type Props = {
  visible: boolean;
  typeLabel: string;
  headings: Block[];
  onPick: (target: AddTarget) => void;
  onClose: () => void;
};

export function AddBlockSheet({ visible, typeLabel, headings, onPick, onClose }: Props) {
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
          maxHeight: '70%',
        }}>
        <T w="sb" size={20}>
          เพิ่ม{typeLabel}ไว้ที่ไหน?
        </T>
        <ScrollView contentContainerStyle={{ gap: 8 }}>
          <Option label="ไม่อยู่ใต้หัวข้อ (ไว้ด้านบน)" dot={null} onPress={() => onPick(null)} />
          {headings.map((h) => (
            <Option key={h.id} label={h.content || 'หัวข้อไม่มีชื่อ'} dot={h.color ?? colors.sub} onPress={() => onPick(h.id)} />
          ))}
        </ScrollView>
        <Button kind="outline" label="ยกเลิก" onPress={onClose} />
      </View>
    </Modal>
  );
}

function Option({ label, dot, onPress }: { label: string; dot: string | null; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#fff',
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.line,
        padding: 14,
      }}>
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: dot ?? 'transparent',
          borderWidth: dot ? 0 : 1.5,
          borderColor: colors.sub,
        }}
      />
      <T w="m" size={16} style={{ flex: 1 }} color={dot ?? colors.text} numberOfLines={1}>
        {label}
      </T>
    </Pressable>
  );
}
