import _ from 'lodash';
import { colors } from '@mui/material';
import React, { useMemo } from 'react';

import { CrosswordPuzzleType } from './builderSlice';
import { TileNumbersType } from './ClueEntry';
import { LocationType } from './CrosswordBuilder';
import TileLetterOptions from './TileLetterOptions';
import { SelectedTilesStateType } from './useTileSelection';
import { WaveType } from './useWaveFunctionCollapse';
import { WordLocationsGridType } from './WordBank';

interface Props {
  puzzle: CrosswordPuzzleType;
  wave: WaveType | null;
  tileNumbers: TileNumbersType;
  selectedTilesState: SelectedTilesStateType | null;
  wordLocationsGrid: WordLocationsGridType | null;
  hoveredTile: LocationType | null;
  draggedWord: string | null;
  mkHandleClickTile: (row: number, column: number) => (event) => void;
  mkHandleMouseoverTile: (row: number, column: number) => () => void;
  onMouseOut: () => void;
}

// TODO: memoize each tile
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

  return (
    <div className="tiles-container" onMouseOut={onMouseOut}>
      {_.map(puzzle.tiles, (row, rowIndex) => (
        <div key={rowIndex} className="puzzle-row">
          {_.map(row, (tile, columnIndex) => {
            const selectionIndex = _.findIndex(
              selectedTilesState?.locations || [],
              (location) =>
                location.row === rowIndex && location.column === columnIndex
            );
            const primarySelection =
              selectedTilesState?.primaryLocation?.row === rowIndex &&
              selectedTilesState?.primaryLocation?.column === columnIndex;
            // The word bank word location options this tile intersects
            const wordLocationOptions: LocationType[] | null =
              wordLocationsGrid &&
              (wordLocationsGrid[rowIndex][columnIndex].across ||
                wordLocationsGrid[rowIndex][columnIndex].down);
            const draggedWordLetterIndex = _.findIndex(
              hoveredTiles,
              (tile) => tile.row === rowIndex && tile.column === columnIndex
            );
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
            const hovered =
              hoveredTile &&
              hoveredTile.row === rowIndex &&
              hoveredTile.column === columnIndex;
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

            return (
              <div
                key={columnIndex}
                className={
                  'tile' +
                  (tile.value === 'black' ? ' tile--black' : '') +
                  (selectionIndex >= 0 ? ' tile--selected' : '') +
                  (wordLocationOptions ? ' tile--option' : '') +
                  (primarySelection ? ' tile--primary-selected' : '')
                }
                style={{
                  ...(draggedWordLetterIndex >= 0
                    ? { backgroundColor: colors.yellow[300] }
                    : tile.value !== 'black' && element
                    ? {
                        backgroundColor:
                          tile.value === 'empty' && element.options.length >= 1
                            ? `rgba(25, 118, 210, ${
                                (3.3 - element.entropy) / 3.3
                              })`
                            : wrongLetter
                            ? colors.red[200]
                            : someWrongLetter && element.options.length === 0
                            ? 'white'
                            : element.options.length === 0
                            ? colors.red[200]
                            : 'white',
                      }
                    : {}),
                  cursor: wordLocationOptions ? 'pointer' : 'initial',
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
          })}
        </div>
      ))}
    </div>
  );
}
