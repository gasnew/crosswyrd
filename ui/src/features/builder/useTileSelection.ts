import _ from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { CrosswordPuzzleType, selectCurrentTab } from './builderSlice';
import { LocationType } from './CrosswordBuilder';
import { WaveAndPuzzleType } from './useWaveAndPuzzleHistory';
import { WaveType } from './useWaveFunctionCollapse';
import { getAllElementSets } from './WordBank';

function getAcrossTileLocations(
  puzzle: CrosswordPuzzleType,
  row: number,
  column: number
): LocationType[] {
  let startColumn = column;
  while (
    startColumn > 0 &&
    puzzle.tiles[row][startColumn - 1].value !== 'black'
  )
    startColumn--;
  let stopColumn = column;
  while (
    stopColumn < puzzle.tiles.length - 1 &&
    puzzle.tiles[row][stopColumn + 1].value !== 'black'
  )
    stopColumn++;

  return _.map(_.range(startColumn, stopColumn + 1), (selectedColumn) => ({
    row,
    column: selectedColumn,
  }));
}

function getDownTileLocations(
  puzzle: CrosswordPuzzleType,
  row: number,
  column: number
): LocationType[] {
  let startRow = row;
  while (startRow > 0 && puzzle.tiles[startRow - 1][column].value !== 'black')
    startRow--;
  let stopRow = row;
  while (
    stopRow < puzzle.tiles.length - 1 &&
    puzzle.tiles[stopRow + 1][column].value !== 'black'
  )
    stopRow++;

  return _.map(_.range(startRow, stopRow + 1), (selectedRow) => ({
    row: selectedRow,
    column,
  }));
}

export interface SelectedTilesStateType {
  locations: LocationType[];
  primaryIndex: number;
}
export type SetNextPrimarySelectedTileType = (stepsForward: number) => void;

interface ReturnType {
  onClick: (row: number, column: number) => void;
  setSelectedTileLocations: (
    locations: LocationType[],
    primaryIndex?: number
  ) => void;
  selectedTilesState: SelectedTilesStateType | null;
  setNextPrimarySelectedTile: SetNextPrimarySelectedTileType;
  clearSelection: () => void;
  selectBestNext: (state?: WaveAndPuzzleType) => void;
}

export default function useTileSelection(
  puzzle: CrosswordPuzzleType,
  wave: WaveType | null,
  processingLastChange: boolean,
  running: boolean
): ReturnType {
  const [
    selectedTilesState,
    setSelectedTilesState,
  ] = useState<SelectedTilesStateType | null>(null);

  const currentTab = useSelector(selectCurrentTab);

  const setSelectedTileLocations = useCallback(
    (locations: LocationType[], primaryIndex?: number) => {
      const newPrimaryIndex =
        primaryIndex ??
        _.findIndex(
          locations,
          ({ row, column }) => puzzle.tiles[row][column].value === 'empty'
        ) ??
        0;
      setSelectedTilesState(
        locations.length > 0
          ? {
              locations,
              primaryIndex: newPrimaryIndex >= 0 ? newPrimaryIndex : 0,
            }
          : null
      );
    },
    [puzzle]
  );

  const clearSelection = useCallback(() => {
    setSelectedTileLocations([]);
  }, [setSelectedTileLocations]);

  const setNextPrimarySelectedTile = useCallback(
    (stepsForward: number) => {
      if (!selectedTilesState || selectedTilesState.primaryIndex < 0) return;
      const { locations, primaryIndex } = selectedTilesState;

      let nextIndex = primaryIndex + stepsForward;
      if (
        primaryIndex === locations.length - 1 &&
        nextIndex === locations.length - 1
      ) {
        // Clear selection because we have reached the end of the word
        clearSelection();
        return;
      }

      while (
        stepsForward > 0 &&
        nextIndex < locations.length &&
        puzzle.tiles[locations[nextIndex].row][locations[nextIndex].column]
          .value !== 'empty'
      )
        nextIndex += 1;
      setSelectedTileLocations(
        locations,
        nextIndex < locations.length && nextIndex >= 0
          ? nextIndex
          : primaryIndex + stepsForward
      );
    },
    [selectedTilesState, setSelectedTileLocations, puzzle, clearSelection]
  );

  const selectBestNext = useCallback(
    (state?: WaveAndPuzzleType) => {
      const thisPuzzle = state?.puzzle || puzzle;
      const thisWave = state?.wave || wave;

      // Select the element set with the lowest average entropy
      const prioritizedElementSets = _.sortBy(
        _.filter(getAllElementSets(thisPuzzle, thisWave), (elements) =>
          // Some tile in this set is empty
          _.some(
            elements,
            ({ row, column }) => thisPuzzle.tiles[row][column].value === 'empty'
          )
        ),
        [
          // Sort by average entropy
          (elements) => -_.sumBy(elements, (element) => 3.3 - element.entropy),
          // Sort by length
          (elements) => -elements.length,
        ]
      );
      if (prioritizedElementSets.length > 0)
        setSelectedTileLocations(
          _.map(prioritizedElementSets[0], ({ row, column }) => ({
            row,
            column,
          }))
        );
    },
    [puzzle, wave, setSelectedTileLocations]
  );

  // Automatically select best next word
  const prevProcessingLastChange = useRef(processingLastChange);
  useEffect(() => {
    if (
      currentTab !== 0 ||
      running ||
      (selectedTilesState?.locations?.length || 0) > 0
    )
      return;

    // Only proceed if we are not processing a change now, but we were last
    // time this was run (i.e., the user probably wants to move on to the next
    // best word).
    if (processingLastChange || !prevProcessingLastChange.current) {
      prevProcessingLastChange.current = processingLastChange;
      return;
    }
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
    prevProcessingLastChange.current = processingLastChange;

    selectBestNext();
  }, [
    currentTab,
    running,
    processingLastChange,
    selectedTilesState,
    selectBestNext,
    puzzle,
    wave,
  ]);

  const onClick = useCallback(
    (row, column) => {
      if (puzzle.tiles[row][column].value === 'black') {
        setSelectedTileLocations([]);
        return;
      }
      // Toggle whether selection is across or down if we're clicking on the
      // primary selected tile
      const isAcross = selectedTilesState
        ? selectedTilesState.locations.length > 1 &&
          selectedTilesState.locations[1].column >
            selectedTilesState.locations[0].column
        : true;
      const primaryIndex = selectedTilesState?.primaryIndex ?? -1;
      const primaryTile =
        primaryIndex >= 0
          ? selectedTilesState?.locations?.[primaryIndex]
          : null;
      const shouldBeAcross =
        primaryTile?.row === row && primaryTile?.column === column
          ? !isAcross
          : isAcross;

      const newSelections = shouldBeAcross
        ? getAcrossTileLocations(puzzle, row, column)
        : getDownTileLocations(puzzle, row, column);
      setSelectedTileLocations(
        newSelections,
        _.findIndex(
          newSelections,
          (location) => location.row === row && location.column === column
        )
      );
    },
    [puzzle, selectedTilesState, setSelectedTileLocations]
  );

  return {
    onClick,
    setSelectedTileLocations,
    setNextPrimarySelectedTile,
    selectedTilesState,
    clearSelection,
    selectBestNext,
  };
}
