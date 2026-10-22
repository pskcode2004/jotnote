import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Block } from '../lib/blocks';
import type { Member } from '../lib/members';
import { userColor } from '../lib/userColor';
import { formatDue, isOverdue } from '../lib/dates';
import { blockColors, colors, fonts } from '../lib/theme';
import { Chip, T } from './ui';
import { DueEditor } from './DueEditor';

type Props = {
  block: Block;
  editable: boolean;
  members: Member[];
  accent: string | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChangeText: (text: string) => void;
  onToggle: () => void;
  onDelete: () => void;
  onAssign: (userId: string | null) => void;
  onDue: (date: string | null) => void;
  onColor: (hex: string | null) => void;
  onMove: (dir: -1 | 1) => void;
};

export function BlockRow(p: Props) {
  const { block, editable, members } = p;
  const [picking, setPicking] = useState<'assign' | 'due' | 'color' | null>(null);
  const nameOf = (id: string | null) => {
    const m = members.find((x) => x.user_id === id);
    return m ? m.display_name || m.email : '';
  };
  const editor = nameOf(block.updated_by);
  const assignee = nameOf(block.assigned_to);
  const overdue = isOverdue(block.due_date, block.checked);
  const isTodo = block.type === 'checklist';
  const isHeading = block.type === 'heading';
  const toggle = (k: 'assign' | 'due' | 'color') => setPicking(picking === k ? null : k);

  return (
    <View style={[s.wrap, p.accent ? { borderLeftWidth: 4, borderLeftColor: p.accent, paddingLeft: 10 } : null]}>
      <View style={s.row}>
        {isTodo && (
          <Pressable disabled={!editable} onPress={p.onToggle} hitSlop={6} style={{ marginTop: 4 }}>
            <Ionicons
              name={block.checked ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={block.checked ? colors.orchid : colors.sub}
            />
          </Pressable>
        )}
        <TextInput
          style={[
            s.input,
            isHeading && s.heading,
            block.color ? { color: block.color } : null,
            isTodo && block.checked && { textDecorationLine: 'line-through', color: colors.sub },
          ]}
          multiline
          editable={editable}
          placeholder={isTodo ? 'สิ่งที่ต้องทำ' : isHeading ? 'ชื่อหัวข้อ' : 'พิมพ์อะไรสักอย่าง...'}
          placeholderTextColor={colors.sub}
          value={block.content}
          onChangeText={p.onChangeText}
        />
        {editable && (
          <View style={s.tools}>
            <Pressable onPress={() => toggle('color')} hitSlop={6}>
              <View style={[s.dot, { backgroundColor: block.color ?? colors.line, borderColor: block.color ?? colors.sub }]} />
            </Pressable>
            <Pressable disabled={!p.canMoveUp} onPress={() => p.onMove(-1)} hitSlop={6}>
              <Ionicons name="arrow-up" size={18} color={colors.sub} style={!p.canMoveUp && s.off} />
            </Pressable>
            <Pressable disabled={!p.canMoveDown} onPress={() => p.onMove(1)} hitSlop={6}>
              <Ionicons name="arrow-down" size={18} color={colors.sub} style={!p.canMoveDown && s.off} />
            </Pressable>
            <Pressable onPress={p.onDelete} hitSlop={6}>
              <Ionicons name="close" size={18} color={colors.sub} />
            </Pressable>
          </View>
        )}
      </View>

      <View style={[s.meta, isTodo && { marginLeft: 34 }]}>
        {!!editor && (
          <View style={[s.badge, { backgroundColor: userColor(block.updated_by) }]}>
            <T size={10} color="#fff">
              แก้โดย {editor}
            </T>
          </View>
        )}
        {isTodo && (
          <>
            <Pressable disabled={!editable} onPress={() => toggle('assign')}>
              <T size={12} w="m" color={colors.navy}>
                {assignee ? `@${assignee}` : editable ? '+ มอบหมาย' : ''}
              </T>
            </Pressable>
            <Pressable disabled={!editable} onPress={() => toggle('due')}>
              <T size={12} w="m" color={overdue ? colors.danger : colors.navy}>
                {block.due_date ? `ครบกำหนด ${formatDue(block.due_date)}` : editable ? '+ กำหนดวันเวลา' : ''}
              </T>
            </Pressable>
          </>
        )}
      </View>

      {picking === 'color' && (
        <View style={s.palette}>
          <T size={12} color={colors.sub}>
            สีตัวอักษร{isHeading ? ' (ใช้เป็นสีของทั้งหัวข้อ)' : ''}
          </T>
          <View style={s.swatches}>
            <Pressable
              onPress={() => {
                p.onColor(null);
                setPicking(null);
              }}
              style={[s.swatch, { backgroundColor: '#fff', borderColor: colors.line }]}>
              <T size={11} color={colors.sub}>
                ปกติ
              </T>
            </Pressable>
            {blockColors.map((c) => (
              <Pressable
                key={c.hex}
                onPress={() => {
                  p.onColor(c.hex);
                  setPicking(null);
                }}
                accessibilityLabel={c.name}
                style={[s.swatch, { backgroundColor: c.hex, borderColor: block.color === c.hex ? colors.text : c.hex }]}
              />
            ))}
          </View>
        </View>
      )}
      {picking === 'assign' && (
        <ScrollView horizontal keyboardShouldPersistTaps="handled" style={s.chips} showsHorizontalScrollIndicator={false}>
          <Chip label="ไม่มอบหมาย" onPress={() => { p.onAssign(null); setPicking(null); }} />
          {members.map((m) => (
            <Chip
              key={m.user_id}
              label={m.display_name || m.email}
              color={userColor(m.user_id)}
              onPress={() => { p.onAssign(m.user_id); setPicking(null); }}
            />
          ))}
        </ScrollView>
      )}
      {picking === 'due' && (
        <DueEditor
          value={block.due_date}
          onPick={(iso) => {
            p.onDue(iso);
            setPicking(null);
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  input: { flex: 1, fontFamily: fonts.r, fontSize: 16, color: colors.text, paddingVertical: 4, paddingHorizontal: 0 },
  heading: { fontFamily: fonts.sb, fontSize: 22 },
  tools: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 6 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  off: { opacity: 0.25 },
  meta: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' },
  badge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 1 },
  chips: { marginTop: 8 },
  palette: { marginTop: 8, gap: 6 },
  swatches: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
