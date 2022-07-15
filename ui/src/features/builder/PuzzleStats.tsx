import _ from 'lodash';
import { Chip, Divider } from '@mui/material';
import React, { useMemo } from 'react';

import { countBlocks, countWordLengths } from '../app/GridsDialog';
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
  const wordLengths: number[] = useMemo(() => countWordLengths(grid), [grid]);
  const blockCount: number = useMemo(() => countBlocks(grid), [grid]);
  const smallWordCount: number = useMemo(
    () => _.sumBy(wordLengths, (length) => (length <= 2 ? 1 : 0)),
    [wordLengths]
  );

  return (
    <div className="puzzle-stats">
      <span>{wordLengths.length} words</span>
      <Divider
        orientation="vertical"
        flexItem
        style={{ marginLeft: 8, marginRight: 8 }}
      />
      <span>{blockCount} blocks</span>
      {smallWordCount > 0 && (
        <>
          <Divider
            orientation="vertical"
            flexItem
            style={{ marginLeft: 8, marginRight: 8 }}
          />
          <Chip
            size="small"
            color="error"
            variant="filled"
            label={
              <span>
                <span style={{ fontWeight: 'bold' }}>{smallWordCount}</span>{' '}
                words 2 letters long or shorter
              </span>
            }
            style={{ pointerEvents: 'none' }}
          />
        </>
      )}
    </div>
  );
}
