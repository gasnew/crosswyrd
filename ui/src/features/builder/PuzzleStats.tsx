import _ from 'lodash';
import React, { useMemo } from 'react';

import { countBlocks, countWords } from '../app/GridsDialog';
import { CrosswordPuzzleType } from './builderSlice';
import { GridType } from '../app/useGrids';

interface Props {
  puzzle: CrosswordPuzzleType;
}

export default function PuzzleStats({ puzzle }: Props) {
  const grid: GridType = useMemo(
    () => ({
      tiles: _.map(puzzle.tiles, (row) =>
        _.map(row, (tile) => tile.value === 'black')
      ),
    }),
    [puzzle]
  );
  const wordCount: number = useMemo(() => countWords(grid), [grid]);
  const blockCount: number = useMemo(() => countBlocks(grid), [grid]);

  return (
    <div>
      <span>{wordCount} words</span>
      <span>{blockCount} blocks</span>
    </div>
  );
}
