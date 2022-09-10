import _ from 'lodash';
import { Alert, Slide, Snackbar } from '@mui/material';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { GridWithVersionType } from '../app/Crosswyrd';
import {
  CrosswordPuzzleType,
  selectCurrentTab,
  selectDraggedWord,
  selectPuzzle,
  setDraggedWord,
  setPuzzleState,
  setPuzzleTileValues,
  TileValueType,
} from './builderSlice';
import BuilderTabs from './BuilderTabs';
import ClueEntry, { useClueData } from './ClueEntry';
import { ALL_LETTERS } from './constants';
import DraggedWord from './DraggedWord';
import PuzzleBanner from './PuzzleBanner';
import PuzzleStats from './PuzzleStats';
import Tiles from './Tiles';
import useAutoFill from './useAutoFill';
import useDictionary from './useDictionary';
import useTileInput from './useTileInput';
import useTileSelection from './useTileSelection';
import useWaveAndPuzzleHistory from './useWaveAndPuzzleHistory';
import useWaveFunctionCollapse, {
  waveFromPuzzle,
  WaveType,
} from './useWaveFunctionCollapse';
import WordBank, { WordLocationsGridType } from './WordBank';
import WordSelector from './WordSelector';
import { randomId } from '../../app/util';

import './CrosswordBuilder.css';

export interface LocationType {
  row: number;
  column: number;
}

const WAVE_DEBOUNCE_MS = 500;
const debouncedUpdateWave = _.debounce(
  (func: () => void) => func(),
  WAVE_DEBOUNCE_MS
);

const AlertSnackbar = React.memo(
  ({ open, error }: { open: boolean; error: string }) => {
    return (
      <Snackbar
        open={open}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={(props) => <Slide {...props} direction="down" />}
      >
        <Alert severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    );
  }
);

