import _ from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import {
  CrosswordPuzzleType,
  LetterType,
  setPuzzleTileValues,
} from './builderSlice';
import { ALL_LETTERS } from './constants';
import {
  SelectedTilesStateType,
  SetNextPrimarySelectedTileType,
} from './useTileSelection';
import { TileUpdateType } from './useWaveFunctionCollapse';

export default function useTileInput(
  puzzle: CrosswordPuzzleType,
  selectedTilesState: SelectedTilesStateType | null,
  setNextPrimarySelectedTile: SetNextPrimarySelectedTileType
) {
  const dispatch = useDispatch();
  // A map of key states, used to prevent rapid-fire keypresses by olding keys
  // down
  const keyStates = useRef<{ [key: string]: 'up' | 'down' }>({});
  // We use a queue so that we don't miss any keystrokes--otherwise, we would
  // miss keystrokes that happened before this hook had a chance to rerun
  const cachedInputQueue = useRef<string[]>([]);
  const [inputQueue, setInputQueue] = useState<string[]>([]);

  const onKeyDown = useCallback(
    (event) => {
      // TODO: Replace tab usage here with moving between clues with tab
      if (!_.includes([...ALL_LETTERS, '.', 'Backspace', 'Tab'], event.key))
        return;
      event.preventDefault();
      if (keyStates.current[event.key] === 'down') return;
      keyStates.current[event.key] = 'down';

      // Add valid inputs to the queue.
      const key =
        event.key === 'Tab' && event.shiftKey ? 'ShiftTab' : event.key;
      cachedInputQueue.current.push(key);
      setInputQueue(cachedInputQueue.current);
    },
    [setInputQueue]
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

    let primaryIndex = selectedTilesState.primaryIndex;
    const tileUpdates = _.compact(
      _.map(cachedInputQueue.current, (key) => {
        if (key === 'Backspace') {
          const primaryTile = selectedTilesState.locations[primaryIndex];
          const erasePrevious =
            puzzle.tiles[primaryTile.row][primaryTile.column].value ===
              'empty' && primaryIndex > 0;
          const tileUpdate: TileUpdateType = {
            ...selectedTilesState.locations[
              erasePrevious ? primaryIndex - 1 : primaryIndex
            ],
            value: 'empty',
          };
          if (primaryIndex > 0 && erasePrevious) primaryIndex -= 1;
          return tileUpdate;
        } else if (key === 'Tab') {
          if (primaryIndex < selectedTilesState.locations.length - 1)
            primaryIndex += 1;
        } else if (key === 'ShiftTab') {
          if (primaryIndex > 0) primaryIndex -= 1;
        } else {
          const tileUpdate: TileUpdateType = {
            ...selectedTilesState.locations[primaryIndex],
            value: key === '.' ? 'black' : (key as LetterType),
          };
          if (primaryIndex < selectedTilesState.locations.length - 1)
            primaryIndex += 1;
          return tileUpdate;
        }
      })
    );
    cachedInputQueue.current = [];
    setInputQueue(cachedInputQueue.current);

    dispatch(setPuzzleTileValues(tileUpdates));
    setNextPrimarySelectedTile(primaryIndex - selectedTilesState.primaryIndex);
  }, [
    dispatch,
    selectedTilesState,
    setNextPrimarySelectedTile,
    setInputQueue,
    inputQueue,
    puzzle,
  ]);

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, [onKeyDown, onKeyUp]);
}
