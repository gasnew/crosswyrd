import _ from 'lodash';
import {
  Input,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
} from '@mui/material';
import React, { useMemo, useRef, useState } from 'react';

import { CrosswordPuzzleType, TileType } from './builderSlice';
import { LocationType } from './CrosswordBuilder';

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

interface AnswerType {
  word: string;
  complete: boolean;
}
interface AnswerGridCellType {
  across: AnswerType | null;
  down: AnswerType | null;
}
function getAnswerGrid(puzzle: CrosswordPuzzleType): AnswerGridCellType[][] {
  // Returns a list of all answers on the board
  const solid = (tile: TileType): boolean => !tile || tile.value === 'black';
  return _.map(puzzle.tiles, (row, rowIndex) =>
    _.map(row, (tile, columnIndex) => {
      const leftTile = puzzle.tiles[rowIndex]?.[columnIndex - 1];
      const aboveTile = puzzle.tiles?.[rowIndex - 1]?.[columnIndex];
      const acrossWord =
        solid(leftTile) &&
        _.join(
          _.map(
            _.takeWhile(
              _.range(puzzle.tiles.length),
              (index) => !solid(puzzle.tiles[rowIndex]?.[columnIndex + index])
            ),
            (index) =>
              puzzle.tiles[rowIndex][columnIndex + index].value === 'empty'
                ? '?'
                : puzzle.tiles[rowIndex][columnIndex + index].value
          ),
          ''
        );
      const downWord =
        solid(aboveTile) &&
        _.join(
          _.map(
            _.takeWhile(
              _.range(puzzle.tiles.length),
              (index) => !solid(puzzle.tiles[rowIndex + index]?.[columnIndex])
            ),
            (index) =>
              puzzle.tiles[rowIndex + index][columnIndex].value === 'empty'
                ? '?'
                : puzzle.tiles[rowIndex + index][columnIndex].value
          ),
          ''
        );

      return {
        across: acrossWord
          ? {
              word: acrossWord,
              complete: !_.includes(acrossWord, '?'),
            }
          : null,
        down: downWord
          ? {
              word: downWord,
              complete: !_.includes(downWord, '?'),
            }
          : null,
      };
    })
  );
}

function AnswerListItem({
  tileNumber,
  answer,
  selected,
  setSelected,
  selectNext,
}: {
  tileNumber: number;
  answer: AnswerType;
  selected: boolean;
  setSelected: () => void;
  selectNext: () => void;
}) {
  return (
    <ListItem onClick={setSelected}>
      <div
        style={{
          width: 20,
          textAlign: 'right',
          fontWeight: selected ? 'bold' : 'initial',
        }}
      >
        {tileNumber}.
      </div>
      &nbsp;
      <div style={{ width: 120 }}>
        <span
          style={{
            backgroundColor: answer.complete ? 'initial' : 'yellow',
            fontWeight: selected ? 'bold' : 'initial',
          }}
        >
          {_.toUpper(answer.word)}
        </span>
      </div>
      &nbsp;
      <Input
        multiline
        autoFocus={selected}
        onKeyPress={(event) => {
          if (event.key === 'Enter') selectNext();
        }}
      />
    </ListItem>
  );
}

interface Props {
  puzzle: CrosswordPuzzleType;
  tileNumbers: TileNumbersType;
}
function ClueEntry({ puzzle, tileNumbers }: Props) {
  const [selectedLocation, setSelectedLocation] = useState<LocationType | null>(
    null
  );

  const answerGrid = useMemo(() => getAnswerGrid(puzzle), [puzzle]);
  const flattenedAnswers: {
    row: number;
    column: number;
    answer: AnswerGridCellType;
  }[] = useMemo(
    () =>
      _.compact(
        _.flatMap(answerGrid, (row, rowIndex) =>
          _.flatMap(
            row,
            (answer, columnIndex) =>
              (answer.across || answer.down) && {
                row: rowIndex,
                column: columnIndex,
                answer,
              }
          )
        )
      ),
    [answerGrid]
  );

  return (
    <List
      sx={{
        width: '100%',
        overflow: 'auto',
        maxHeight: 500,
        '& ul': { padding: 0 },
      }}
      subheader={<li />}
    >
      <li>
        <ul>
          {_.map(['across', 'down'], (direction) => (
            <div key={direction}>
              <ListSubheader>{_.capitalize(direction)}</ListSubheader>
              {_.map(flattenedAnswers, ({ row, column, answer }) =>
                answer[direction] && tileNumbers[row][column] ? (
                  <AnswerListItem
                    key={`answer-${row}-${column}`}
                    tileNumber={tileNumbers[row][column] || 999}
                    answer={answer[direction]}
                    selected={
                      !!selectedLocation &&
                      row === selectedLocation.row &&
                      column === selectedLocation.column
                    }
                    setSelected={() =>
                      setSelectedLocation({
                        row: row,
                        column: column,
                      })
                    }
                    selectNext={() => null}
                  />
                ) : null
              )}
            </div>
          ))}
        </ul>
      </li>
    </List>
  );
}

export default React.memo(ClueEntry);
