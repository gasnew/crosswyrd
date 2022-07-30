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
  clearHoveredTile: () => void
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
      // TODO: Replace tab usage here with moving between clues with tab
      if (!_.includes([...ALL_LETTERS, '.', 'Backspace', 'Tab'], event.key))
        return;
      event.preventDefault();
      clearHoveredTile();
      if (keyStates.current[event.key] === 'down') return;
      keyStates.current[event.key] = 'down';

      // Add valid inputs to the queue.
      const key =
        event.key === 'Tab' && event.shiftKey ? 'ShiftTab' : event.key;
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

    let newPrimaryLocation = selectedTilesState.primaryLocation;
    const dir = selectedTilesState.direction === 'across' ? [0, 1] : [1, 0];
    const shift = ({ row, column }, step: number) => ({
      row: row + step * dir[0],
      column: column + step * dir[1],
    });
    const tileUpdates: TileUpdateType[] = _.flatMap(
      cachedInputQueue.current,
      (key) => {
        if (key === 'Backspace') {
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
        } else if (key === 'Tab') {
          //if (primaryIndex < selectedTilesState.locations.length - 1)
          //primaryIndex += 1;
          return [];
        } else if (key === 'ShiftTab') {
          //if (primaryIndex > 0) primaryIndex -= 1;
          return [];
        } else {
          const tileUpdate: TileUpdateType = {
            ...newPrimaryLocation,
            value: key === '.' ? 'black' : (key as LetterType),
          };
          const symmetricTileInfo =
            tileUpdate.value === 'black'
              ? getSymmetricTile(
                  puzzle,
                  newPrimaryLocation.row,
                  newPrimaryLocation.column
                )
              : null;
          if (
            newPrimaryLocation.row <= PUZZLE_SIZE - 1 &&
            newPrimaryLocation.column <= PUZZLE_SIZE
          )
            newPrimaryLocation = shift(newPrimaryLocation, 1);
          return [
            tileUpdate,
            // Add symmetric black tile if applicable
            ...(symmetricTileInfo
              ? [
                  {
                    value: 'black' as TileValueType,
                    row: symmetricTileInfo.row,
                    column: symmetricTileInfo.column,
                  },
                ]
              : []),
          ];
        }
      }
    );
    cachedInputQueue.current = [];
    setInputQueue(cachedInputQueue.current);

    dispatch(setPuzzleTileValues(tileUpdates));
    updateSelectionWithPuzzle(withPuzzleTileUpdates(puzzle, tileUpdates));
  }, [
    dispatch,
    selectedTilesState,
    updateSelectionWithPuzzle,
    setInputQueue,
    inputQueue,
    puzzle,
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
