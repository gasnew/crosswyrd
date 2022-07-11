import dayjs from 'dayjs';
import _ from 'lodash';
import CloseIcon from '@mui/icons-material/Close';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DoneIcon from '@mui/icons-material/Done';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ErrorIcon from '@mui/icons-material/Error';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import {
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  Divider,
  IconButton,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FixedSizeList } from 'react-window';

import { PUZZLE_SIZE } from './constants';
import useGrids, { GridType } from './useGrids';
import { devMode } from '../../app/util';

const BLANK_GRID: GridType = {
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
function countWords(grid: GridType): number {
  const solid = (tile: boolean | undefined): boolean =>
    tile === undefined || tile;
  let wordCount = 0;
  _.forEach(grid.tiles, (row, rowIndex) =>
    _.forEach(row, (tile, columnIndex) => {
      const leftTile = grid.tiles[rowIndex][columnIndex - 1];
      const aboveTile = grid.tiles[rowIndex - 1]?.[columnIndex];
      wordCount += !tile // tile is empty
        ? (solid(leftTile) ? 1 : 0) + (solid(aboveTile) ? 1 : 0)
        : 0;
    })
  );
  return wordCount;
}
function countBlocks(grid: GridType): number {
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

interface GridsDialogProps {
  open: boolean;
  canClose: boolean;
  onClose: () => void;
  grids: GridType[];
  selectGrid: (grid: GridType) => void;
}
function GridsDialog({
  open,
  canClose,
  onClose,
  grids,
  selectGrid,
}: GridsDialogProps) {
  const [selectedGridIndex, setSelectedGridIndex] = useState<string | null>(
    null
  );

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
      setTimeout(() => selectGrid(grid), 20);
    },
    [selectedGridIndex, selectGrid]
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

function FillAssistState() {
  return (
    <div
      style={{
        marginTop: 'auto',
        marginBottom: 'auto',
        marginLeft: -10,
        display: 'flex',
      }}
    >
      <DoneIcon
        color="success"
        style={{ margin: 'auto', fontSize: 24 }}
      />
    </div>
  );
}

interface Props {
  disabled: boolean;
  setPuzzleToGrid: (grid: GridType) => void;
  clearLetters: () => void;
}

export default function PuzzleBanner({
  disabled,
  setPuzzleToGrid,
  clearLetters,
}: Props) {
  // Default this dialog to open unless in development mode
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    canClose?: boolean;
  }>({ open: !devMode(), canClose: false });

  const { grids } = useGrids();

  return (
    <div className="puzzle-banner-container">
      <IconButton>
        <UndoIcon />
      </IconButton>
      <IconButton>
        <RedoIcon />
      </IconButton>
      <div style={{ marginTop: 'auto', marginBottom: 'auto' }}>
        <Button disabled={disabled} onClick={clearLetters} size="small">
          Clear
        </Button>
      </div>
      <Divider orientation="vertical" variant="middle" flexItem />
      <FormGroup
        style={{ marginTop: 'auto', marginBottom: 'auto', marginLeft: 20 }}
      >
        <FormControlLabel
          control={<Switch defaultChecked size="small" />}
          label="Fill Assist"
          style={{userSelect: 'none'}}
        />
      </FormGroup>
      <FillAssistState />
      <div style={{ marginTop: 'auto', marginBottom: 'auto', marginLeft: 8 }}>
        <Button variant="contained" size="small">
          Auto-Fill
        </Button>
      </div>
      <GridsDialog
        open={dialogState.open}
        canClose={dialogState.canClose || false}
        onClose={() => setDialogState({ open: false })}
        grids={grids}
        selectGrid={(grid: GridType) => {
          setPuzzleToGrid(grid);
          setDialogState({ open: false });
        }}
      />
    </div>
  );
}
