import axios from 'axios';
import _ from 'lodash';
import { Button, ButtonGroup, Divider } from '@mui/material';
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
  LetterType,
  selectPuzzle,
  selectStagedWord,
  setPuzzleState,
  setPuzzleTilesToResolvedWaveElements,
  setPuzzleTileValues,
  toggleTileBlack,
} from './builderSlice';
import { LETTER_WEIGHTS } from './constants';
import useTileSelection from './useTileSelection';
import useWaveAndPuzzleHistory from './useWaveAndPuzzleHistory';
import useWaveFunctionCollapse, { WaveType } from './useWaveFunctionCollapse';
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

function useDictionary(): DictionaryType | null {
  const [dictionary, setDictionary] = useState<DictionaryType | null>(null);

  // Fetch dictionary
  useEffect(() => {
    const fetchDictionary = async () => {
      const response = await axios.get('word_list.json');
      setDictionary(response.data);
    };
    fetchDictionary();
  }, []);

  return dictionary;
}

export default function CrosswordBuilder() {
  const puzzle = useSelector(selectPuzzle);
  const stagedWord = useSelector(selectStagedWord);
  const dictionary = useDictionary();
  const {
    wave,
    observeAtLocation,
    observeAtLocations,
    clearLocations: clearWaveLocations,
    setWaveState,
  } = useWaveFunctionCollapse(dictionary, puzzle);
  const { popStateHistory } = useWaveAndPuzzleHistory(wave, puzzle);
  const [hoveredTile, setHoveredTile] = useState<LocationType | null>(null);
  const [running, setRunning] = useState(false);

  const { onClick, selectedTileLocations, clearSelection } = useTileSelection(
    puzzle
  );

  // negative number means we've passed the last failed depth
  const stepsToLastFailure = useRef(-1);
  const stepsToBacktrack = useRef(1);

  const dispatch = useDispatch();

  const stepBack = useCallback(() => {
    const previousState = popStateHistory();
    if (!previousState) return;
    setWaveState(previousState.wave);
    dispatch(setPuzzleState(previousState.puzzle));
    return previousState;
  }, [dispatch, setWaveState, popStateHistory]);

  const mkHandleClickTile = (row, column) => {
    return (event) => {
      if (event.ctrlKey)
        dispatch(
          toggleTileBlack({
            row,
            column,
          })
        );
      else onClick(row, column);
    };
  };
  const handleClickNext = useCallback(() => {
    if (!wave) return;
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
    const observation = { row, column, value: newValue };
    const newWave = observeAtLocation(observation);
    if (newWave) {
      // The observation succeeded, so set tile values for all tiles that are
      // now collapsed to one state in the new wave.
      dispatch(setPuzzleTilesToResolvedWaveElements(newWave));
    }
  }, [dispatch, observeAtLocation, puzzle, wave]);
  const handleClickBack = () => {
    stepBack();
  };
  const handleClickRun = () => {
    setRunning(!running);
  };
  const mkHandleMouseoverTile = (row, column) => {
    return () => setHoveredTile({ row, column });
  };
  const handleEnterWord = useCallback(
    (word: string) => {
      if (word.length !== selectedTileLocations.length) return;
      const observations = _.map(word, (letter, index) => ({
        ...selectedTileLocations[index],
        value: letter as LetterType,
      }));
      observeAtLocations(observations);
      dispatch(setPuzzleTileValues(observations));
      clearSelection();
    },
    [dispatch, selectedTileLocations, observeAtLocations, clearSelection]
  );
  const handleClearSelectedTileRange = useCallback(() => {
    clearWaveLocations(selectedTileLocations);
    dispatch(
      setPuzzleTileValues(
        _.map(selectedTileLocations, (location) => ({
          ...location,
          value: 'empty',
        }))
      )
    );
  }, [dispatch, selectedTileLocations, clearWaveLocations]);

  useInterval(() => {
    if (!wave || !running) return;
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
      handleClickNext();
      // We're one step closer to last backtrack
      stepsToLastFailure.current -= 1;
    }
  }, 200);

  const selectedOptionsSet = useMemo(
    () =>
      wave &&
      _.map(
        selectedTileLocations,
        ({ row, column }) => wave.elements[row][column].options
      ),
    [selectedTileLocations, wave]
  );

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
              const tileValue =
                selectionIndex >= 0 && stagedWord[selectionIndex]
                  ? _.toUpper(stagedWord[selectionIndex])
                  : !_.includes(['empty', 'black'], tile.value) &&
                    _.toUpper(tile.value);
              const element = wave && wave.elements[rowIndex][columnIndex];

              return (
                <div
                  key={columnIndex}
                  className={
                    'tile' +
                    (tile.value === 'black' ? ' tile--black' : '') +
                    (selectionIndex >= 0 ? ' tile--selected' : '')
                  }
                  style={{
                    ...(selectionIndex >= 0 && stagedWord[selectionIndex]
                      ? // User is typing out a replacement word
                        { backgroundColor: 'yellow' }
                      : tile.value !== 'black' && element
                      ? {
                          backgroundColor:
                            selectionIndex >= 0 && stagedWord[selectionIndex]
                              ? 'yellow'
                              : element.options.length > 1 ||
                                (element.options.length === 1 &&
                                  tile.value === 'empty')
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
          <Button onClick={handleClickBack}>Back</Button>
          <Button onClick={handleClickNext}>Next</Button>
          <Button onClick={handleClickRun}>{running ? 'Stop' : 'Run'}</Button>
        </ButtonGroup>
        {dictionary && selectedOptionsSet && (
          <>
            <Divider style={{ margin: 10 }} />
            <WordSelector
              dictionary={dictionary}
              optionsSet={selectedOptionsSet}
              onEnter={handleEnterWord}
              onClear={handleClearSelectedTileRange}
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
