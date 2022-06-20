import dayjs from 'dayjs';
import _ from 'lodash';
import { Button, Chip } from '@mui/material';

import { GridType } from './useGrid';

interface Props {
  disabled: boolean;
  grid: GridType;
  newGrid: () => void;
  clearLetters: () => void;
}

export default function PuzzleBanner({
  disabled,
  grid,
  newGrid,
  clearLetters,
}: Props) {
  const day = dayjs(grid.date).day();
  const difficulty = _.includes([1, 2], day)
    ? 'easy'
    : _.includes([3, 4, 0], day)
    ? 'medium'
    : 'hard';

  return (
    <div className="puzzle-banner-container">
      <Button disabled={disabled} onClick={newGrid}>
        New Grid
      </Button>
      <Chip
        size="small"
        color={
          difficulty === 'easy'
            ? 'success'
            : difficulty === 'medium'
            ? 'warning'
            : 'error'
        }
        variant="filled"
        label={_.capitalize(difficulty)}
      />
      <Button disabled={disabled} onClick={clearLetters}>
        Clear Puzzle
      </Button>
    </div>
  );
}
