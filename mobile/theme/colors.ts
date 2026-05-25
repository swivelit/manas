export const colors = {
  ink: '#1A1C2E',
  inkSoft: '#3A3F5C',
  muted: '#7A82A1',
  line: '#EDE7DA',
  cream: '#FAF6EF',
  creamDeep: '#F3ECDF',
  paper: '#FFFFFF',
  blue: '#4C7BFF',
  blueDeep: '#2A4AD9',
  blueSoft: '#DEE8FF',
  pink: '#F25BB0',
  pinkSoft: '#FFDAEE',
  purple: '#8B5BD8',
  sage: '#A8C4A2',
  sageSoft: '#E3EDDF',
  peach: '#F6C6A8',
  peachSoft: '#FDE6D4',
  lavender: '#C9B8E8',
} as const;

export type ColorKey = keyof typeof colors;
