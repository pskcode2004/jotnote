import { View } from 'react-native';
import { userColor } from '../lib/userColor';
import type { Present } from '../lib/usePresence';
import { colors } from '../lib/theme';
import { Avatar, T } from './ui';

export function PresenceBar({ people }: { people: Present[]; meId: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {people.map((p, i) => (
        <View
          key={p.id}
          style={{ marginLeft: i === 0 ? 0 : -8, borderWidth: 2, borderColor: colors.bg, borderRadius: 18 }}>
          <Avatar name={p.name} color={userColor(p.id)} size={30} />
        </View>
      ))}
      <T size={12} color={colors.sub} style={{ marginLeft: 8 }}>
        {people.length <= 1 ? 'มีแค่คุณ' : `${people.length} คนกำลังดูอยู่`}
      </T>
    </View>
  );
}
