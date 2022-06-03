import _ from 'lodash';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '../../app/store';
import { ALL_LETTERS, DEFAULT_TILES } from './constants';
import { WaveType } from './useWaveFunctionCollapse';

export type LetterType = typeof ALL_LETTERS[number];

export type TileValueType = LetterType | 'empty' | 'black';
export interface TileType {
  value: TileValueType;
}
export interface CrosswordPuzzleType {
  tiles: TileType[][];
}
interface BuilderState {
  puzzle: CrosswordPuzzleType;
  stagedWord: string;
}

const initialState: BuilderState = {
  puzzle: {
    //tiles: _.times(15, (rowIndex) =>
    //_.times(15, (columnIndex) => ({
    //value: 'empty',
    //}))
    //),
    tiles: DEFAULT_TILES,
  },
  stagedWord: '',
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
    setPuzzleTilesToResolvedWaveElements: (
      state,
      action: PayloadAction<WaveType>
    ) => {
      _.forEach(action.payload.elements, (row, rowIndex) => {
        _.forEach(row, (element, columnIndex) => {
          const tile = state.puzzle.tiles[rowIndex][columnIndex];
          // If there is one option, set the value
          if (element.options.length === 1) tile.value = element.options[0];
          // If tile is a letter...
          if (_.includes(ALL_LETTERS, tile.value)) {
            // If there are zero options, set to empty
            if (element.options.length === 0) tile.value = 'empty';
            // If there are multiple values, set to empty (i.e., we
            // backtracked)
            else if (element.options.length > 1) tile.value = 'empty';
          }
        });
      });
    },
    setPuzzleTileValues: (
      state,
      action: PayloadAction<
        { row: number; column: number; value: TileValueType }[]
      >
    ) => {
      _.forEach(action.payload, ({ row, column, value }) => {
        const tile = state.puzzle.tiles[row][column];
        tile.value = value;
      });
    },
    setPuzzleState: (state, action: PayloadAction<CrosswordPuzzleType>) => {
      state.puzzle = action.payload;
    },
    setStagedWord: (state, action: PayloadAction<string>) => {
      state.stagedWord = action.payload;
    },
  },
});

export const {
  setPuzzleTilesToResolvedWaveElements,
  setPuzzleTileValues,
  toggleTileBlack,
  setPuzzleState,
  setStagedWord,
} = builderSlice.actions;

export const selectPuzzle = (state: RootState) => state.builder.puzzle;
export const selectStagedWord = (state: RootState) => state.builder.stagedWord;

export default builderSlice.reducer;
