import dayjs from 'dayjs';
import _ from 'lodash';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  IconButton,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { FixedSizeList } from 'react-window';

import {
  clearClueGrid,
  initClueGrid,
  setFillAssistActive,
} from '../builder/builderSlice';
import { logEvent } from '../../firebase';
import { GridType } from './useGrids';

export function blankGrid(gridSize: number): GridType {
  return {
    tiles: _.times(gridSize, (index) => _.times(gridSize, (index) => false)),
  };
}

export function getDifficulty(date?: string) {
  const day = dayjs(date).day();
  return _.includes([1, 2], day)
    ? 'easy'
    : _.includes([3, 4, 0], day)
    ? 'medium'
    : 'hard';
}
export function DifficultyChip({
  date,
  short,
  style,
}: {
  date: string;
  short?: boolean;
  style?: any;
}) {
  const difficulty = getDifficulty(date);
  const chip = (
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
      label={short ? _.capitalize(difficulty)[0] : _.capitalize(difficulty)}
      style={{ ...style, cursor: 'pointer' }}
    />
  );

  if (short)
    return (
      <Tooltip
        title={
          <span>
            Source puzzle difficulty:{' '}
            <span style={{ fontWeight: 'bold' }}>
              {_.capitalize(difficulty)}
            </span>
          </span>
        }
        placement="top"
        arrow
        disableInteractive
      >
        {chip}
      </Tooltip>
    );
  return chip;
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
          <DifficultyChip
            date={grid.date}
            style={{ pointerEvents: 'none', marginBottom: 5 }}
          />
        </>
      ) : (
        <span style={{ marginBottom: grid.tiles.length === 15 ? 29 : 0 }}>
          Blank Grid
        </span>
      )}
      <div className="grid-display-container">
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

interface GridsTabPanelProps {
  tab: number;
  index: number;
  grids: GridType[];
  gridSize: number;
  selectGrid: (grid: GridType) => void;
  open: boolean;
}

function GridsTabPanel({
  tab,
  index,
  grids,
  gridSize,
  selectGrid,
  open,
}: GridsTabPanelProps) {
  const [selectedGridIndex, setSelectedGridIndex] = useState<string | null>(
    null
  );

  const dispatch = useDispatch();

  const chunkedGrids = useMemo(
    () => _.chunk([blankGrid(gridSize), ..._.shuffle(grids)], 3),
    [grids, gridSize]
  );

  const mkHandleClick = useCallback(
    (rowIndex: number, columnIndex: number, grid: GridType) => () => {
      if (selectedGridIndex) return;
      setSelectedGridIndex(gridIndex(rowIndex, columnIndex));
      logEvent('new_grid_selected');
      // Wait a second before running the expensive selectGrid function so that
      // the animations can play out
      setTimeout(() => {
        // Clear the clue grid first so that we avoid out-of-bounds exceptions.
        dispatch(clearClueGrid());
        selectGrid(grid);
        dispatch(initClueGrid({ size: grid.tiles.length }));
        // Activate fill assist for non-blank grids and for 5x5 grids
        dispatch(
          setFillAssistActive(
            !_.isEqual(grid, blankGrid(gridSize)) || gridSize === 5
          )
        );
      }, 100);
    },
    [dispatch, selectedGridIndex, selectGrid, gridSize]
  );

  return (
    <div
      role="tabpanel"
      hidden={tab !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
    >
      <Box
        style={{
          visibility: tab === index ? 'visible' : 'hidden',
        }}
      >
        <FixedSizeList
          height={601}
          width={800}
          itemData={{ chunkedGrids, mkHandleClick, selectedGridIndex }}
          itemCount={chunkedGrids.length}
          itemSize={265}
          overscanCount={5}
        >
          {GridButtonRow}
        </FixedSizeList>
      </Box>
    </div>
  );
}

function gridIndex(rowIndex: number, columnIndex: number): string {
  return `r${rowIndex}c${columnIndex}`;
}
function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
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
  const [tab, setTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newTab: number) => {
    setTab(newTab);
  };

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
          <Box sx={{ width: '100%' }}>
            <Box
              sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex' }}
            >
              <Tabs
                value={tab}
                onChange={handleTabChange}
                style={{ margin: 'auto' }}
              >
                <Tab label="15x15" {...a11yProps(0)} />
                <Tab label="10x10" {...a11yProps(1)} />
                <Tab label="5x5" {...a11yProps(1)} />
              </Tabs>
            </Box>
            <GridsTabPanel
              tab={tab}
              index={0}
              grids={grids}
              gridSize={15}
              selectGrid={selectGrid}
              open={open}
            />
            <GridsTabPanel
              tab={tab}
              index={1}
              grids={[]}
              gridSize={10}
              selectGrid={selectGrid}
              open={open}
            />
            <GridsTabPanel
              tab={tab}
              index={2}
              grids={[]}
              gridSize={5}
              selectGrid={selectGrid}
              open={open}
            />
          </Box>
        )}
      </div>
    </Dialog>
  );
}
