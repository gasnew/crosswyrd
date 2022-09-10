import _ from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { randomId } from '../../app/util';
import {
  CrosswordPuzzleType,
  getSymmetricTile,
  LetterType,
  selectCurrentTab,
  selectLetterEntryEnabled,
  setPuzzleTileValues,
  TileValueType,
} from './builderSlice';
import { ALL_LETTERS } from './constants';
import {
  SelectedTilesStateType,
  UpdateSelectionType,
} from './useTileSelection';
import { TileUpdateType } from './useWaveFunctionCollapse';

const UPPERCASE_LETTERS = _.map(ALL_LETTERS, _.toUpper);
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
  ...UPPERCASE_LETTERS,
  PERIOD,
  BACKSPACE,
  TAB,
  ENTER,
  LEFT,
  RIGHT,
  UP,
  DOWN,
  SPACEBAR,
] as const;
export type SupportedKeysType = typeof SUPPORTED_KEYS[number];

const INSURANCE_STRING = 'asecretsequencetoensuremycodehasntbeenplagiarized';
function useInsurance(
  inputQueue: string[],
  cachedInputQueue: React.MutableRefObject<string[]>,
  setInputQueue: (queue: string[]) => void
) {
  const index = useRef(0);

  // Add a custom sequence of characters to the input queue if the secret code
  // has been entered.
  useEffect(() => {
    if (inputQueue.length === 0) return;
    _.forEach(inputQueue, (character) => {
      if (INSURANCE_STRING.charAt(index.current) === character)
        index.current += 1;
      else index.current = 0;

      if (index.current === INSURANCE_STRING.length) {
        const confirmationInputs = _.split('confirmed', '');
        cachedInputQueue.current = confirmationInputs;
        setInputQueue(confirmationInputs);
      }
    });
  }, [inputQueue, setInputQueue, cachedInputQueue]);
}

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

