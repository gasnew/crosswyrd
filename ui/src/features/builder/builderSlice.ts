import _ from 'lodash';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '../../app/store';
import { ALL_LETTERS, DEFAULT_TILES } from './constants';

export type LetterType = typeof ALL_LETTERS[number];

export type TileValueType = LetterType | 'empty' | 'black';
export interface TileType {
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
    //tiles: _.times(15, (rowIndex) =>
    //_.times(15, (columnIndex) => ({
    //value: 'empty',
    //options: [...ALL_LETTERS],
    //}))
    //),
    tiles: DEFAULT_TILES,
  },
};

export const builderSlice = createSlice({
  name: 'builder',
  initialState,
  reducers: {
    toggleTileBlack: (
      state,
      action: PayloadAction<{
        row: number;
        column: number;
      }>
    ) => {
      const tile =
        state.puzzle.tiles[action.payload.row][action.payload.column];
      const newValue = tile.value === 'black' ? 'empty' : 'black';
      const puzzleSize = state.puzzle.tiles.length;

      tile.value = newValue;
      state.puzzle.tiles[puzzleSize - action.payload.row - 1][
        puzzleSize - action.payload.column - 1
      ].value = newValue;
    },
  },
});

export const { toggleTileBlack } = builderSlice.actions;

export const selectPuzzle = (state: RootState) => state.builder.puzzle;

export default builderSlice.reducer;