interface Props {
  grid: GridWithVersionType;
}
export default function CrosswordBuilder({ grid }: Props) {
  const puzzle = useSelector(selectPuzzle);
  const draggedWord = useSelector(selectDraggedWord);
  const currentTab = useSelector(selectCurrentTab);
  const { dictionary, addWordsToDictionary } = useDictionary();
  const { tileNumbers } = useClueData(puzzle);
  const {
    wave,
    updateWaveWithTileUpdates,
    updateWave,
    setWaveState,
    busy: WFCBusy,
  } = useWaveFunctionCollapse(puzzle);
  const {
    popStateHistory,
    popStateFuture,
    pushStateHistory,
    checkHistoryEmpty,
    checkFutureEmpty,
  } = useWaveAndPuzzleHistory(wave, puzzle);
  const [hoveredTile, setHoveredTile] = useState<LocationType | null>(null);
  const [
    wordLocationsGrid,
    setWordLocationsGrid,
  ] = useState<WordLocationsGridType | null>(null);
  const [autoFillRunning, setAutoFillRunning] = useState(false);

  const {
    onClick,
    updateSelection,
    selectedTilesState,
    clearSelection,
    selectBestNext,
    selectNextAnswer,
  } = useTileSelection(puzzle, wave, WFCBusy, autoFillRunning);
  const clearHoveredTile = useCallback(() => setHoveredTile(null), [
    setHoveredTile,
  ]);
  useTileInput(
    puzzle,
    selectedTilesState,
    updateSelection,
    clearHoveredTile,
    selectNextAnswer,
    selectBestNext
  );

  const dispatch = useDispatch();
  const stepBack = useCallback(
    (times: number = 1) => {
      const previousState = popStateHistory(times);
      if (!previousState) return;
      setWaveState(previousState.wave, previousState.puzzle);
      dispatch(setPuzzleState(previousState.puzzle));
      if (previousState.selectedTilesState)
        updateSelection(
          previousState.selectedTilesState.primaryLocation,
          previousState.selectedTilesState.direction
        );
      else if (!autoFillRunning && currentTab === 0)
        selectBestNext(previousState);
      return previousState;
    },
    [
      dispatch,
      setWaveState,
      popStateHistory,
      updateSelection,
      selectBestNext,
      autoFillRunning,
      currentTab,
    ]
  );
  const stepForward = useCallback(() => {
    const nextState = popStateFuture();
    if (!nextState) return;
    setWaveState(nextState.wave, nextState.puzzle);
    dispatch(setPuzzleState(nextState.puzzle));
    if (nextState.selectedTilesState)
      updateSelection(
        nextState.selectedTilesState.primaryLocation,
        nextState.selectedTilesState.direction
      );
    return nextState;
  }, [dispatch, setWaveState, popStateFuture, updateSelection]);
  const { runAutoFill, stopAutoFill, autoFillError } = useAutoFill(
    dictionary,
    puzzle,
    wave,
    autoFillRunning,
    setAutoFillRunning,
    pushStateHistory,
    updateWaveWithTileUpdates,
    WFCBusy,
    stepBack
  );

  // Update the wave with changes to the puzzle
  const prevPuzzleVersion = useRef(puzzle.version);
  useEffect(() => {
    // If the puzzle's version hasn't changed, skip.
    if (prevPuzzleVersion.current === puzzle.version) return;
    // If auto-fill is running, then we defer to that to update our puzzle
    // version correctly--we should ignore any out-of-date waves for the time
    // being.
    if (autoFillRunning) prevPuzzleVersion.current = puzzle.version;
    // Only try to update if the wave is outdated, and we are not auto-filling.
    if (
      !dictionary ||
      !wave ||
      wave.puzzleVersion === puzzle.version ||
      autoFillRunning ||
      WFCBusy
    )
      return;
    debouncedUpdateWave(() => {
      updateWave(dictionary, addWordsToDictionary, selectedTilesState).then(
        (result) => {
          if (!result) return;
          prevPuzzleVersion.current = result.puzzle.version;
          // This may get called a lot due to the nature of `debounce`, but this
          // is OK--this function has lots of safeguards against this.
          pushStateHistory({
            wave: result.wave,
            puzzle: result.puzzle,
            selectedTilesState: result.selectedTilesState,
          });
        }
      );
    });
  }, [
    puzzle,
    wave,
    dictionary,
    addWordsToDictionary,
    updateWave,
    pushStateHistory,
    selectedTilesState,
    autoFillRunning,
    WFCBusy,
  ]);

  const puzzleError = useMemo(() => {
    if (autoFillRunning || !wave) return '';
    if (autoFillError) return autoFillError;
    if (
      _.some(puzzle.tiles, (row, rowIndex) =>
        _.some(
          row,
          (tile, columnIndex) =>
            tile.value !== 'black' &&
            wave.elements[rowIndex][columnIndex].options.length === 0
        )
      )
    )
      return 'The puzzle cannot be filled from here! Try undoing recent changes, clearing up any red tiles, or adjusting the grid pattern.';
    return '';
  }, [autoFillRunning, puzzle, wave, autoFillError]);
  const showPuzzleError = useMemo(() => !!puzzleError, [puzzleError]);

  // Set puzzle to grid when the grid is updated
  const currentGridVersion = useRef<string>(grid.version);
  useEffect(() => {
    if (grid.version === currentGridVersion.current) return;
    currentGridVersion.current = grid.version;
    clearSelection();
    const newPuzzle: CrosswordPuzzleType = {
      tiles: _.map(grid.tiles, (row) =>
        _.map(row, (tile) => ({ value: tile ? 'black' : 'empty' }))
      ),
      size: grid.tiles.length,
      version: randomId(),
    };
    const newWave: WaveType = waveFromPuzzle(newPuzzle);
    pushStateHistory({ wave: newWave, puzzle: newPuzzle });
    dispatch(setPuzzleState(newPuzzle));
    setWaveState(newWave, newPuzzle);
  }, [grid, dispatch, setWaveState, clearSelection, pushStateHistory]);

  const clearLetters = useCallback(() => {
    if (!wave) return;
    const newPuzzle: CrosswordPuzzleType = {
      tiles: _.map(puzzle.tiles, (row) =>
        _.map(row, (tile) => ({
          value: tile.value === 'black' ? 'black' : 'empty',
        }))
      ),
      size: grid.tiles.length,
      version: randomId(),
    };
    const newWave = waveFromPuzzle(newPuzzle);
    pushStateHistory({ wave: newWave, puzzle: newPuzzle });
    setWaveState(newWave, newPuzzle);
    dispatch(setPuzzleState(newPuzzle));
  }, [
    dispatch,
    setWaveState,
    puzzle,
    pushStateHistory,
    wave,
    grid.tiles.length,
  ]);

  const handleClickBack = () => {
    stepBack();
  };
  const mkHandleMouseoverTile = useCallback((row, column) => {
    return () => setHoveredTile({ row, column });
  }, []);
  const handleEnterWord = useCallback(
    (rawWord: string, customTileLocations?: LocationType[]) => {
      const tileLocations =
        customTileLocations || selectedTilesState?.locations || [];

      // At least clear the selection
      clearSelection();

      // Sanitize the word, making it full-length and replacing ?s and empty
      // slots with " "s.
      const word = _.join(
        _.times(tileLocations.length, (index) =>
          rawWord[index] === '?' ? ' ' : rawWord[index] ?? ' '
        ),
        ''
      );

      if (
        !dictionary ||
        !wave ||
        WFCBusy ||
        // The word must be full-length
        word.length !== tileLocations.length ||
        // The word must be a valid type (" "s are OK)
        !_.every(
          word,
          (letter) => _.includes(ALL_LETTERS, letter) || letter === ' '
        )
      )
        return;

      // Build observations, replacing " "s with "empty"
      const observations = _.map(word, (letter, index) => ({
        ...tileLocations[index],
        value: (letter === ' ' ? 'empty' : letter) as TileValueType,
      }));
      if (
        _.every(
          observations,
          ({ row, column, value }) => puzzle.tiles[row][column].value === value
        )
      )
        return;

      dispatch(setPuzzleTileValues(observations));
      // A bit hacky, but force the wave to be updated immediately after our
      // hook has had a chance to call the wave-update endpoint
      setTimeout(() => debouncedUpdateWave.flush(), 10);
    },
    [
      dispatch,
      WFCBusy,
      puzzle,
      wave,
      dictionary,
      selectedTilesState,
      clearSelection,
    ]
  );

  const selectedOptionsSet = useMemo(
    () =>
      wave
        ? _.map(
            selectedTilesState?.locations || [],
            ({ row, column }) => wave.elements[row][column].options
          )
        : _.map(selectedTilesState?.locations || [], ({ row, column }) => []),
    [selectedTilesState, wave]
  );
  const selectedTiles = useMemo(
    () =>
      _.map(
        selectedTilesState?.locations || [],
        ({ row, column }) => puzzle.tiles[row][column]
      ),
    [selectedTilesState, puzzle]
  );
  const tilesSelected = useMemo(
    () => (selectedTilesState?.locations?.length || 0) > 0,
    [selectedTilesState]
  );
  const onTilesMouseOut = useCallback(() => setHoveredTile(null), []);
  const mkHandleClickTile = useCallback(
    (row, column, hoveredTile: LocationType | null) => {
      return (event) => {
        if (draggedWord) {
          dispatch(setDraggedWord(null));

          const wordLocationOptions: LocationType[] | null =
            hoveredTile &&
            wordLocationsGrid &&
            (wordLocationsGrid[hoveredTile.row][hoveredTile.column].across ||
              wordLocationsGrid[hoveredTile.row][hoveredTile.column].down);
          if (wordLocationOptions)
            handleEnterWord(draggedWord, wordLocationOptions);
        } else {
          onClick(row, column);
        }
      };
    },
    [onClick, wordLocationsGrid, handleEnterWord, dispatch, draggedWord]
  );

  return (
    <div className="content-container">
      <div className="puzzle-builder-container">
        <div className="puzzle-container sheet">
          <PuzzleBanner
            WFCBusy={WFCBusy}
            autoFillRunning={autoFillRunning}
            autoFillErrored={!!puzzleError}
            runAutoFill={runAutoFill}
            stopAutoFill={stopAutoFill}
            undo={handleClickBack}
            undoDisabled={WFCBusy || autoFillRunning || checkHistoryEmpty()}
            redo={stepForward}
            redoDisabled={WFCBusy || autoFillRunning || checkFutureEmpty()}
            clearLetters={clearLetters}
            clearSelection={clearSelection}
            selectBestNext={selectBestNext}
          />
          <Tiles
            puzzle={puzzle}
            wave={wave}
            tileNumbers={tileNumbers}
            selectedTilesState={selectedTilesState}
            wordLocationsGrid={wordLocationsGrid}
            hoveredTile={hoveredTile}
            draggedWord={draggedWord}
            mkHandleClickTile={mkHandleClickTile}
            mkHandleMouseoverTile={mkHandleMouseoverTile}
            onMouseOut={onTilesMouseOut}
          />
          <PuzzleStats puzzle={puzzle} />
        </div>
        <div className="sidebar-container sheet">
          {dictionary && (
            <>
              <BuilderTabs
                currentTab={currentTab}
                tilesSelected={tilesSelected}
                clearSelection={clearSelection}
                wordSelector={
                  <WordSelector
                    dictionary={dictionary}
                    optionsSet={selectedOptionsSet}
                    selectedTiles={selectedTiles}
                    onEnter={handleEnterWord}
                    clearSelection={clearSelection}
                  />
                }
                wordBank={
                  <WordBank
                    wave={wave}
                    puzzle={puzzle}
                    setWordLocationsGrid={setWordLocationsGrid}
                  />
                }
                clueEntry={
                  <ClueEntry
                    puzzle={puzzle}
                    tileNumbers={tileNumbers}
                    updateSelection={updateSelection}
                    selectedTilesState={selectedTilesState}
                  />
                }
              />
            </>
          )}
        </div>
        <DraggedWord />
      </div>
      <AlertSnackbar open={showPuzzleError} error={puzzleError} />
    </div>
  );
}
