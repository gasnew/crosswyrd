import _ from 'lodash';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '../../app/store';
import { ALL_LETTERS, PUZZLE_SIZE } from './constants';
import { TileUpdateType, WaveType } from './useWaveFunctionCollapse';
import { randomId } from '../../app/util';

export type LetterType = typeof ALL_LETTERS[number];

export type TileValueType = LetterType | 'empty' | 'black';
export interface TileType {
  value: TileValueType;
}
export interface CrosswordPuzzleType {
  tiles: TileType[][];
  version: string;
}
interface BuilderState {
  puzzle: CrosswordPuzzleType;
  draggedWord: string | null;
  currentTab: number;
  wordCount: number | null;
  fillAssistState: boolean;
}

export const DEFAULT_TILES: TileType[][] = Array.from(Array(PUZZLE_SIZE), () =>
  new Array(PUZZLE_SIZE).fill({ value: 'empty' })
);

const initialState: BuilderState = {
  puzzle: {
    //tiles: _.times(15, (rowIndex) =>
    //_.times(15, (columnIndex) => ({
    //value: 'empty',
    //}))
    //),
    tiles: DEFAULT_TILES,
    version: randomId(),
  },
  draggedWord: null,
  currentTab: 0,
  wordCount: null,
  fillAssistState: false,
};

export function getSymmetricTile(
  puzzle: CrosswordPuzzleType,
  row: number,
  column: number
): { tile: TileType; row: number; column: number } {
  const puzzleSize = puzzle.tiles.length;
  const newRow = puzzleSize - row - 1;
  const newColumn = puzzleSize - column - 1;
  return {
    tile: puzzle.tiles[newRow][newColumn],
    row: newRow,
    column: newColumn,
  };
}

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
      const { row, column } = action.payload;
      const tile = state.puzzle.tiles[row][column];
      const newValue = tile.value === 'black' ? 'empty' : 'black';
      const symmetricTile = getSymmetricTile(state.puzzle, row, column).tile;

      tile.value = newValue;
      symmetricTile.value = newValue;
      state.puzzle.version = randomId();
    },
    setPuzzleTilesToResolvedWaveElements: (
      state,
      action: PayloadAction<WaveType>
    ) => {
      _.forEach(action.payload.elements, (row, rowIndex) => {
        _.forEach(row, (element, columnIndex) => {
          const tile = state.puzzle.tiles[rowIndex][columnIndex];
          // If tile is a letter... (old way)
          //if (_.includes(ALL_LETTERS, tile.value)) {
          //// If there are zero options, set to empty
          //if (element.options.length === 0) tile.value = 'empty';
          //// If there are multiple values, set to empty (i.e., we
          //// backtracked)
          //else if (element.options.length > 1) tile.value = 'empty';
          //}
          // If there is one option, set the value
          if (tile.value === 'empty' && element.options.length === 1)
            tile.value = element.options[0];
        });
      });
      state.puzzle.version = randomId();
    },
    setPuzzleTileValues: (state, action: PayloadAction<TileUpdateType[]>) => {
      _.forEach(action.payload, ({ row, column, value }) => {
        const tile = state.puzzle.tiles[row][column];
        tile.value = value;
      });
      state.puzzle.version = randomId();
    },
    bumpPuzzleVersion: (state, action: PayloadAction<void>) => {
      state.puzzle.version = randomId();
    },
    setPuzzleState: (state, action: PayloadAction<CrosswordPuzzleType>) => {
      state.puzzle = action.payload;
    },
    setDraggedWord: (state, action: PayloadAction<string | null>) => {
      state.draggedWord = action.payload;
    },
    setCurrentTab: (state, action: PayloadAction<number>) => {
      state.currentTab = action.payload;
    },
    setFillAssistActive: (state, action: PayloadAction<boolean>) => {
      state.fillAssistState = action.payload;
    },
    setWordCount: (state, action: PayloadAction<number>) => {
      state.wordCount = action.payload;
    },
  },
});

export const {
  setPuzzleTilesToResolvedWaveElements,
  setPuzzleTileValues,
  bumpPuzzleVersion,
  toggleTileBlack,
  setPuzzleState,
  setDraggedWord,
  setCurrentTab,
  setFillAssistActive,
  setWordCount,
} = builderSlice.actions;

export const selectPuzzle = (state: RootState) => state.builder.puzzle;
export const selectDraggedWord = (state: RootState) =>
  state.builder.draggedWord;
export const selectCurrentTab = (state: RootState) => state.builder.currentTab;
export const selectFillAssistActive = (state: RootState) =>
  state.builder.fillAssistState;
export const selectWordCount = (state: RootState) => state.builder.wordCount;

export default builderSlice.reducer;
