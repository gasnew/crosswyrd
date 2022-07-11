import _ from 'lodash';
import {
  Alert,
  Button,
  ButtonGroup,
  Divider,
  Slide,
  Snackbar,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import UndoIcon from '@mui/icons-material/Undo';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

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
import Tiles from './Tiles';
import useAutoFill from './useAutoFill';
import useDictionary from './useDictionary';
import { GridType } from './useGrids';
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

export default function CrosswordBuilder() {
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
    pushStateHistory,
    checkHistoryEmpty,
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
    updateSelectionWithPuzzle,
    selectedTilesState,
    clearSelection,
    selectBestNext,
  } = useTileSelection(puzzle, wave, WFCBusy, autoFillRunning);
  useTileInput(puzzle, selectedTilesState, updateSelectionWithPuzzle);

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
      return previousState;
    },
    [dispatch, setWaveState, popStateHistory, updateSelection]
  );
  const { runAutoFill, stopAutoFill } = useAutoFill(
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
  useEffect(() => {
    // Only try to update if the wave is outdated, and we are not auto-filling
    if (
      !dictionary ||
      !wave ||
      wave.puzzleVersion === puzzle.version ||
      autoFillRunning
    )
      return;
    debouncedUpdateWave(() => {
      updateWave(dictionary, addWordsToDictionary, selectedTilesState).then(
        (result) => {
          if (!result) return;
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
  ]);

  const puzzleError = useMemo(() => {
    if (autoFillRunning || !wave) return '';
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
  }, [autoFillRunning, puzzle, wave]);
  const showPuzzleError = useMemo(() => !!puzzleError, [puzzleError]);

  const setPuzzleToGrid = useCallback(
    (grid: GridType) => {
      clearSelection();
      const newPuzzle: CrosswordPuzzleType = {
        tiles: _.map(grid.tiles, (row) =>
          _.map(row, (tile) => ({ value: tile ? 'black' : 'empty' }))
        ),
        version: randomId(),
      };
      const newWave: WaveType = waveFromPuzzle(newPuzzle);
      pushStateHistory({ wave: newWave, puzzle: newPuzzle });
      dispatch(setPuzzleState(newPuzzle));
      setWaveState(newWave, newPuzzle);
    },
    [dispatch, setWaveState, clearSelection, pushStateHistory]
  );
  const clearLetters = useCallback(() => {
    if (!wave) return;
    const newPuzzle: CrosswordPuzzleType = {
      tiles: _.map(puzzle.tiles, (row) =>
        _.map(row, (tile) => ({
          value: tile.value === 'black' ? 'black' : 'empty',
        }))
      ),
      version: randomId(),
    };
    const newWave = waveFromPuzzle(newPuzzle);
    pushStateHistory({ wave: newWave, puzzle: newPuzzle });
    setWaveState(newWave, newPuzzle);
    dispatch(setPuzzleState(newPuzzle));
  }, [dispatch, setWaveState, puzzle, pushStateHistory, wave]);

  const handleClickBestNext = () => {
    selectBestNext();
  };
  const handleClickBack = () => {
    const previousState = stepBack();
    if (selectedTilesState && selectedTilesState.locations.length > 0)
      selectBestNext(previousState);
  };
  const handleClickRun = () => {
    clearSelection();
    runAutoFill();
  };
  const handleClickStop = () => {
    stopAutoFill();
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
      //pushStateHistory,
      puzzle,
      wave,
      dictionary,
      selectedTilesState,
      //updateWaveWithTileUpdates,
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
    (row, column) => {
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
    [
      hoveredTile,
      onClick,
      wordLocationsGrid,
      handleEnterWord,
      dispatch,
      draggedWord,
    ]
  );

  return (
    <div className="content-container">
      <div className="puzzle-builder-container">
        <div className="puzzle-container sheet">
          <PuzzleBanner
            disabled={WFCBusy || autoFillRunning}
            setPuzzleToGrid={setPuzzleToGrid}
            clearLetters={clearLetters}
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
        </div>
        <div className="sidebar-container sheet">
          <ButtonGroup>
            <Button
              disabled={WFCBusy || autoFillRunning || checkHistoryEmpty()}
              onClick={handleClickBack}
              startIcon={<UndoIcon />}
            >
              Undo
            </Button>
            <Button
              disabled={WFCBusy || autoFillRunning}
              onClick={handleClickBestNext}
              endIcon={<NavigateNextIcon />}
            >
              Next
            </Button>
            <Button
              onClick={!autoFillRunning ? handleClickRun : handleClickStop}
              color={autoFillRunning ? 'error' : 'primary'}
              variant="contained"
              disabled={WFCBusy && !autoFillRunning}
              endIcon={autoFillRunning ? <StopIcon /> : <PlayArrowIcon />}
            >
              {autoFillRunning ? 'Stop' : 'Auto-Fill'}
            </Button>
          </ButtonGroup>
          {dictionary && (
            <>
              <Divider style={{ margin: 10 }} />
              <BuilderTabs
                currentTab={currentTab}
                tilesSelected={tilesSelected}
                clearSelection={clearSelection}
                wordSelector={
                  <WordSelector
                    dictionary={dictionary}
                    optionsSet={selectedOptionsSet}
                    selectedTiles={selectedTiles}
                    processingLastChange={WFCBusy}
                    onEnter={handleEnterWord}
                    clearSelection={clearSelection}
                  />
                }
                wordBank={
                  <WordBank
                    wave={wave}
                    puzzle={puzzle}
                    processingLastChange={WFCBusy}
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
