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

interface ReturnType {
  onClick: (row: number, column: number) => void;
  setSelectedTileLocations: (locations: LocationType[]) => void;
  selectedTileLocations: LocationType[];
  clearSelection: () => void;
  selectBestNext: (state?: WaveAndPuzzleType) => void;
}

export default function useTileSelection(
  puzzle: CrosswordPuzzleType,
  wave: WaveType | null,
  processingLastChange: boolean,
  running: boolean
): ReturnType {
  const [selectedTileLocations, setSelectedTileLocations] = useState<
    LocationType[]
  >([]);
  // Default to selecting across, not down (this can be toggled by clicking a
  // selected tile)
  const [acrossMode, setAcrossMode] = useState(true);

  const currentTab = useSelector(selectCurrentTab);

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
    [puzzle, wave]
  );

  // Automatically select best next word
  const prevProcessingLastChange = useRef(processingLastChange);
  useEffect(() => {
    if (currentTab !== 0 || running || selectedTileLocations.length > 0) return;

    // Only proceed if we are not processing a change now, but we were last
    // time this was run (i.e., the user probably wants to move on to the next
    // best word).
    if (processingLastChange || !prevProcessingLastChange.current) {
      prevProcessingLastChange.current = processingLastChange;
      return;
    }
    prevProcessingLastChange.current = processingLastChange;

    selectBestNext();
  }, [
    currentTab,
    running,
    processingLastChange,
    selectedTileLocations,
    selectBestNext,
  ]);

  const onClick = useCallback(
    (row, column) => {
      if (puzzle.tiles[row][column].value === 'black') {
        setSelectedTileLocations([]);
        return;
      }
      // Toggle acrossMode if we're clicking on a selected tile
      const newAcrossMode = _.some(
        selectedTileLocations,
        (location) => location.row === row && location.column === column
      )
        ? !acrossMode
        : acrossMode;
      setAcrossMode(newAcrossMode);

      if (newAcrossMode) {
        setSelectedTileLocations(getAcrossTileLocations(puzzle, row, column));
      } else {
        setSelectedTileLocations(getDownTileLocations(puzzle, row, column));
      }
    },
    [puzzle, acrossMode, selectedTileLocations]
  );

  const clearSelection = useCallback(() => {
    setSelectedTileLocations([]);
  }, []);

  return {
    onClick,
    setSelectedTileLocations,
    selectedTileLocations,
    clearSelection,
    selectBestNext,
  };
}
