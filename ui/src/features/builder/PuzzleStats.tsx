import _ from 'lodash';
import { Chip, Divider } from '@mui/material';
import React, { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { AUTO_FILL_ASSIST_TOGGLE_THRESHOLD } from './constants';
import { countBlocks, countWordLengths } from '../app/GridsDialog';
import {
  CrosswordPuzzleType,
  selectFillAssistActive,
  autoSetFillAssistActive,
} from './builderSlice';
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

  const dispatch = useDispatch();
  const fillAssistActive = useSelector(selectFillAssistActive);
  const prevWordCount = useRef(wordLengths.length);
  useEffect(() => {
    if (
      !fillAssistActive &&
      wordLengths.length >= AUTO_FILL_ASSIST_TOGGLE_THRESHOLD &&
      prevWordCount.current < AUTO_FILL_ASSIST_TOGGLE_THRESHOLD
    )
      dispatch(autoSetFillAssistActive(true));
    else if (
      fillAssistActive &&
      wordLengths.length < AUTO_FILL_ASSIST_TOGGLE_THRESHOLD &&
      prevWordCount.current >= AUTO_FILL_ASSIST_TOGGLE_THRESHOLD
    )
      dispatch(autoSetFillAssistActive(false));

    prevWordCount.current = wordLengths.length;
  }, [dispatch, fillAssistActive, wordLengths.length]);

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
