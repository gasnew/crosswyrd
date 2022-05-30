import _ from 'lodash';
import { TileType } from './builderSlice';

export const ALL_LETTERS = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
] as const;
export const LETTER_WEIGHTS = {
  a: 9,
  b: 2,
  c: 2,
  d: 4,
  e: 12,
  f: 2,
  g: 3,
  h: 2,
  i: 9,
  j: 1,
  k: 1,
  l: 4,
  m: 2,
  n: 6,
  o: 8,
  p: 2,
  q: 1,
  r: 6,
  s: 4,
  t: 6,
  u: 4,
  v: 2,
  w: 2,
  x: 1,
  y: 2,
  z: 1,
};

export const DEFAULT_TILES: TileType[][] = [
  [
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
  ],
  [
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
  ],
  [
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
  ],
  [
    {
      value: 'black',
    },
    {
      value: 'black',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
  ],
  [
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
  ],
  [
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'black',
    },
    {
      value: 'black',
    },
  ],
  [
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
  ],
  [
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
  ],
  [
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
  ],
  [
    {
      value: 'black',
    },
    {
      value: 'black',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
  ],
  [
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
  ],
  [
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'black',
    },
    {
      value: 'black',
    },
  ],
  [
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
  ],
  [
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
  ],
  [
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'black',
    },
    {
      value: 'black',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
    {
      value: 'empty',
    },
  ],
];
