import _ from 'lodash';
import { Input, List, ListItem, ListSubheader } from '@mui/material';
import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  CrosswordPuzzleType,
  initClueGrid,
  selectClueGrid,
  setClue,
  TileType,
} from './builderSlice';
import { LocationType } from './CrosswordBuilder';
import { DirectionType, SelectedTilesStateType } from './useTileSelection';

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

export type TileNumbersType = (number | null)[][];
interface ClueDataType {
  tileNumbers: TileNumbersType;
}

export function useClueData(puzzle: CrosswordPuzzleType): ClueDataType {
  const cachedPuzzle = useRef<CrosswordPuzzleType>(puzzle);
  const cachedTileNumbers = useRef<(number | null)[][]>(
    computeTileNumbers(puzzle)
  );
  const tileNumbers = useMemo(() => {
    // Return if the black tiles haven't changed (unless the puzzle has changed
    // size)
    if (
      cachedPuzzle.current.size === puzzle.size &&
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
export interface AnswerGridCellType {
  across: AnswerType | null;
  down: AnswerType | null;
}
export function getAnswerGrid(
  puzzle: CrosswordPuzzleType
): AnswerGridCellType[][] {
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
                ? '-'
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
                ? '-'
                : puzzle.tiles[rowIndex + index][columnIndex].value
          ),
          ''
        );

      return {
        across: acrossWord
          ? {
              word: acrossWord,
              complete: !_.includes(acrossWord, '-'),
            }
          : null,
        down: downWord
          ? {
              word: downWord,
              complete: !_.includes(downWord, '-'),
            }
          : null,
      };
    })
  );
}

export interface AnswerEntryType {
  row: number;
  column: number;
  direction: 'across' | 'down';
  answer: AnswerType;
}

export function getFlattenedAnswers(
  puzzle: CrosswordPuzzleType
): AnswerEntryType[] {
  // Returns a list of answer entries, first across, then down
  const answerGrid = getAnswerGrid(puzzle);
  return _.sortBy(
    _.compact(
      _.flatMap(answerGrid, (row, rowIndex) =>
        _.flatMap(row, (answer, columnIndex) => [
          answer.across && {
            row: rowIndex,
            column: columnIndex,
            answer: answer.across,
            direction: 'across',
          },
          answer.down && {
            row: rowIndex,
            column: columnIndex,
            answer: answer.down,
            direction: 'down',
          },
        ])
      )
    ),
    'direction'
  );
}

function AnswerListItem({
  tileNumber,
  answer,
  value,
  onChange,
  selected,
  setSelected,
  selectNext,
}: {
  tileNumber: number;
  answer: AnswerType;
  value: string;
  onChange: (event: any) => void;
  selected: boolean;
  setSelected: () => void;
  selectNext: () => void;
}) {
  const inputRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (selected && inputRef.current) inputRef.current.focus();
  }, [selected]);

  return (
    <ListItem style={{ paddingTop: 1, paddingBottom: 1 }} onClick={setSelected}>
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
      <div style={{ width: 130 }}>
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
        style={{ minHeight: 32 }}
        multiline
        inputRef={(ref) => {
          inputRef.current = ref;
        }}
        value={value}
        onChange={onChange}
        onFocus={() => !selected && setSelected()}
        onKeyPress={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            selectNext();
          }
        }}
      />
    </ListItem>
  );
}

interface Props {
  puzzle: CrosswordPuzzleType;
  tileNumbers: TileNumbersType;
  updateSelection: (
    primaryLocation: LocationType,
    direction?: DirectionType
  ) => void;
  selectedTilesState: SelectedTilesStateType | null;
}
function ClueEntry({
  puzzle,
  tileNumbers,
  updateSelection,
  selectedTilesState,
}: Props) {
  // TODO: Optimize this by not updating the answers if the black tiles haven't
  // changed
  const flattenedAnswers: AnswerEntryType[] = useMemo(
    () => getFlattenedAnswers(puzzle),
    [puzzle]
  );

  const dispatch = useDispatch();
  const clueGrid = useSelector(selectClueGrid);

  const selectAnswer = (direction, row, column, answer) =>
    updateSelection({ row, column }, direction);

  // Resize the clue grid if the puzzle size has changed. This can happen when
  // traversing history--only puzzle and wave are included there.
  useEffect(() => {
    if (clueGrid && clueGrid.length !== puzzle.tiles.length)
      dispatch(initClueGrid({ size: puzzle.tiles.length }));
  }, [dispatch, clueGrid, puzzle.tiles.length]);

  if (!clueGrid || clueGrid.length !== puzzle.tiles.length) return null;
  return (
    <List
      sx={{
        width: '100%',
        overflow: 'auto',
        maxHeight: 540,
        '& ul': { padding: 0 },
      }}
      subheader={<li />}
    >
      <li>
        <ul>
          {_.map(['across', 'down'], (currentDirection) => (
            <div key={currentDirection}>
              <ListSubheader>{_.capitalize(currentDirection)}</ListSubheader>
              {_.map(
                flattenedAnswers,
                (
                  { row, column, answer, direction: answerDirection },
                  index
                ) => {
                  if (
                    currentDirection !== answerDirection ||
                    !tileNumbers[row][column]
                  )
                    return null;
                  const selectedTileLocations =
                    selectedTilesState?.locations || [];
                  return (
                    <AnswerListItem
                      key={`answer-${row}-${column}`}
                      tileNumber={tileNumbers[row][column] || 999}
                      answer={answer}
                      value={clueGrid[row][column][currentDirection] || ''}
                      onChange={(event) =>
                        dispatch(
                          setClue({
                            row,
                            column,
                            direction: currentDirection,
                            value: event.target.value,
                          })
                        )
                      }
                      selected={
                        selectedTileLocations.length > 1 &&
                        currentDirection ===
                          (selectedTileLocations[1].row >
                          selectedTileLocations[0].row
                            ? 'down'
                            : 'across') &&
                        row === selectedTileLocations[0].row &&
                        column === selectedTileLocations[0].column
                      }
                      setSelected={() =>
                        selectAnswer(answerDirection, row, column, answer)
                      }
                      selectNext={() => {
                        const {
                          direction,
                          row,
                          column,
                          answer,
                        } = flattenedAnswers[
                          (index + 1) % flattenedAnswers.length
                        ];
                        selectAnswer(direction, row, column, answer);
                      }}
                    />
                  );
                }
              )}
            </div>
          ))}
        </ul>
      </li>
    </List>
  );
}

export default React.memo(ClueEntry);
