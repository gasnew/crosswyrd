import _ from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import {
  CrosswordPuzzleType,
  selectCurrentTab,
  selectFillAssistActive,
} from './builderSlice';
import { PUZZLE_SIZE } from './constants';
import { getFlattenedAnswers } from './ClueEntry';
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
export type UpdateSelectionWithPuzzleType = (
  puzzle: CrosswordPuzzleType,
  newPrimaryLocation: LocationType,
  newDirection: DirectionType
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

interface ReturnType {
  onClick: (row: number, column: number) => void;
  updateSelection: (
    primaryLocation: LocationType,
    direction?: DirectionType
  ) => void;
  selectedTilesState: SelectedTilesStateType | null;
  updateSelectionWithPuzzle: UpdateSelectionWithPuzzleType;
  clearSelection: () => void;
  selectBestNext: (state?: WaveAndPuzzleType) => void;
  selectNextAnswer: (forward: boolean) => void;
}

export default function useTileSelection(
  puzzle: CrosswordPuzzleType,
  wave: WaveType | null,
  processingLastChange: boolean,
  running: boolean
): ReturnType {
  const [primaryLocation, setPrimaryLocation] = useState<LocationType | null>(
    null
  );
  const [direction, setDirection] = useState<DirectionType>('across');

  const currentTab = useSelector(selectCurrentTab);
  const fillAssistActive = useSelector(selectFillAssistActive);

  const dir = useMemo(() => (direction === 'across' ? [0, 1] : [1, 0]), [
    direction,
  ]);
  const locations: LocationType[] = useMemo(() => {
    if (!primaryLocation) return [];
    const { row, column } = primaryLocation;
    if (puzzle.tiles[row][column].value === 'black') return [primaryLocation];
    const tilesBehind =
      _.takeWhile(
        _.range(PUZZLE_SIZE),
        (index) =>
          (puzzle.tiles?.[row - index * dir[0]]?.[column - index * dir[1]]
            ?.value || 'black') !== 'black'
      ).length - 1;
    const tilesInFront =
      _.takeWhile(
        _.range(PUZZLE_SIZE),
        (index) =>
          (puzzle.tiles?.[row + index * dir[0]]?.[column + index * dir[1]]
            ?.value || 'black') !== 'black'
      ).length - 1;
    return _.map(_.range(-tilesBehind, tilesInFront + 1), (index) => ({
      row: row + index * dir[0],
      column: column + index * dir[1],
    }));
  }, [dir, primaryLocation, puzzle]);

  const updateSelection = useCallback(
    (newPrimaryLocation: LocationType, newDirection?: DirectionType) => {
      setPrimaryLocation(newPrimaryLocation);
      setDirection(newDirection || direction);
    },
    [direction]
  );

  const clearSelection = useCallback(() => {
    setPrimaryLocation(null);
  }, []);

  const updateSelectionWithPuzzle = useCallback(
    (
      newPuzzle: CrosswordPuzzleType,
      newPrimaryLocation: LocationType,
      newDirection: DirectionType
    ) => {
      if (!primaryLocation || locations.length < 1) return;

      //if (
      //_.every(
      //locations,
      //({ row, column }) => newPuzzle.tiles[row][column].value !== 'empty'
      //)
      //) {
      //// Clear selection because we have reached the end of the word, and the
      //// word is completely filled
      //clearSelection();
      //return;
      //}

      // TODO: Remove all this fancy jazz?
      //if (
      //newPuzzle.tiles[newPrimaryLocation.row][newPrimaryLocation.column]
      //.value === 'empty'
      //) {
      //// Move backward to first non-empty tile
      //while (
      //newPuzzle.tiles[newPrimaryLocation.row - dir[0]]?.[
      //newPrimaryLocation.column - dir[1]
      //]?.value === 'empty'
      //) {
      //newPrimaryLocation = {
      //row: newPrimaryLocation.row - dir[0],
      //column: newPrimaryLocation.column - dir[1],
      //};
      //}
      //} else {
      //// Move forward to first empty tile
      //const next = ({ row, column }) => ({
      //row: row + dir[0],
      //column: column + dir[1],
      //});
      //while (
      //next(newPrimaryLocation).row < PUZZLE_SIZE &&
      //next(newPrimaryLocation).column < PUZZLE_SIZE &&
      //newPuzzle.tiles[newPrimaryLocation.row + dir[0]]?.[
      //newPrimaryLocation.column + dir[1]
      //]?.value !== 'empty'
      //) {
      //newPrimaryLocation = {
      //row: newPrimaryLocation.row + dir[0],
      //column: newPrimaryLocation.column + dir[1],
      //};
      //}
      //if (
      //newPrimaryLocation.row + dir[0] < PUZZLE_SIZE &&
      //newPrimaryLocation.column + dir[1] < PUZZLE_SIZE
      //)
      //// Move it one more into the empty spot
      //newPrimaryLocation = {
      //row: newPrimaryLocation.row + dir[0],
      //column: newPrimaryLocation.column + dir[1],
      //};
      //else newPrimaryLocation = primaryLocation;
      //}

      setPrimaryLocation(newPrimaryLocation);
      setDirection(newDirection || direction);
    },
    [primaryLocation, locations, direction]
  );

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
    [puzzle, wave, direction]
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
    [direction, primaryLocation]
  );

  const selectNextAnswer = useCallback(
    (forward: boolean) => {
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

      const { direction: answerDirection, row, column } = answers[
        (currentAnswerIndex + (forward ? 1 : -1) + answers.length) %
          answers.length
      ];
      updateSelection({ row, column }, answerDirection);
    },
    [puzzle, locations, direction, updateSelection]
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
    updateSelectionWithPuzzle,
    updateSelection,
    selectedTilesState,
    clearSelection,
    selectBestNext,
    selectNextAnswer,
  };
}
