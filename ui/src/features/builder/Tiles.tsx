import _ from 'lodash';
import { colors, Tooltip } from '@mui/material';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { CrosswordPuzzleType, TileValueType, TileType } from './builderSlice';
import { TileNumbersType } from './ClueEntry';
import { LocationType } from './CrosswordBuilder';
import TileLetterOptions from './TileLetterOptions';
import { SelectedTilesStateType } from './useTileSelection';
import { WaveType } from './useWaveFunctionCollapse';
import { WordLocationsGridType } from './WordBank';

const TILE_ANIMATION_MS = 150;

interface TileProps {
  wave: WaveType | null;
  tileNumbers: TileNumbersType;
  selectedTilesState: SelectedTilesStateType | null;
  wordLocationsGrid: WordLocationsGridType | null;
  hovered: boolean;
  draggedWord: string | null;
  mkHandleClickTile: (row: number, column: number) => (event) => void;
  mkHandleMouseoverTile: (row: number, column: number) => () => void;
  draggedWordLetterIndex: number;
  someWrongLetter: boolean;
  tile: TileType;
  rowIndex: number;
  columnIndex: number;
}

function Tile({
  wave,
  tileNumbers,
  selectedTilesState,
  wordLocationsGrid,
  hovered,
  draggedWord,
  mkHandleMouseoverTile,
  mkHandleClickTile,
  draggedWordLetterIndex,
  someWrongLetter,
  tile,
  rowIndex,
  columnIndex,
}: TileProps) {
  const selectionIndex = _.findIndex(
    selectedTilesState?.locations || [],
    (location) => location.row === rowIndex && location.column === columnIndex
  );
  const primarySelection =
    selectedTilesState?.primaryLocation?.row === rowIndex &&
    selectedTilesState?.primaryLocation?.column === columnIndex;
  // The word bank word location options this tile intersects
  const wordLocationOptions: LocationType[] | null =
    wordLocationsGrid &&
    (wordLocationsGrid[rowIndex][columnIndex].across ||
      wordLocationsGrid[rowIndex][columnIndex].down);
  const tileValue =
    draggedWord && draggedWordLetterIndex >= 0 // User is hovering with a dragged word
      ? _.toUpper(draggedWord[draggedWordLetterIndex])
      : !_.includes(['empty', 'black'], tile.value)
      ? _.toUpper(tile.value)
      : '';
  const element = wave && wave.elements[rowIndex][columnIndex];
  const tileNumber = tileNumbers[rowIndex][columnIndex];
  const showTileLetterOptions =
    tile.value === 'empty' &&
    selectionIndex >= 0 &&
    element &&
    element.options.length <= 9 &&
    element.options.length > 0;
  const secondaryHighlight =
    selectionIndex === -1 &&
    selectedTilesState &&
    ((selectedTilesState.direction === 'across' &&
      selectedTilesState.primaryLocation.row === rowIndex) ||
      (selectedTilesState.direction === 'down' &&
        selectedTilesState.primaryLocation.column === columnIndex));
  const wrongLetter =
    !!element &&
    tile.value !== 'empty' &&
    !_.includes(element.options, tile.value);

  // Animate the tile when it becomes a letter from empty
  const [animating, setAnimating] = useState(false);
  const prevValue = useRef<TileValueType>('empty');
  const initialMountTime = useRef<number>(Date.now());
  useEffect(() => {
    // A hacky way to prevent tiles from animating when the puzzle is first
    // loaded (there are some mutations that occur on load)
    if (Date.now() - initialMountTime.current < 500) return;
    if (
      prevValue.current === 'empty' &&
      tile.value !== 'empty' &&
      tile.value !== 'black'
    )
      setAnimating(true);
    const timeoutId = setTimeout(() => setAnimating(false), TILE_ANIMATION_MS);
    return () => clearTimeout(timeoutId);
  }, [tile.value]);

  const tileComponent = (
    <div
      key={columnIndex}
      className={
        'tile' +
        (tile.value === 'black' ? ' tile--black' : '') +
        (selectionIndex >= 0 ? ' tile--selected' : '') +
        (wordLocationOptions ? ' tile--option' : '') +
        (primarySelection ? ' tile--primary-selected' : '') +
        (animating ? ' tile--animating' : '')
      }
      style={{
        ...(draggedWordLetterIndex >= 0
          ? { backgroundColor: colors.yellow[300] }
          : tile.value !== 'black' && element
          ? {
              backgroundColor:
                tile.value === 'empty' && element.options.length >= 1
                  ? `rgba(25, 118, 210, ${(3.3 - element.entropy) / 3.3})`
                  : wrongLetter
                  ? colors.red[200]
                  : someWrongLetter && element.options.length === 0
                  ? 'white'
                  : element.options.length === 0
                  ? colors.red[200]
                  : 'white',
            }
          : {}),
        cursor: wordLocationOptions || primarySelection ? 'pointer' : 'initial',
      }}
      onMouseOver={mkHandleMouseoverTile(rowIndex, columnIndex)}
      onClick={mkHandleClickTile(rowIndex, columnIndex)}
    >
      {secondaryHighlight && (
        <div className="tile-highlight tile-highlight--secondary tile--diagonal-lines" />
      )}
      {tile.value === 'empty' &&
        someWrongLetter &&
        element &&
        element.options.length === 0 && (
          <div className="tile-highlight tile--gray tile--diagonal-lines" />
        )}
      {hovered && (
        <div
          className="tile-highlight"
          style={{ backgroundColor: colors.yellow[300] }}
        />
      )}
      <div className="tile-contents">
        {showTileLetterOptions && element ? (
          <TileLetterOptions options={element.options} />
        ) : (
          tileValue
        )}
      </div>
      {tileNumber && !showTileLetterOptions && (
        <div className="tile-number">{tileNumber}</div>
      )}
    </div>
  );

  if (primarySelection && selectedTilesState)
    return (
      <Tooltip
        title={`Switch to ${
          selectedTilesState.direction === 'across' ? 'down' : 'across'
        }`}
        placement="top"
        arrow
        disableInteractive
      >
        {tileComponent}
      </Tooltip>
    );
  return tileComponent;
}
const MemoizedTile = React.memo(Tile);

