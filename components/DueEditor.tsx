import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { endOfDayIso } from '../lib/dates';
import { colors } from '../lib/theme';
import { Button, Chip, T } from './ui';

type Props = {
  value: string | null;
  /** Called with an ISO timestamp, or null to clear. */
  onPick: (iso: string | null) => void;
};

/** Quick presets plus a full date-and-time picker (two dialogs on Android, one wheel on iOS). */
export function DueEditor({ value, onPick }: Props) {
  const [step, setStep] = useState<null | 'date' | 'time' | 'ios'>(null);
  const [draft, setDraft] = useState<Date>(new Date());

  function open() {
    const start = value ? new Date(value) : new Date();
    setDraft(Number.isNaN(start.getTime()) ? new Date() : start);
    setStep(Platform.OS === 'ios' ? 'ios' : 'date');
  }

  // Android: pick the date, then the time
  function onAndroid(e: DateTimePickerEvent, picked?: Date) {
    if (e.type === 'dismissed' || !picked) {
      setStep(null);
      return;
    }
    if (step === 'date') {
      const d = new Date(draft);
      d.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
      setDraft(d);
      setStep('time');
    } else {
      const d = new Date(draft);
      d.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
      setStep(null);
      onPick(d.toISOString());
    }
  }

  return (
    <View style={{ marginTop: 8, gap: 8 }}>
      <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false}>
        <Chip label="วันนี้" onPress={() => onPick(endOfDayIso(0))} />
        <Chip label="พรุ่งนี้" onPress={() => onPick(endOfDayIso(1))} />
        <Chip label="อีก 1 สัปดาห์" onPress={() => onPick(endOfDayIso(7))} />
        <Chip label="เลือกวันและเวลา" active onPress={open} />
        <Chip label="ล้าง" onPress={() => onPick(null)} />
      </ScrollView>
      <T size={11} color={colors.sub}>
        ปุ่มวันนี้/พรุ่งนี้ตั้งเวลา 23:59
      </T>

      {(step === 'date' || step === 'time') && (
        <DateTimePicker
          value={draft}
          mode={step}
          is24Hour
          onChange={onAndroid}
        />
      )}

      {step === 'ios' && (
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 8, gap: 6 }}>
          <DateTimePicker
            value={draft}
            mode="datetime"
            display="spinner"
            locale="th-TH"
            is24Hour
            onChange={(_e, d) => d && setDraft(d)}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button kind="outline" label="ยกเลิก" onPress={() => setStep(null)} style={{ flex: 1, paddingVertical: 10 }} />
            <Button
              label="ตั้งเวลา"
              onPress={() => {
                const d = new Date(draft);
                d.setSeconds(0, 0);
                setStep(null);
                onPick(d.toISOString());
              }}
              style={{ flex: 1, paddingVertical: 10 }}
            />
          </View>
        </View>
      )}
    </View>
  );
}
