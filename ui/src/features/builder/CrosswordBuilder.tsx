import axios from 'axios';
import _ from 'lodash';
import { Alert, Button, ButtonGroup, Divider } from '@mui/material';
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
  getSymmetricTile,
  LetterType,
  selectDraggedWord,
  selectPuzzle,
  selectStagedWord,
  setDraggedWord,
  setPuzzleState,
  setPuzzleTilesToResolvedWaveElements,
  setPuzzleTileValues,
  TileValueType,
  toggleTileBlack,
} from './builderSlice';
import BuilderTabs from './BuilderTabs';
import { ALL_LETTERS, LETTER_WEIGHTS } from './constants';
import useTileSelection from './useTileSelection';
import useWaveAndPuzzleHistory from './useWaveAndPuzzleHistory';
import useWaveFunctionCollapse, { WaveType } from './useWaveFunctionCollapse';
import WordBank, { WordLocationsGridType } from './WordBank';
import WordSelector from './WordSelector';

import './CrosswordBuilder.css';

export interface LocationType {
  row: number;
  column: number;
}

export type DictionaryType = string[];

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

function useDictionary(): {
  dictionary: DictionaryType | null;
  addWordToDictionary: (word: string) => DictionaryType | null;
} {
  const [dictionary, setDictionary] = useState<DictionaryType | null>(null);

  // Fetch dictionary
  useEffect(() => {
    const fetchDictionary = async () => {
      const response = await axios.get('word_list.json');
      setDictionary(response.data);
    };
    fetchDictionary();
  }, []);

  const addWordToDictionary = useCallback(
    (word: string) => {
      if (!dictionary) return null;
      const newDictionary = _.sortBy([...dictionary, word]);
      setDictionary(newDictionary);
      return newDictionary;
    },
    [dictionary]
  );

  return { dictionary, addWordToDictionary };
}

