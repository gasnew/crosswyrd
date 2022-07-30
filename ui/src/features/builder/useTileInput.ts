import _ from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { randomId } from '../../app/util';
import {
  CrosswordPuzzleType,
  getSymmetricTile,
  LetterType,
  selectCurrentTab,
  setPuzzleTileValues,
  TileValueType,
} from './builderSlice';
import { ALL_LETTERS, PUZZLE_SIZE } from './constants';
import {
  SelectedTilesStateType,
  UpdateSelectionWithPuzzleType,
} from './useTileSelection';
import { TileUpdateType } from './useWaveFunctionCollapse';

const PERIOD = '.';
const BACKSPACE = 'Backspace';
const TAB = 'Tab';
const SHIFT_TAB = 'ShiftTab';
const ENTER = 'Enter';
const LEFT = 'ArrowLeft';
const RIGHT = 'ArrowRight';
const UP = 'ArrowUp';
const DOWN = 'ArrowDown';
const SPACEBAR = ' ';
const SUPPORTED_KEYS = [
  ...ALL_LETTERS,
  PERIOD,
  BACKSPACE,
  TAB,
  ENTER,
  LEFT,
  RIGHT,
  UP,
  DOWN,
  SPACEBAR,
];

export function withPuzzleTileUpdates(
  puzzle: CrosswordPuzzleType,
  tileUpdates: TileUpdateType[],
  version?: string
): CrosswordPuzzleType {
  const newPuzzle = {
    ...puzzle,
    tiles: _.map(puzzle.tiles, (row) => _.map(row, (tile) => ({ ...tile }))),
    version: version || randomId(),
  };
  _.forEach(tileUpdates, ({ row, column, value }) => {
    newPuzzle.tiles[row][column].value = value;
  });
  return newPuzzle;
}

