import _ from 'lodash';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '../app/StateProvider';
import { ALL_LETTERS } from './constants';
import { DirectionType } from './useTileSelection';
import { TileUpdateType } from './useWaveFunctionCollapse';
import { randomId } from '../../app/util';

export type LetterType = typeof ALL_LETTERS[number];

export type TileValueType = LetterType | 'empty' | 'black';
export interface TileType {
  value: TileValueType;
}
export interface CrosswordPuzzleType {
  tiles: TileType[][];
  size: number;
  version: string;
}
export interface ClueGridCellType {
  across: string | null;
  down: string | null;
}
export type ClueGridType = ClueGridCellType[][];
interface BuilderState {
  puzzle: CrosswordPuzzleType;
  clueGrid: ClueGridType | null;
  draggedWord: string | null;
  currentTab: number;
  wordCount: number | null;
  fillAssistState: boolean;
  letterEntryEnabled: boolean;
}

export const DEFAULT_PUZZLE_SIZE = 15;
export const DEFAULT_TILES: TileType[][] = Array.from(
  Array(DEFAULT_PUZZLE_SIZE),
  () => new Array(DEFAULT_PUZZLE_SIZE).fill({ value: 'empty' })
);

const initialState: BuilderState = {
  puzzle: {
    tiles: DEFAULT_TILES,
    size: DEFAULT_PUZZLE_SIZE,
    version: randomId(),
  },
  clueGrid: _.times(DEFAULT_PUZZLE_SIZE, (index) =>
    _.times(DEFAULT_PUZZLE_SIZE, (index) => ({ across: null, down: null }))
  ),
  draggedWord: null,
  currentTab: 0,
  wordCount: null,
  fillAssistState: false,
  letterEntryEnabled: true,
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
    initClueGrid: (state, action: PayloadAction<{ size: number }>) => {
      state.clueGrid = _.times(action.payload.size, (index) =>
        _.times(action.payload.size, (index) => ({ across: null, down: null }))
      );
    },
    clearClueGrid: (state, action: PayloadAction<void>) => {
      state.clueGrid = null;
    },
    setClue: (
      state,
      action: PayloadAction<{
        row: number;
        column: number;
        direction: DirectionType;
        value: string;
      }>
    ) => {
      if (!state.clueGrid) return;
      const { row, column, direction, value } = action.payload;
      state.clueGrid[row][column][direction] = value;
    },
    setClueGrid: (state, action: PayloadAction<ClueGridType>) => {
      state.clueGrid = action.payload;
    },
    setLetterEntryEnabled: (state, action: PayloadAction<boolean>) => {
      state.letterEntryEnabled = action.payload;
    },
  },
});

export const {
  setPuzzleTileValues,
  bumpPuzzleVersion,
  toggleTileBlack,
  setPuzzleState,
  setDraggedWord,
  setCurrentTab,
  setFillAssistActive,
  setWordCount,
  initClueGrid,
  clearClueGrid,
  setClue,
  setClueGrid,
  setLetterEntryEnabled,
} = builderSlice.actions;

export const selectPuzzle = (state: RootState) => state.builder.puzzle;
export const selectDraggedWord = (state: RootState) =>
  state.builder.draggedWord;
export const selectCurrentTab = (state: RootState) => state.builder.currentTab;
export const selectFillAssistActive = (state: RootState) =>
  state.builder.fillAssistState;
export const selectWordCount = (state: RootState) => state.builder.wordCount;
export const selectClueGrid = (state: RootState) => state.builder.clueGrid;
export const selectLetterEntryEnabled = (state: RootState) =>
  state.builder.letterEntryEnabled;

export default builderSlice.reducer;
