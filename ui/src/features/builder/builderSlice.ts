import _ from 'lodash';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '../app/StateProvider';
import { ALL_LETTERS } from './constants';
import { DirectionType } from './useTileSelection';
import { TileUpdateType, WaveType } from './useWaveFunctionCollapse';
import { devMode, randomId } from '../../app/util';

export type LetterType = (typeof ALL_LETTERS)[number];

export type TileValueType = LetterType | 'empty' | 'black';
export interface TileType {
  value: TileValueType;
}
export interface CrosswordPuzzleType {
  tiles: TileType[][];
  version: string;
  uuid?: string;
}
export interface ClueGridCellType {
  across: string | null;
  down: string | null;
}
export type ClueGridType = ClueGridCellType[][];
interface WelcomeDialogStateType {
  open: boolean;
  showCheckbox: boolean;
}
interface PublishInfoType {
  title: string;
  author: string;
  id: string | null;
}
interface BuilderState {
  puzzle: CrosswordPuzzleType;
  wave: WaveType | null;
  clueGrid: ClueGridType | null;
  draggedWord: string | null;
  currentTab: number;
  wordCount: number | null;
  fillAssistState: boolean;
  letterEntryEnabled: boolean;
  defaultGridDialogOpen: boolean;
  welcomeDialogState: WelcomeDialogStateType;
  tileUpdates: TileUpdateType[];
  publishInfo: PublishInfoType;
}

export const DEFAULT_PUZZLE_SIZE = 15;
export const DEFAULT_TILES: TileType[][] = Array.from(
  Array(DEFAULT_PUZZLE_SIZE),
  () => new Array(DEFAULT_PUZZLE_SIZE).fill({ value: 'empty' })
);

const initialState: BuilderState = {
  puzzle: {
    tiles: DEFAULT_TILES,
    version: randomId(),
  },
  wave: null,
  clueGrid: _.times(DEFAULT_PUZZLE_SIZE, (index) =>
    _.times(DEFAULT_PUZZLE_SIZE, (index) => ({ across: null, down: null }))
  ),
  draggedWord: null,
  currentTab: 0,
  wordCount: null,
  fillAssistState: false,
  letterEntryEnabled: true,
  // Default grid dialog to open unless in development mode
  defaultGridDialogOpen: !devMode(),
  welcomeDialogState: { open: true, showCheckbox: true },
  tileUpdates: [],
  publishInfo: { title: '', author: '', id: null },
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
        symmetricBlackTiles: boolean;
      }>
    ) => {
      const { row, column } = action.payload;
      const tile = state.puzzle.tiles[row][column];
      const newValue = tile.value === 'black' ? 'empty' : 'black';

      tile.value = newValue;
      if (action.payload.symmetricBlackTiles) {
        const symmetricTile = getSymmetricTile(state.puzzle, row, column).tile;
        symmetricTile.value = newValue;
      }
      state.puzzle.version = randomId();
    },
    setPuzzleTileValues: (state, action: PayloadAction<TileUpdateType[]>) => {
      _.forEach(action.payload, ({ row, column, value }) => {
        const tile = state.puzzle.tiles[row][column];
        tile.value = value;
        state.tileUpdates.push({ row, column, value });
      });
      state.puzzle.version = randomId();
    },
    bumpPuzzleVersion: (state, action: PayloadAction<void>) => {
      state.puzzle.version = randomId();
    },
    setPuzzleState: (state, action: PayloadAction<CrosswordPuzzleType>) => {
      // TODO: Rename to patch
      state.puzzle = {
        ...state.puzzle,
        ...action.payload,
      };
      // This function effectively destroys the puzzle, so we should reset our
      // tracked tile updates as well
      state.tileUpdates = [];
    },
    mergePuzzleState: (
      state,
      action: PayloadAction<{
        remotePuzzle: CrosswordPuzzleType;
        puzzleId: string;
      }>
    ) => {
      // Merge the preloaded puzzle atop the remote puzzle
      state.puzzle = {
        ...action.payload.remotePuzzle,
        tiles: _.map(action.payload.remotePuzzle.tiles, (row, rowIndex) =>
          _.map(row, (tile, columnIndex) => {
            const preloadedTileValue: TileValueType | undefined =
              action.payload.puzzleId === state.puzzle.uuid
                ? state.puzzle.tiles[rowIndex]?.[columnIndex]?.value
                : undefined;
            return {
              ...tile,
              value:
                tile.value === 'black'
                  ? // Black remote tiles should always be preserved
                    'black'
                  : preloadedTileValue === 'black'
                    ? // Black preloaded tiles should be treated as empty if the remote tile is empty
                      'empty'
                    : // Try to use the preloaded value if it's available--otherwise, empty
                      (preloadedTileValue ?? 'empty'),
            };
          })
        ),
        uuid: action.payload.puzzleId,
      };
      // This function effectively destroys the puzzle, so we should reset our
      // tracked tile updates as well
      state.tileUpdates = [];
    },
    setWaveState: (state, action: PayloadAction<WaveType | null>) => {
      state.wave = action.payload;
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
    setDefaultGridDialogOpen: (state, action: PayloadAction<boolean>) => {
      state.defaultGridDialogOpen = action.payload;
    },
    setWelcomeDialogState: (
      state,
      action: PayloadAction<WelcomeDialogStateType>
    ) => {
      state.welcomeDialogState = action.payload;
    },
    setPublishInfo: (state, action: PayloadAction<PublishInfoType>) => {
      state.publishInfo = action.payload;
    },
  },
});

export const {
  setPuzzleTileValues,
  bumpPuzzleVersion,
  toggleTileBlack,
  setPuzzleState,
  mergePuzzleState,
  setDraggedWord,
  setCurrentTab,
  setFillAssistActive,
  setWordCount,
  initClueGrid,
  clearClueGrid,
  setClue,
  setClueGrid,
  setLetterEntryEnabled,
  setWaveState,
  setDefaultGridDialogOpen,
  setWelcomeDialogState,
  setPublishInfo,
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
export const selectWave = (state: RootState) => state.builder.wave;
export const selectDefaultGridDialogOpen = (state: RootState) =>
  state.builder.defaultGridDialogOpen;
export const selectWelcomeDialogState = (state: RootState) =>
  state.builder.welcomeDialogState;
export const selectTileUpdates = (state: RootState) =>
  state.builder.tileUpdates;
export const selectPublishInfo = (state: RootState) =>
  state.builder.publishInfo;

export default builderSlice.reducer;
