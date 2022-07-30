import dayjs from 'dayjs';
import _ from 'lodash';
import CloseIcon from '@mui/icons-material/Close';
import {
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  IconButton,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { FixedSizeList } from 'react-window';

import { setFillAssistActive } from '../builder/builderSlice';
import { PUZZLE_SIZE } from '../builder/constants';
import { GridType } from './useGrids';

export const BLANK_GRID: GridType = {
  tiles: _.times(PUZZLE_SIZE, (index) =>
    _.times(PUZZLE_SIZE, (index) => false)
  ),
};

function getDifficulty(grid: GridType) {
  const day = dayjs(grid.date).day();
  return _.includes([1, 2], day)
    ? 'easy'
    : _.includes([3, 4, 0], day)
    ? 'medium'
    : 'hard';
}
export function countWordLengths(grid: GridType): number[] {
  const solid = (tile: boolean | undefined): boolean =>
    tile === undefined || tile;
  return _.flatMap(grid.tiles, (row, rowIndex) =>
    _.flatMap(row, (tile, columnIndex) => {
      if (tile) return []; // tile is solid
      return _.flatMap(
        [
          [1, 0],
          [0, 1],
        ],
        (dir) => {
          const previousTile =
            grid.tiles[rowIndex - dir[0]]?.[columnIndex - dir[1]];
          if (!solid(previousTile)) return [];
          let length = 1;
          while (
            !solid(
              grid.tiles[rowIndex + length * dir[0]]?.[
                columnIndex + length * dir[1]
              ]
            )
          )
            length += 1;
          return [length];
        }
      );
    })
  );
}
export function countWords(grid: GridType): number {
  return countWordLengths(grid).length;
}
export function countBlocks(grid: GridType): number {
  return _.sumBy(_.flatten(grid.tiles), (tile) => (tile ? 1 : 0));
}

function GridButton({
  grid,
  onClick,
  disabled,
  selected,
}: {
  grid: GridType;
  onClick: () => void;
  disabled: boolean;
  selected: boolean;
}) {
  const difficulty = getDifficulty(grid);
  return (
    <Button
      variant="outlined"
      color="inherit"
      style={{
        backgroundColor: '#fff',
        border: '1px solid',
        borderRadius: 8,
        borderColor: '#e0e2e6',
      }}
      className={
        'grid-button' +
        (disabled ? ' grid-button--disabled' : '') +
        (selected ? ' grid-button--selected' : '')
      }
      onClick={onClick}
    >
      {grid.date ? (
        <>
          <span>
            {countWords(grid)} words, {countBlocks(grid)} blocks
          </span>
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
            style={{ pointerEvents: 'none', marginBottom: 5 }}
          />
        </>
      ) : (
        <span style={{ marginBottom: 29 }}>Blank Grid</span>
      )}
      <div className="grid-display-tiles-container">
        {_.map(grid.tiles, (row, rowIndex) => (
          <div key={rowIndex} className="grid-display-tiles-row">
            {_.map(row, (tile, columnIndex) => (
              <div
                key={columnIndex}
                className="grid-display-tile"
                style={{ backgroundColor: tile ? 'black' : 'white' }}
              />
            ))}
          </div>
        ))}
      </div>
    </Button>
  );
}

function GridButtonRow({
  data: { chunkedGrids, mkHandleClick, selectedGridIndex },
  index: rowIndex,
  style,
}: {
  data: {
    chunkedGrids: GridType[][];
    mkHandleClick: (
      rowIndex: number,
      columnIndex: number,
      grid: GridType
    ) => () => void;
    selectedGridIndex: string | null;
  };
  index: number;
  style: any;
}) {
  return (
    <div key={rowIndex} className="grid-button-row" style={style}>
      {_.map(chunkedGrids[rowIndex], (grid, columnIndex) => (
        <GridButton
          key={columnIndex}
          grid={grid}
          onClick={mkHandleClick(rowIndex, columnIndex, grid)}
          disabled={
            selectedGridIndex !== null &&
            selectedGridIndex !== gridIndex(rowIndex, columnIndex)
          }
          selected={
            selectedGridIndex !== null &&
            selectedGridIndex === gridIndex(rowIndex, columnIndex)
          }
        />
      ))}
    </div>
  );
}

function gridIndex(rowIndex: number, columnIndex: number): string {
  return `r${rowIndex}c${columnIndex}`;
}

interface Props {
  open: boolean;
  canClose: boolean;
  onClose: () => void;
  grids: GridType[];
  selectGrid: (grid: GridType) => void;
}

export default function GridsDialog({
  open,
  canClose,
  onClose,
  grids,
  selectGrid,
}: Props) {
  const [selectedGridIndex, setSelectedGridIndex] = useState<string | null>(
    null
  );

  const dispatch = useDispatch();

  useEffect(() => {
    // Reset state 1 second after the dialog closes
    if (!open) setTimeout(() => setSelectedGridIndex(null), 1000);
  }, [open]);

  const chunkedGrids = useMemo(
    () => _.chunk([BLANK_GRID, ..._.shuffle(grids)], 3),
    [grids]
  );

  const mkHandleClick = useCallback(
    (rowIndex: number, columnIndex: number, grid: GridType) => () => {
      if (selectedGridIndex) return;
      setSelectedGridIndex(gridIndex(rowIndex, columnIndex));
      // Wait a second before running the expensive selectGrid function so that
      // the animations can play out
      setTimeout(() => {
        selectGrid(grid);
        // Activate fill assist for non-blank grids
        dispatch(setFillAssistActive(!_.isEqual(grid, BLANK_GRID)));
      }, 20);
    },
    [dispatch, selectedGridIndex, selectGrid]
  );

  return (
    <Dialog
      keepMounted={false}
      maxWidth="lg"
      PaperProps={{ style: { backgroundColor: '#fafbfb' } }}
      open={open}
      onClose={() => canClose && onClose()}
    >
      <DialogTitle>
        <span>Select a Grid</span>
        {canClose && (
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      <div className="grids-container" style={{ height: 682, width: 832 }}>
        {grids.length === 0 ? (
          <CircularProgress
            style={{ margin: 'auto' }}
            size={100}
            thickness={3}
          />
        ) : (
          <FixedSizeList
            height={650}
            width={800}
            itemData={{ chunkedGrids, mkHandleClick, selectedGridIndex }}
            itemCount={chunkedGrids.length}
            itemSize={265}
            overscanCount={5}
          >
            {GridButtonRow}
          </FixedSizeList>
        )}
      </div>
    </Dialog>
  );
}
