export const colors = {
  navy: '#1D285E',
  orchid: '#AF6DAB',
  orchidSoft: '#F3E8F3',
  peach: '#F2A07B',
  bg: '#F4F5F9',
  card: '#FFFFFF',
  text: '#1B1F3B',
  sub: '#7A7F9A',
  line: '#E7E8F0',
  chip: '#ECEDF5',
  danger: '#D64545',
};

export const gradient = [colors.navy, colors.orchid] as const;

export const radius = { sm: 12, md: 18, lg: 26, pill: 999 };

export const shadow = {
  shadowColor: '#1D285E',
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;

export const fonts = {
  r: 'Prompt_400Regular',
  m: 'Prompt_500Medium',
  sb: 'Prompt_600SemiBold',
} as const;

/** Text colors a block can use; heading color also tints its section. */
export const blockColors = [
  { name: 'กรมท่า', hex: '#1D285E' },
  { name: 'ม่วง', hex: '#AF6DAB' },
  { name: 'แดง', hex: '#D64545' },
  { name: 'ส้ม', hex: '#E08A2E' },
  { name: 'เขียว', hex: '#2F7A4B' },
  { name: 'ฟ้า', hex: '#2E7BD6' },
] as const;