export default function useTileInput(
  puzzle: CrosswordPuzzleType,
  selectedTilesState: SelectedTilesStateType | null,
  updateSelectionWithPuzzle: UpdateSelectionWithPuzzleType,
  clearHoveredTile: () => void,
  selectNextAnswer: (forward: boolean) => void,
  selectBestNext: () => void
) {
  const dispatch = useDispatch();
  // A map of key states, used to prevent rapid-fire keypresses by olding keys
  // down
  const keyStates = useRef<{ [key: string]: 'up' | 'down' }>({});
  // We use a queue so that we don't miss any keystrokes--otherwise, we would
  // miss keystrokes that happened before this hook had a chance to rerun
  const cachedInputQueue = useRef<string[]>([]);
  const [inputQueue, setInputQueue] = useState<string[]>([]);

  const currentTab = useSelector(selectCurrentTab);

  const onKeyDown = useCallback(
    (event) => {
      if (!_.includes(SUPPORTED_KEYS, event.key)) return;
      event.preventDefault();
      clearHoveredTile();
      if (keyStates.current[event.key] === 'down') return;
      keyStates.current[event.key] = 'down';

      // Add valid inputs to the queue.
      const key = event.key === TAB && event.shiftKey ? SHIFT_TAB : event.key;
      cachedInputQueue.current.push(key);
      setInputQueue(cachedInputQueue.current);
    },
    [setInputQueue, clearHoveredTile]
  );
  const onKeyUp = useCallback((event) => {
    keyStates.current[event.key] = 'up';
  }, []);

  // Churn through queue
  useEffect(() => {
    if (!selectedTilesState || cachedInputQueue.current.length === 0) {
      cachedInputQueue.current = [];
      if (inputQueue.length > 0) setInputQueue([]);
      return;
    }

    const cleanUp = () => {
      cachedInputQueue.current = [];
      setInputQueue(cachedInputQueue.current);
    };

    // Return early and move selection if hit enter
    if (_.includes(cachedInputQueue.current, ENTER)) {
      selectBestNext();
      cleanUp();
      return;
    }

    // Return early and move selection if tabbing
    if (
      _.includes(cachedInputQueue.current, TAB) ||
      _.includes(cachedInputQueue.current, SHIFT_TAB)
    ) {
      selectNextAnswer(_.includes(cachedInputQueue.current, TAB));
      cleanUp();
      return;
    }

    let newPrimaryLocation = selectedTilesState.primaryLocation;
    let newDirection = selectedTilesState.direction;
    const tileUpdates: TileUpdateType[] = _.flatMap(
      cachedInputQueue.current,
      (key) => {
        const dir = newDirection === 'across' ? [0, 1] : [1, 0];
        const shift = ({ row, column }, step: number) => {
          const newRow = row + step * dir[0];
          const newColumn = column + step * dir[1];
          if (
            newRow >= 0 &&
            newRow < PUZZLE_SIZE &&
            newColumn >= 0 &&
            newColumn < PUZZLE_SIZE
          )
            return {
              row: newRow,
              column: newColumn,
            };
          return { row, column };
        };

        if (key === BACKSPACE) {
          const previousLocation = shift(newPrimaryLocation, -1);
          const erasePrevious =
            puzzle.tiles[newPrimaryLocation.row][newPrimaryLocation.column]
              .value === 'empty' &&
            previousLocation.row >= 0 &&
            previousLocation.column >= 0;
          const tileUpdate: TileUpdateType = {
            ...(erasePrevious ? previousLocation : newPrimaryLocation),
            value: 'empty',
          };
          const symmetricTileInfo =
            puzzle.tiles[tileUpdate.row][tileUpdate.column].value === 'black'
              ? getSymmetricTile(puzzle, tileUpdate.row, tileUpdate.column)
              : null;

          if (erasePrevious) newPrimaryLocation = shift(newPrimaryLocation, -1);
          return [
            tileUpdate,
            // Erase symmetric black tile if applicable
            ...(symmetricTileInfo
              ? [
                  {
                    value: 'empty' as TileValueType,
                    row: symmetricTileInfo.row,
                    column: symmetricTileInfo.column,
                  },
                ]
              : []),
          ];
        } else if (key === LEFT) {
          if (newDirection === 'down') newDirection = 'across';
          else newPrimaryLocation = shift(newPrimaryLocation, -1);
          return [];
        } else if (key === RIGHT) {
          if (newDirection === 'down') newDirection = 'across';
          else newPrimaryLocation = shift(newPrimaryLocation, 1);
          return [];
        } else if (key === UP) {
          if (newDirection === 'across') newDirection = 'down';
          else newPrimaryLocation = shift(newPrimaryLocation, -1);
          return [];
        } else if (key === DOWN) {
          if (newDirection === 'across') newDirection = 'down';
          else newPrimaryLocation = shift(newPrimaryLocation, 1);
          return [];
        } else if (key === SPACEBAR) {
          newPrimaryLocation = shift(newPrimaryLocation, 1);
          return [];
        } else {
          const currentTile =
            puzzle.tiles[newPrimaryLocation.row][newPrimaryLocation.column];
          const tileUpdate: TileUpdateType = {
            ...newPrimaryLocation,
            value:
              key === PERIOD
                ? currentTile.value === 'black'
                  ? 'empty'
                  : 'black'
                : (key as LetterType),
          };
          const symmetricTileInfo =
            tileUpdate.value === 'black' || currentTile.value === 'black'
              ? getSymmetricTile(
                  puzzle,
                  newPrimaryLocation.row,
                  newPrimaryLocation.column
                )
              : null;

          const nextLocation = shift(newPrimaryLocation, 1);
          if (
            puzzle.tiles[nextLocation.row][nextLocation.column].value !==
            'black'
          )
            newPrimaryLocation = nextLocation;

          return [
            tileUpdate,
            // Add symmetric black tile if applicable
            ...(symmetricTileInfo
              ? [
                  {
                    value:
                      tileUpdate.value === 'black'
                        ? 'black'
                        : ('empty' as TileValueType),
                    row: symmetricTileInfo.row,
                    column: symmetricTileInfo.column,
                  },
                ]
              : []),
          ];
        }
      }
    );
    cleanUp();

    dispatch(setPuzzleTileValues(tileUpdates));
    // TODO: Just use updateSelection?
    updateSelectionWithPuzzle(
      withPuzzleTileUpdates(puzzle, tileUpdates),
      newPrimaryLocation,
      newDirection
    );
  }, [
    dispatch,
    selectedTilesState,
    updateSelectionWithPuzzle,
    setInputQueue,
    inputQueue,
    puzzle,
    selectNextAnswer,
    selectBestNext,
  ]);

  // Add and remove event listeners
  useEffect(() => {
    if (currentTab === 0) {
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
    }
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, [onKeyDown, onKeyUp, currentTab]);
}
