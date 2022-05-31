import _ from 'lodash';
import { useCallback, useState } from 'react';

import { CrosswordPuzzleType } from './builderSlice';
import { LocationType } from './CrosswordBuilder';

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
  selectedTileLocations: LocationType[];
}

export default function useTileSelection(
  puzzle: CrosswordPuzzleType
): ReturnType {
  const [selectedTileLocations, setSelectedTileLocations] = useState<
    LocationType[]
  >([]);
  // Default to selecting across, not down (this can be toggled by clicking a
  // selected tile)
  const [acrossMode, setAcrossMode] = useState(true);

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

  return {
    onClick,
    selectedTileLocations,
  };
}
