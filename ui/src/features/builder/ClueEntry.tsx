import _ from 'lodash';
import { useMemo, useRef } from 'react';

import { CrosswordPuzzleType, TileType } from './builderSlice';

function computeTileNumbers(puzzle: CrosswordPuzzleType): TileNumbersType {
  const solid = (tile: TileType | null): boolean =>
    !tile || tile.value === 'black';
  let tileNumber = 1;
  return _.map(puzzle.tiles, (row, rowIndex) =>
    _.map(row, (tile, columnIndex) => {
      const leftTile = puzzle.tiles[rowIndex]?.[columnIndex - 1];
      const aboveTile = puzzle.tiles?.[rowIndex - 1]?.[columnIndex];
      if (tile.value !== 'black' && (solid(leftTile) || solid(aboveTile))) {
        tileNumber += 1;
        return tileNumber - 1;
      }
      return null;
    })
  );
}

type TileNumbersType = (number | null)[][];
interface ClueDataType {
  tileNumbers: TileNumbersType;
}

export function useClueData(puzzle: CrosswordPuzzleType): ClueDataType {
  const cachedPuzzle = useRef<CrosswordPuzzleType>(puzzle);
  const cachedTileNumbers = useRef<(number | null)[][]>(
    computeTileNumbers(puzzle)
  );
  const tileNumbers = useMemo(() => {
    // Return if the black tiles haven't changed
    if (
      _.every(puzzle.tiles, (row, rowIndex) =>
        _.every(
          row,
          (tile, columnIndex) =>
            (tile.value === 'black') ===
            (cachedPuzzle.current.tiles[rowIndex][columnIndex].value ===
              'black')
        )
      )
    )
      return cachedTileNumbers.current;

    const newTileNumbers = computeTileNumbers(puzzle);

    cachedPuzzle.current = puzzle;
    cachedTileNumbers.current = newTileNumbers;

    return newTileNumbers;
  }, [puzzle]);

  return {
    tileNumbers,
  };
}
