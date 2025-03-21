import _ from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import {
  CrosswordPuzzleType,
  selectCurrentTab,
  selectFillAssistActive,
} from './builderSlice';
import { AnswerEntryType, getFlattenedAnswers } from './ClueEntry';
import { LocationType } from './CrosswordBuilder';
import { WaveAndPuzzleType } from './useWaveAndPuzzleHistory';
import { ElementType, WaveType } from './useWaveFunctionCollapse';
import { getAllElementSets } from './WordBank';

export type DirectionType = 'across' | 'down';
export interface SelectedTilesStateType {
  locations: LocationType[];
  primaryLocation: LocationType;
  direction: DirectionType;
}
export type UpdateSelectionType = (
  primaryLocation: LocationType,
  direction?: DirectionType
) => void;

export function getBestNextElementSet(
  puzzle: CrosswordPuzzleType,
  wave: WaveType | null
): ElementType[] | null {
  // Returns the element set with the lowest average entropy then the longest
  // length
  const prioritizedElementSets = _.sortBy(
    _.filter(getAllElementSets(puzzle, wave), (elements) =>
      // Some tile in this set is empty
      _.some(
        elements,
        ({ row, column }) => puzzle.tiles[row][column].value === 'empty'
      )
    ),
    [
      // Sort by average entropy
      (elements) => -_.sumBy(elements, (element) => 3.3 - element.entropy),
      // Sort by length
      (elements) => -elements.length,
    ]
  );

  return prioritizedElementSets.length > 0 ? prioritizedElementSets[0] : null;
}

function determineLocations(
  puzzle: CrosswordPuzzleType,
  primaryLocation: LocationType,
  dir: number[]
): LocationType[] {
  const { row, column } = primaryLocation;
  if (puzzle.tiles[row][column].value === 'black') return [primaryLocation];
  const tilesBehind =
    _.takeWhile(
      _.range(puzzle.tiles.length),
      (index) =>
        (puzzle.tiles?.[row - index * dir[0]]?.[column - index * dir[1]]
          ?.value || 'black') !== 'black'
    ).length - 1;
  const tilesInFront =
    _.takeWhile(
      _.range(puzzle.tiles.length),
      (index) =>
        (puzzle.tiles?.[row + index * dir[0]]?.[column + index * dir[1]]
          ?.value || 'black') !== 'black'
    ).length - 1;
  return _.map(_.range(-tilesBehind, tilesInFront + 1), (index) => ({
    row: row + index * dir[0],
    column: column + index * dir[1],
  }));
}

// Returns handles for primary location that cannot possible be out of bounds
// for the puzzle
function useSafePrimaryLocation(
  puzzle: CrosswordPuzzleType
): [LocationType | null, (location: LocationType | null) => void] {
  const [
    unsafePrimaryLocation,
    setPrimaryLocation,
  ] = useState<LocationType | null>(null);

  const primaryLocation = useMemo(
    () =>
      unsafePrimaryLocation &&
      (unsafePrimaryLocation.row >= puzzle.tiles.length ||
        unsafePrimaryLocation.column >= puzzle.tiles.length)
        ? null
        : unsafePrimaryLocation,
    [unsafePrimaryLocation, puzzle]
  );

  return [primaryLocation, setPrimaryLocation];
}

interface ReturnType {
  onClick: (row: number, column: number) => void;
  updateSelection: UpdateSelectionType;
  selectedTilesState: SelectedTilesStateType | null;
  clearSelection: () => void;
  selectBestNext: (state?: WaveAndPuzzleType) => void;
  selectNextAnswer: (forward: boolean) => void;
  selectAnswer: (answer: AnswerEntryType, endOfAnswer?: boolean) => void;
}