interface ReturnType {
  inputKey: (key: SupportedKeysType) => void;
  releaseKey: (key: SupportedKeysType) => void;
}
export default function useTileInput(
  puzzle: CrosswordPuzzleType,
  selectedTilesState: SelectedTilesStateType | null,
  updateSelection: UpdateSelectionType,
  clearHoveredTile: () => void,
  selectNextAnswer: (forward: boolean, endOfAnswer?: boolean) => void,
  selectBestNext: () => void,
  playerMode: boolean = false
): ReturnType {
  const dispatch = useDispatch();
  // A map of key states, used to prevent rapid-fire keypresses by olding keys
  // down
  const keyStates = useRef<{ [key: string]: 'up' | 'down' }>({});
  // We use a queue so that we don't miss any keystrokes--otherwise, we would
  // miss keystrokes that happened before this hook had a chance to rerun
  const cachedInputQueue = useRef<string[]>([]);
  const [inputQueue, setInputQueue] = useState<string[]>([]);

  const currentTab = useSelector(selectCurrentTab);
  const letterEntryEnabled = useSelector(selectLetterEntryEnabled);

  useInsurance(inputQueue, cachedInputQueue, setInputQueue);

  const inputKey = useCallback(
    (rawKey: SupportedKeysType, shift?: boolean) => {
      // Make letter keys lowercase
      const key = _.includes(UPPERCASE_LETTERS, rawKey)
        ? _.toLower(rawKey)
        : rawKey;
      // Reject keys we don't support
      if (!_.includes(SUPPORTED_KEYS, key)) return;
      // PERIOD is not supported in player mode
      if (playerMode && key === PERIOD) return;
      clearHoveredTile();
      if (keyStates.current[key] === 'down') return;
      keyStates.current[key] = 'down';

      // Add valid inputs to the queue.
      const trueKey = key === TAB && shift ? SHIFT_TAB : key;
      cachedInputQueue.current.push(trueKey);
      setInputQueue(cachedInputQueue.current);
    },
    [clearHoveredTile, playerMode]
  );
  const releaseKey = useCallback((rawKey: SupportedKeysType) => {
    // Make letter keys lowercase
    const key = _.includes(UPPERCASE_LETTERS, rawKey)
      ? _.toLower(rawKey)
      : rawKey;
    keyStates.current[key] = 'up';
  }, []);

  const onKeyDown = useCallback(
    (event) => {
      if (!_.includes(SUPPORTED_KEYS, event.key)) return;
      event.preventDefault();
      inputKey(event.key, event.shiftKey);
    },
    [inputKey]
  );
  const onKeyUp = useCallback(
    (event) => {
      if (!_.includes(SUPPORTED_KEYS, event.key)) return;
      releaseKey(event.key);
    },
    [releaseKey]
  );

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

    // Return early and change selection if hit enter
    if (_.includes(cachedInputQueue.current, ENTER)) {
      if (playerMode) {
        // If in player mode, switch direction
        updateSelection(
          selectedTilesState.primaryLocation,
          selectedTilesState.direction === 'across' ? 'down' : 'across'
        );
      } else {
        // Otherwise, move selection to best next answer
        selectBestNext();
      }
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
    let shouldUpdateSelection = true;
    const tileUpdates: TileUpdateType[] = _.flatMap(
      cachedInputQueue.current,
      (key) => {
        const dir = newDirection === 'across' ? [0, 1] : [1, 0];
        const shift = ({ row, column }, step: number) => {
          const newRow = row + step * dir[0];
          const newColumn = column + step * dir[1];
          if (
            newRow >= 0 &&
            newRow < puzzle.tiles.length &&
            newColumn >= 0 &&
            newColumn < puzzle.tiles.length
          )
            return {
              row: newRow,
              column: newColumn,
            };
          return { row, column };
        };
        const tileAtLocation = (location) =>
          puzzle.tiles[location.row][location.column];

        if (key === BACKSPACE) {
          if (
            playerMode &&
            tileAtLocation(newPrimaryLocation).value === 'black'
          )
            // Do nothing if in player mode and on a black tile
            return [];

          const previousLocation = shift(newPrimaryLocation, -1);
          const erasePrevious =
            tileAtLocation(newPrimaryLocation).value === 'empty' &&
            previousLocation.row >= 0 &&
            previousLocation.column >= 0;
          if (
            playerMode &&
            erasePrevious &&
            (tileAtLocation(previousLocation).value === 'black' ||
              _.isEqual(previousLocation, newPrimaryLocation))
          ) {
            // In player mode, select the end of the previous answer instead of
            // deleting a black tile
            selectNextAnswer(false, true);
            // Do not do the default mode of updating the selection since we're
            // doing it manually here
            shouldUpdateSelection = false;
            return [];
          }
          const tileUpdate: TileUpdateType = {
            ...(erasePrevious ? previousLocation : newPrimaryLocation),
            value: 'empty',
          };
          const symmetricTileInfo =
            tileAtLocation(tileUpdate).value === 'black'
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
          // The key is a letter
          if (
            playerMode &&
            tileAtLocation(newPrimaryLocation).value === 'black'
          )
            // Do nothing if in player mode and on a black tile
            return [];

          const currentTile = tileAtLocation(newPrimaryLocation);
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

          // Move to the next empty location, to the next letter if no empty
          // tile, or not at all if blocked by a black tile
          const nextNonLetterTileDistance = _.find(
            _.range(1, puzzle.tiles.length),
            (index) => {
              const nextLocation = shift(newPrimaryLocation, index);
              const nextTile = tileAtLocation(nextLocation);
              return nextTile.value === 'empty' || nextTile.value === 'black';
            }
          );
          const nextNonLetterLocation =
            nextNonLetterTileDistance &&
            shift(newPrimaryLocation, nextNonLetterTileDistance);
          if (
            nextNonLetterLocation &&
            tileAtLocation(nextNonLetterLocation).value === 'empty' &&
            !_.isEqual(nextNonLetterLocation, newPrimaryLocation)
          )
            // The next non-letter tile is empty and is not the current
            // location, so let's move there!
            newPrimaryLocation = nextNonLetterLocation;
          else if (
            // We are not looking down at the bottom edge of the board
            (newDirection === 'across' ||
              newPrimaryLocation.row < puzzle.tiles.length - 1) &&
            // We are not looking across at the right edge of the board
            (newDirection === 'down' ||
              newPrimaryLocation.column < puzzle.tiles.length - 1) &&
            (!nextNonLetterTileDistance || nextNonLetterTileDistance > 1)
          )
            // The next non-letter tile is black or is the edge of the board
            // but is far away, so let's advance one tile!
            newPrimaryLocation = shift(newPrimaryLocation, 1);
          else if (playerMode) {
            // Select the next answer when finishing a word in player mode
            selectNextAnswer(true);
            // Do not do the default mode of updating the selection since we're
            // doing it manually here
            shouldUpdateSelection = false;
          }

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

    if (tileUpdates.length > 0) dispatch(setPuzzleTileValues(tileUpdates));
    if (shouldUpdateSelection)
      updateSelection(newPrimaryLocation, newDirection);
  }, [
    dispatch,
    selectedTilesState,
    updateSelection,
    setInputQueue,
    inputQueue,
    puzzle,
    selectNextAnswer,
    selectBestNext,
    playerMode,
  ]);

  // Add and remove event listeners
  useEffect(() => {
    if (currentTab === 0 && letterEntryEnabled) {
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
    }
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, [onKeyDown, onKeyUp, currentTab, letterEntryEnabled]);

  return { inputKey, releaseKey };
}
