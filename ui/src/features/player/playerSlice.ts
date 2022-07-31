export const hey = 'foo';
//import _ from 'lodash';
//import { createSlice, PayloadAction } from '@reduxjs/toolkit';

//import { RootState } from '../../app/store';
//import { ALL_LETTERS, PUZZLE_SIZE } from './constants';
//import { DirectionType } from './useTileSelection';
//import { TileUpdateType, WaveType } from './useWaveFunctionCollapse';
//import { randomId } from '../../app/util';

//interface PlayerClueType {
//  row: number;
//  column: number;
//  direction: DirectionType;
//  clue: string;
//  answer: string;
//}

//interface PlayerState {
//  clues: PlayerClueType[] | null;
//}

//const initialState: PlayerState = {
//  clues: null,
//};

//export const playerSlice = createSlice({
//  name: 'player',
//  initialState,
//  reducers: {
//    setClues: (
//      state,
//      action: PayloadAction<PlayerClueType[]>
//    ) => {
//      const { row, column } = action.payload;
//      const tile = state.puzzle.tiles[row][column];
//      const newValue = tile.value === 'black' ? 'empty' : 'black';
//      const symmetricTile = getSymmetricTile(state.puzzle, row, column).tile;

//      tile.value = newValue;
//      symmetricTile.value = newValue;
//      state.puzzle.version = randomId();
//    },
//    setPuzzleTilesToResolvedWaveElements: (
//      state,
//      action: PayloadAction<WaveType>
//    ) => {
//      _.forEach(action.payload.elements, (row, rowIndex) => {
//        _.forEach(row, (element, columnIndex) => {
//          const tile = state.puzzle.tiles[rowIndex][columnIndex];
//          // If tile is a letter... (old way)
//          //if (_.includes(ALL_LETTERS, tile.value)) {
//          //// If there are zero options, set to empty
//          //if (element.options.length === 0) tile.value = 'empty';
//          //// If there are multiple values, set to empty (i.e., we
//          //// backtracked)
//          //else if (element.options.length > 1) tile.value = 'empty';
//          //}
//          // If there is one option, set the value
//          if (tile.value === 'empty' && element.options.length === 1)
//            tile.value = element.options[0];
//        });
//      });
//      state.puzzle.version = randomId();
//    },
//    setPuzzleTileValues: (state, action: PayloadAction<TileUpdateType[]>) => {
//      _.forEach(action.payload, ({ row, column, value }) => {
//        const tile = state.puzzle.tiles[row][column];
//        tile.value = value;
//      });
//      state.puzzle.version = randomId();
//    },
//    bumpPuzzleVersion: (state, action: PayloadAction<void>) => {
//      state.puzzle.version = randomId();
//    },
//    setPuzzleState: (state, action: PayloadAction<CrosswordPuzzleType>) => {
//      state.puzzle = action.payload;
//    },
//    setDraggedWord: (state, action: PayloadAction<string | null>) => {
//      state.draggedWord = action.payload;
//    },
//    setCurrentTab: (state, action: PayloadAction<number>) => {
//      state.currentTab = action.payload;
//    },
//    setFillAssistActive: (state, action: PayloadAction<boolean>) => {
//      state.fillAssistState = action.payload;
//    },
//    setWordCount: (state, action: PayloadAction<number>) => {
//      state.wordCount = action.payload;
//    },
//    initClueGrid: (state, action: PayloadAction<{ size: number }>) => {
//      state.clueGrid = _.times(action.payload.size, (index) =>
//        _.times(action.payload.size, (index) => ({ across: null, down: null }))
//      );
//    },
//    setClue: (
//      state,
//      action: PayloadAction<{
//        row: number;
//        column: number;
//        direction: DirectionType;
//        value: string;
//      }>
//    ) => {
//      if (!state.clueGrid) return;
//      const { row, column, direction, value } = action.payload;
//      state.clueGrid[row][column][direction] = value;
//    },
//    setClueGrid: (state, action: PayloadAction<ClueGridType>) => {
//      state.clueGrid = action.payload;
//    },
//  },
//});

//export const {
//  setPuzzleTilesToResolvedWaveElements,
//  setPuzzleTileValues,
//  bumpPuzzleVersion,
//  toggleTileBlack,
//  setPuzzleState,
//  setDraggedWord,
//  setCurrentTab,
//  setFillAssistActive,
//  setWordCount,
//  initClueGrid,
//  setClue,
//  setClueGrid,
//} = playerSlice.actions;

//export const selectPuzzle = (state: RootState) => state.player.puzzle;
//export const selectDraggedWord = (state: RootState) => state.player.draggedWord;
//export const selectCurrentTab = (state: RootState) => state.player.currentTab;
//export const selectFillAssistActive = (state: RootState) =>
//  state.player.fillAssistState;
//export const selectWordCount = (state: RootState) => state.player.wordCount;
//export const selectClueGrid = (state: RootState) => state.player.clueGrid;

//export default playerSlice.reducer;