export default function useTileSelection(
  puzzle: CrosswordPuzzleType,
  wave: WaveType | null,
  processingLastChange: boolean,
  running: boolean,
  playerMode: boolean = false
): ReturnType {
  const [primaryLocation, setPrimaryLocation] = useSafePrimaryLocation(puzzle);
  const [direction, setDirection] = useState<DirectionType>('across');

  const currentTab = useSelector(selectCurrentTab);
  const fillAssistActive = useSelector(selectFillAssistActive);

  const dir = useMemo(() => (direction === 'across' ? [0, 1] : [1, 0]), [
    direction,
  ]);
  const locations: LocationType[] = useMemo(() => {
    if (!primaryLocation) return [];
    return determineLocations(puzzle, primaryLocation, dir);
  }, [dir, primaryLocation, puzzle]);

  const updateSelection = useCallback(
    (newPrimaryLocation: LocationType, newDirection?: DirectionType) => {
      setPrimaryLocation(newPrimaryLocation);
      setDirection(newDirection || direction);
    },
    [setPrimaryLocation, direction]
  );

  const clearSelection = useCallback(() => {
    setPrimaryLocation(null);
  }, [setPrimaryLocation]);

  const selectBestNext = useCallback(
    (state?: WaveAndPuzzleType) => {
      const thisPuzzle = state?.puzzle || puzzle;
      const thisWave = state?.wave || wave;

      const bestElementSet = getBestNextElementSet(thisPuzzle, thisWave);
      if (bestElementSet) {
        const newDirection =
          bestElementSet.length > 1
            ? bestElementSet[1].row > bestElementSet[0].row
              ? 'down'
              : 'across'
            : direction;
        setPrimaryLocation(
          _.find(
            bestElementSet,
            ({ row, column }) => thisPuzzle.tiles[row][column].value === 'empty'
          ) || { row: bestElementSet[0].row, column: bestElementSet[0].column }
        );
        if (newDirection !== direction) setDirection(newDirection);
      }
    },
    [puzzle, wave, direction, setPrimaryLocation]
  );

  // Automatically select best next word
  const prevProcessingLastChange = useRef(processingLastChange);
  useEffect(() => {
    if (currentTab !== 0 || running || primaryLocation || !fillAssistActive)
      return;

    // Only proceed if we are not processing a change now, but we were last
    // time this was run (i.e., the user probably wants to move on to the next
    // best word).
    if (processingLastChange || !prevProcessingLastChange.current) {
      prevProcessingLastChange.current = processingLastChange;
      return;
    }
    prevProcessingLastChange.current = processingLastChange;
    if (
      wave &&
      _.some(
        _.flatMap(puzzle.tiles, (row, rowIndex) =>
          _.map(
            row,
            (tile, columnIndex) =>
              tile.value !== 'black' &&
              wave.elements[rowIndex][columnIndex].options.length === 0
          )
        )
      )
    )
      // There is at least one problem in the board--do not automatically
      // select anything.
      return;

    selectBestNext();
  }, [
    currentTab,
    running,
    processingLastChange,
    primaryLocation,
    selectBestNext,
    puzzle,
    wave,
    fillAssistActive,
  ]);

  const onClick = useCallback(
    (row, column) => {
      if (playerMode && puzzle.tiles[row][column].value === 'black') return;
      // Toggle whether selection is across or down if we're clicking on the
      // primary selected tile
      const newDirection =
        primaryLocation &&
        primaryLocation.row === row &&
        primaryLocation.column === column
          ? direction === 'across'
            ? 'down'
            : 'across'
          : direction;

      setPrimaryLocation({ row, column });
      if (newDirection !== direction) setDirection(newDirection);
    },
    [direction, primaryLocation, playerMode, puzzle.tiles, setPrimaryLocation]
  );

  const selectAnswer = useCallback(
    (answer: AnswerEntryType, endOfAnswer: boolean = false) => {
      // Set the selection to the first empty tile in the answer or to the last
      // tile if specified
      const answerLocations = determineLocations(
        puzzle,
        answer,
        answer.direction === 'across' ? [0, 1] : [1, 0]
      );
      const { row, column } =
        (endOfAnswer
          ? _.last(answerLocations)
          : _.find(
              answerLocations,
              (location, index) => answer.answer.word[index] === '-'
            )) || answer;
      updateSelection({ row, column }, answer.direction);
    },
    [puzzle, updateSelection]
  );

  const selectNextAnswer = useCallback(
    (forward: boolean, endOfAnswer: boolean = false) => {
      // Select the first empty tile in the next unfinished answer. If
      // endOfAnswer, select last tile in the selected answer.
      if (locations.length === 0) return;
      const answers = getFlattenedAnswers(puzzle);
      const currentAnswerIndex = _.findIndex(
        answers,
        (answer) =>
          locations[0].row === answer.row &&
          locations[0].column === answer.column &&
          direction === answer.direction
      );
      if (currentAnswerIndex < 0) return;

      // Construct array of all answers after this one
      const afterAnswersUnadjusted = _.drop([
        ..._.slice(answers, currentAnswerIndex),
        ..._.slice(answers, 0, currentAnswerIndex),
      ]);
      // Reverse the following answers if going backwards
      const afterAnswers = forward
        ? afterAnswersUnadjusted
        : _.reverse(afterAnswersUnadjusted);
      // Find the next incomplete answer, or if none, the next answer
      const answer =
        _.find(afterAnswers, (answer) => !answer.answer.complete) ||
        afterAnswers[0];

      selectAnswer(answer, endOfAnswer);
    },
    [puzzle, locations, direction, selectAnswer]
  );

  const selectedTilesState = useMemo(() => {
    if (!primaryLocation) return null;
    return {
      primaryLocation,
      locations,
      direction,
    };
  }, [primaryLocation, locations, direction]);

  return {
    onClick,
    updateSelection,
    selectedTilesState,
    clearSelection,
    selectBestNext,
    selectNextAnswer,
    selectAnswer,
  };
}