interface Props {
  puzzle: CrosswordPuzzleType;
  wave: WaveType | null;
  tileNumbers: TileNumbersType;
  selectedTilesState: SelectedTilesStateType | null;
  wordLocationsGrid: WordLocationsGridType | null;
  hoveredTile: LocationType | null;
  draggedWord: string | null;
  mkHandleClickTile: (
    row: number,
    column: number,
    hoveredTile: LocationType | null
  ) => (event) => void;
  mkHandleMouseoverTile: (row: number, column: number) => () => void;
  onMouseOut: () => void;
}

export default function Tiles({
  puzzle,
  wave,
  tileNumbers,
  selectedTilesState,
  wordLocationsGrid,
  hoveredTile,
  draggedWord,
  mkHandleClickTile,
  mkHandleMouseoverTile,
  onMouseOut,
}: Props) {
  const hoveredTiles: LocationType[] = useMemo(
    () =>
      (draggedWord &&
        hoveredTile &&
        wordLocationsGrid &&
        (wordLocationsGrid[hoveredTile.row][hoveredTile.column].across ||
          wordLocationsGrid[hoveredTile.row][hoveredTile.column].down)) ||
      [],
    [draggedWord, hoveredTile, wordLocationsGrid]
  );
  const someWrongLetter: boolean = useMemo(() => {
    if (!wave) return false;
    return _.some(
      _.flatten(wave.elements),
      (element) =>
        !element.solid &&
        puzzle.tiles[element.row][element.column].value !== 'empty' &&
        !_.includes(
          element.options,
          puzzle.tiles[element.row][element.column].value
        )
    );
  }, [wave, puzzle]);
  const scale = puzzle.size === 15 ? 1 : puzzle.size === 10 ? 3 / 2 : 3;

  // Make special cases for handling clicking tiles so that we can make use of
  // memoizing the tile components (reduces render time from ~14ms to ~7ms)
  const mkHandleClickHoveredTile = useCallback(
    (rowIndex, columnIndex) =>
      mkHandleClickTile(rowIndex, columnIndex, hoveredTile),
    [mkHandleClickTile, hoveredTile]
  );
  const mkHandleClickNormalTile = useCallback(
    (rowIndex, columnIndex) => mkHandleClickTile(rowIndex, columnIndex, null),
    [mkHandleClickTile]
  );

  return (
    <div
      className="tiles-scale-container"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      <div className="tiles-container" onMouseOut={onMouseOut}>
        {_.map(puzzle.tiles, (row, rowIndex) => (
          <div key={rowIndex} className="puzzle-row">
            {_.map(row, (tile, columnIndex) => (
              <MemoizedTile
                key={columnIndex}
                wave={wave}
                tileNumbers={tileNumbers}
                selectedTilesState={selectedTilesState}
                wordLocationsGrid={wordLocationsGrid}
                hovered={
                  !!hoveredTile &&
                  hoveredTile.row === rowIndex &&
                  hoveredTile.column === columnIndex
                }
                draggedWord={draggedWord}
                mkHandleClickTile={
                  !!hoveredTile &&
                  hoveredTile.row === rowIndex &&
                  hoveredTile.column === columnIndex
                    ? mkHandleClickHoveredTile
                    : mkHandleClickNormalTile
                }
                mkHandleMouseoverTile={mkHandleMouseoverTile}
                draggedWordLetterIndex={_.findIndex(
                  hoveredTiles,
                  (tile) => tile.row === rowIndex && tile.column === columnIndex
                )}
                someWrongLetter={someWrongLetter}
                tile={tile}
                rowIndex={rowIndex}
                columnIndex={columnIndex}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
