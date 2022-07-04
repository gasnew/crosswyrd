import _ from 'lodash';
import {
  Alert,
  Button,
  ButtonGroup,
  colors,
  Divider,
  Slide,
  Snackbar,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import UndoIcon from '@mui/icons-material/Undo';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { useInterval } from '../../app/util';
import {
  CrosswordPuzzleType,
  getSymmetricTile,
  LetterType,
  selectCurrentTab,
  selectDraggedWord,
  selectPuzzle,
  setDraggedWord,
  setPuzzleState,
  setPuzzleTilesToResolvedWaveElements,
  setPuzzleTileValues,
  TileValueType,
  toggleTileBlack,
} from './builderSlice';
import BuilderTabs from './BuilderTabs';
import ClueEntry, { useClueData } from './ClueEntry';
import { ALL_LETTERS, LETTER_WEIGHTS } from './constants';
import DraggedWord from './DraggedWord';
import PuzzleBanner from './PuzzleBanner';
import TileLetterOptions from './TileLetterOptions';
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

function pickWeightedRandomLetter(
  wave: WaveType,
  row: number,
  column: number
): LetterType | undefined {
  return _.sample(
    _.flatMap(LETTER_WEIGHTS, (weight, letter) =>
      _.includes(wave.elements[row][column].options, letter)
        ? _.times(weight, () => letter)
        : []
    )
  ) as LetterType | undefined;
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
  const [running, setRunning] = useState(false);
  const [
    wordLocationsGrid,
    setWordLocationsGrid,
  ] = useState<WordLocationsGridType | null>(null);

  const {
    onClick,
    updateSelection,
    updateSelectionWithPuzzle,
    selectedTilesState,
    clearSelection,
    selectBestNext,
  } = useTileSelection(puzzle, wave, WFCBusy, running);
  useTileInput(puzzle, selectedTilesState, updateSelectionWithPuzzle);

  // negative number means we've passed the last failed depth
  const stepsToLastFailure = useRef(-1);
  // the number of steps to backtrack next time we reach a failure
  const stepsToBacktrack = useRef(1);
  // the number of steps into the run we are from where we started (guards
  // against undoing something a user inputted)
  const stepsFromRunStart = useRef(0);

  const dispatch = useDispatch();

  // Update the wave with changes to the puzzle
  useEffect(() => {
    // Only try to update if the wave is outdated, and we are not auto-filling
    if (!dictionary || wave?.puzzleVersion === puzzle.version || running)
      return;
    debouncedUpdateWave(() => {
      updateWave(dictionary, addWordsToDictionary, selectedTilesState).then(
        (result) => {
          if (!result) return;
          // This may get called a lot due to the nature of `debounce`, but this
          // is OK--this function has lots of safeguards against this.
          // TODO think about how to make selected tile state work better...?
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
    running,
  ]);

  const puzzleError = useMemo(() => {
    if (running || !wave) return '';
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
      return 'The puzzle cannot be filled from here! Try undoing recent changes, clearing up space around any red tiles, or adjusting the grid pattern.';
    return '';
  }, [running, puzzle, wave]);
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

  const stepBack = useCallback(() => {
    const previousState = popStateHistory();
    if (!previousState) return;
    setWaveState(previousState.wave, previousState.puzzle);
    dispatch(setPuzzleState(previousState.puzzle));
    if (previousState.selectedTilesState)
      updateSelection(
        previousState.selectedTilesState.primaryLocation,
        previousState.selectedTilesState.direction
      );
    return previousState;
  }, [dispatch, setWaveState, popStateHistory, updateSelection]);

  const mkHandleClickTile = (row, column) => {
    return (event) => {
      if (event.ctrlKey && dictionary) {
        if (WFCBusy || !wave) return;
        const newValue =
          puzzle.tiles[row][column].value === 'black' ? 'empty' : 'black';
        const symmetricTileInfo = getSymmetricTile(puzzle, row, column);

        pushStateHistory({ wave, puzzle });
        updateWaveWithTileUpdates(dictionary, [
          {
            row,
            column,
            value: newValue,
          },
          {
            row: symmetricTileInfo.row,
            column: symmetricTileInfo.column,
            value: newValue,
          },
        ]);
        clearSelection();
        dispatch(
          toggleTileBlack({
            row,
            column,
          })
        );
      } else {
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
      }
    };
  };
  const placeOneTile = useCallback(async () => {
    if (!wave || !dictionary) return;
    // Element is either a random element (if this is the first tile placed) or
    // the element with lowest entropy
    const lowestEntropyElement = _.every(
      _.flatten(puzzle.tiles),
      (tile) => tile.value === 'black' || tile.value === 'empty'
    )
      ? _.sample(_.reject(_.flatten(wave.elements), 'solid'))
      : _.minBy(_.reject(_.flatten(wave.elements), ['entropy', 0]), 'entropy');
    if (!lowestEntropyElement) return;
    const { row, column } = lowestEntropyElement;
    const newValue = pickWeightedRandomLetter(wave, row, column);
    if (!newValue) return;

    const newWave = await updateWaveWithTileUpdates(dictionary, [
      { row, column, value: newValue },
    ]);
    if (newWave) {
      pushStateHistory({ wave, puzzle });
      // The observation succeeded, so set tile values for all tiles that are
      // now collapsed to one state in the new wave.
      dispatch(setPuzzleTilesToResolvedWaveElements(newWave));
    }
  }, [
    dispatch,
    pushStateHistory,
    dictionary,
    updateWaveWithTileUpdates,
    puzzle,
    wave,
  ]);
  const handleClickBestNext = () => {
    selectBestNext();
  };
  const handleClickBack = () => {
    const previousState = stepBack();
    if (selectedTilesState && selectedTilesState.locations.length > 0)
      selectBestNext(previousState);
  };
  const handleClickRun = () => {
    // Reset these to their default values for the run
    stepsToLastFailure.current = -1;
    stepsToBacktrack.current = 1;
    stepsFromRunStart.current = 0;
    // Start running
    setRunning(!running);
    clearSelection();
  };
  const mkHandleMouseoverTile = (row, column) => {
    return () => setHoveredTile({ row, column });
  };
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

  // Run auto-fill
  useInterval(() => {
    if (!wave || !running || WFCBusy) return;
    if (!_.some(_.flatten(puzzle.tiles), ['value', 'empty'])) {
      // The puzzle is finished!
      setRunning(false);
      return;
    }

    if (
      _.some(
        _.flatten(wave.elements),
        (element) => !element.solid && element.options.length === 0
      )
    ) {
      // We are about to move stepsToBacktrack.current steps toward run start
      stepsFromRunStart.current -= stepsToBacktrack.current;
      if (stepsFromRunStart.current < 0) {
        // Stop running so that we don't overwrite something the user did
        setRunning(false);
        return;
      }

      // Backstep N times!
      _.times(stepsToBacktrack.current, stepBack);
      // We are now N steps removed from this backtrack
      stepsToLastFailure.current = stepsToBacktrack.current;
      // Next time we backtrack at this level, backtrack one more step
      stepsToBacktrack.current += 1;
    } else {
      if (stepsToLastFailure.current <= 0) {
        // We've passed the barrier! Reset backtrack step count
        stepsToBacktrack.current = 1;
      }
      placeOneTile();
      // We're one step closer to last backtrack
      stepsToLastFailure.current -= 1;
      // We have moved one step further from run start
      stepsFromRunStart.current += 1;
    }
  }, 100);

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
  const hoveredTiles: LocationType[] = useMemo(
    () =>
      (draggedWord &&
        hoveredTile &&
        wordLocationsGrid &&
        (wordLocationsGrid[hoveredTile.row][hoveredTile.column].across ||
          wordLocationsGrid[hoveredTile.row][hoveredTile.column].down)) ||
      [],
    [draggedWord, hoveredTile, wordLocationsGrid]
  );
  const tilesSelected = useMemo(
    () => (selectedTilesState?.locations?.length || 0) > 0,
    [selectedTilesState]
  );

  return (
    <div className="content-container">
      <div className="puzzle-builder-container">
        <div className="puzzle-container sheet">
          <PuzzleBanner
            disabled={WFCBusy || running}
            setPuzzleToGrid={setPuzzleToGrid}
            clearLetters={clearLetters}
          />
          <div
            className="tiles-container"
            onMouseOut={() => setHoveredTile(null)}
          >
            {_.map(puzzle.tiles, (row, rowIndex) => (
              <div key={rowIndex} className="puzzle-row">
                {_.map(row, (tile, columnIndex) => {
                  const selectionIndex = _.findIndex(
                    selectedTilesState?.locations || [],
                    (location) =>
                      location.row === rowIndex &&
                      location.column === columnIndex
                  );
                  const primarySelection =
                    selectedTilesState?.primaryLocation?.row === rowIndex &&
                    selectedTilesState?.primaryLocation?.column === columnIndex;
                  // The word bank word location options this tile intersects
                  const wordLocationOptions: LocationType[] | null =
                    wordLocationsGrid &&
                    (wordLocationsGrid[rowIndex][columnIndex].across ||
                      wordLocationsGrid[rowIndex][columnIndex].down);
                  const draggedWordLetterIndex = _.findIndex(
                    hoveredTiles,
                    (tile) =>
                      tile.row === rowIndex && tile.column === columnIndex
                  );
                  const tileValue =
                    draggedWord && draggedWordLetterIndex >= 0 // User is hovering with a dragged word
                      ? _.toUpper(draggedWord[draggedWordLetterIndex])
                      : !_.includes(['empty', 'black'], tile.value)
                      ? _.toUpper(tile.value)
                      : '';
                  const element = wave && wave.elements[rowIndex][columnIndex];
                  const tileNumber = tileNumbers[rowIndex][columnIndex];
                  const showTileLetterOptions =
                    tile.value === 'empty' &&
                    selectionIndex >= 0 &&
                    element &&
                    element.options.length <= 9;
                  const hovered =
                    hoveredTile &&
                    hoveredTile.row === rowIndex &&
                    hoveredTile.column === columnIndex;
                  const secondaryHighlight =
                    selectionIndex === -1 &&
                    selectedTilesState &&
                    ((selectedTilesState.direction === 'across' &&
                      selectedTilesState.primaryLocation.row === rowIndex) ||
                      (selectedTilesState.direction === 'down' &&
                        selectedTilesState.primaryLocation.column ===
                          columnIndex));

                  return (
                    <div
                      key={columnIndex}
                      className={
                        'tile' +
                        (tile.value === 'black' ? ' tile--black' : '') +
                        (selectionIndex >= 0 ? ' tile--selected' : '') +
                        (wordLocationOptions ? ' tile--option' : '') +
                        (primarySelection ? ' tile--primary-selected' : '')
                      }
                      style={{
                        ...(draggedWordLetterIndex >= 0
                          ? { backgroundColor: colors.yellow[300] }
                          : tile.value !== 'black' && element
                          ? {
                              backgroundColor:
                                tile.value === 'empty' &&
                                element.options.length >= 1
                                  ? `rgba(25, 118, 210, ${
                                      (3.3 - element.entropy) / 3.3
                                    })`
                                  : element.options.length === 0 ||
                                    (tile.value !== 'empty' &&
                                      !_.includes(element.options, tile.value))
                                  ? colors.red[200]
                                  : 'white',
                            }
                          : {}),
                        cursor: wordLocationOptions ? 'pointer' : 'initial',
                      }}
                      onMouseOver={mkHandleMouseoverTile(rowIndex, columnIndex)}
                      onClick={mkHandleClickTile(rowIndex, columnIndex)}
                    >
                      {secondaryHighlight && (
                        <div
                          className="tile-highlight tile-highlight--secondary"
                        />
                      )}
                      {hovered && (
                        <div
                          className="tile-highlight"
                          style={{ backgroundColor: colors.yellow[300] }}
                        />
                      )}
                      <div className="tile-contents">
                        {showTileLetterOptions && element ? (
                          <TileLetterOptions options={element.options} />
                        ) : (
                          tileValue
                        )}
                      </div>
                      {tileNumber && !showTileLetterOptions && (
                        <div className="tile-number">{tileNumber}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="sidebar-container sheet">
          <ButtonGroup>
            <Button
              disabled={WFCBusy || running || checkHistoryEmpty()}
              onClick={handleClickBack}
              startIcon={<UndoIcon />}
            >
              Undo
            </Button>
            <Button
              disabled={WFCBusy || running}
              onClick={handleClickBestNext}
              endIcon={<NavigateNextIcon />}
            >
              Next
            </Button>
            <Button
              onClick={handleClickRun}
              color={running ? 'error' : 'primary'}
              variant="contained"
              disabled={WFCBusy && !running}
              endIcon={running ? <StopIcon /> : <PlayArrowIcon />}
            >
              {running ? 'Stop' : 'Auto-Fill'}
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
                    tiles={selectedTiles}
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
