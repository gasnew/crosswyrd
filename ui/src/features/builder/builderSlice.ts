import _ from 'lodash';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '../../app/store';

const ALL_LETTERS: LetterType[] = [
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
];
type LetterType =
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z';
type TileValueType = LetterType | 'empty' | 'black';
interface TileType {
  value: TileValueType;
  options: LetterType[];
}
interface CrosswordPuzzleType {
  tiles: TileType[][];
}
interface BuilderState {
  puzzle: CrosswordPuzzleType;
}

const initialState: BuilderState = {
  puzzle: {
    tiles: _.times(15, (rowIndex) =>
      _.times(15, (columnIndex) => ({
        value: 'empty',
        options: ALL_LETTERS,
      }))
    ),
  },
};

export const builderSlice = createSlice({
  name: 'builder',
  initialState,
  reducers: {
    setTileValue: (
      state,
      action: PayloadAction<{
        row: number;
        column: number;
        value: number;
      }>
    ) => {
      //state.builderId = action.payload;
    },
  },
});

export const { setTileValue } = builderSlice.actions;

export const selectPuzzle = (state: RootState) => state.builder.puzzle;

export default builderSlice.reducer;