export default function CrosswordBuilder() {
  const puzzle = useSelector(selectPuzzle);
  const stagedWord = useSelector(selectStagedWord);
  const draggedWord = useSelector(selectDraggedWord);
  const { dictionary, addWordToDictionary } = useDictionary();
  const {
    wave,
    updateWaveWithTileUpdates,
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
  const [runningError, setRunningError] = useState('');
  const [
    wordLocationsGrid,
    setWordLocationsGrid,
  ] = useState<WordLocationsGridType | null>(null);

  const { onClick, selectedTileLocations, clearSelection } = useTileSelection(
    puzzle
  );

  // negative number means we've passed the last failed depth
  const stepsToLastFailure = useRef(-1);
  // the number of steps to backtrack next time we reach a failure
  const stepsToBacktrack = useRef(1);
  // the number of steps into the run we are from where we started (guards
  // against undoing something a user inputted)
  const stepsFromRunStart = useRef(0);

  const dispatch = useDispatch();

  // Reset running error when the puzzle changes
  useEffect(() => {
    setRunningError('');
  }, [puzzle]);

  const stepBack = useCallback(() => {
    const previousState = popStateHistory();
    if (!previousState) return;
    setWaveState(previousState.wave);
    dispatch(setPuzzleState(previousState.puzzle));
    return previousState;
  }, [dispatch, setWaveState, popStateHistory]);

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
          handleEnterWord(stagedWord);
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
  const handleClickPlaceOneTile = useCallback(async () => {
    clearSelection();
    await placeOneTile();
  }, [clearSelection, placeOneTile]);
  const handleClickBack = () => {
    if (selectedTileLocations.length > 0) clearSelection();
    stepBack();
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
      const tileLocations = customTileLocations || selectedTileLocations;

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

      // Update the dictionary before making wave observations if the word
      // hasn't been seen before and the word is full-length (i.e., it's not a
      // word fragment, which we wouldn't want in the dictionary)
      const possiblyUpdatedDictionary =
        (!_.includes(word, ' ') &&
          !_.includes(dictionary, word) &&
          addWordToDictionary(word)) ||
        dictionary;

      pushStateHistory({ wave, puzzle });
      updateWaveWithTileUpdates(possiblyUpdatedDictionary, observations);
      dispatch(setPuzzleTileValues(observations));
    },
    [
      dispatch,
      WFCBusy,
      pushStateHistory,
      puzzle,
      wave,
      dictionary,
      addWordToDictionary,
      selectedTileLocations,
      updateWaveWithTileUpdates,
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
        setRunningError(
          'The puzzle cannot be auto-filled from here! Try undoing recent changes, clearing up space around any red tiles, or adjusting the grid pattern.'
        );
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
      wave &&
      _.map(
        selectedTileLocations,
        ({ row, column }) => wave.elements[row][column].options
      ),
    [selectedTileLocations, wave]
  );
  const selectedTiles = useMemo(
    () =>
      _.map(
        selectedTileLocations,
        ({ row, column }) => puzzle.tiles[row][column]
      ),
    [selectedTileLocations, puzzle]
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
  const tilesSelected = useMemo(() => selectedTileLocations.length > 0, [
    selectedTileLocations,
  ]);

  return (
    <div className="puzzle-builder-container">
      <div className="tiles-container" onMouseOut={() => setHoveredTile(null)}>
        {_.map(puzzle.tiles, (row, rowIndex) => (
          <div key={rowIndex} className="puzzle-row">
            {_.map(row, (tile, columnIndex) => {
              const selectionIndex = _.findIndex(
                selectedTileLocations,
                (location) =>
                  location.row === rowIndex && location.column === columnIndex
              );
              // The word bank word location options this tile intersects
              const wordLocationOptions: LocationType[] | null =
                wordLocationsGrid &&
                (wordLocationsGrid[rowIndex][columnIndex].across ||
                  wordLocationsGrid[rowIndex][columnIndex].down);
              const draggedWordLetterIndex = _.findIndex(
                hoveredTiles,
                (tile) => tile.row === rowIndex && tile.column === columnIndex
              );
              const tileValue =
                draggedWord && draggedWordLetterIndex >= 0 // User is hovering with a dragged word
                  ? _.toUpper(draggedWord[draggedWordLetterIndex])
                  : selectionIndex >= 0
                  ? stagedWord[selectionIndex]
                    ? _.toUpper(stagedWord[selectionIndex])
                    : ''
                  : !_.includes(['empty', 'black'], tile.value) &&
                    _.toUpper(tile.value);
              const element = wave && wave.elements[rowIndex][columnIndex];

              return (
                <div
                  key={columnIndex}
                  className={
                    'tile' +
                    (tile.value === 'black' ? ' tile--black' : '') +
                    (selectionIndex >= 0 ? ' tile--selected' : '') +
                    (wordLocationOptions ? ' tile--option' : '')
                  }
                  style={{
                    ...(element &&
                    selectionIndex >= 0 &&
                    stagedWord[selectionIndex]
                      ? // User is typing out a replacement word
                        {
                          backgroundColor:
                            _.includes(
                              element.options,
                              stagedWord[selectionIndex]
                            ) || stagedWord[selectionIndex] === '?'
                              ? 'yellow'
                              : 'red',
                        }
                      : draggedWordLetterIndex >= 0
                      ? { backgroundColor: 'yellow' }
                      : tile.value !== 'black' && element
                      ? {
                          backgroundColor:
                            (tile.value === 'empty' || selectionIndex >= 0) &&
                            element.options.length >= 1
                              ? `rgba(45, 114, 210, ${
                                  (3.3 - element.entropy) / 3.3
                                })`
                              : element.options.length === 0
                              ? 'red'
                              : 'white',
                        }
                      : {}),
                  }}
                  onMouseOver={mkHandleMouseoverTile(rowIndex, columnIndex)}
                  onClick={mkHandleClickTile(rowIndex, columnIndex)}
                >
                  <div className="tile-contents">{tileValue}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="sidebar-container">
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
            onClick={handleClickPlaceOneTile}
            endIcon={<NavigateNextIcon />}
          >
            Place 1
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
        {runningError && (
          <Alert style={{ marginTop: 10 }} severity="error">
            {runningError}
          </Alert>
        )}
        {dictionary && wave && selectedOptionsSet && (
          <>
            <Divider style={{ margin: 10 }} />
            <BuilderTabs
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
            />
          </>
        )}
        {wave && hoveredTile && (
          <>
            <Divider style={{ margin: 10 }} />
            <div>
              <div>
                Hovered tile ({hoveredTile.row}, {hoveredTile.column})
              </div>
              <div>
                Letter options:{' '}
                {
                  wave.elements[hoveredTile.row][hoveredTile.column].options
                    .length
                }
              </div>
              <div>
                Entropy:{' '}
                {wave.elements[hoveredTile.row][hoveredTile.column].entropy}
              </div>
              <div>
                Solid?{' '}
                {wave.elements[hoveredTile.row][hoveredTile.column].solid
                  ? 'Yes'
                  : 'No'}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
