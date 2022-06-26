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
  const cachedInputQueue = useRef<string[]>([]);
  const [inputQueue, setInputQueue] = useState<string[]>([]);

  const onKeyDown = useCallback(
    (event) => {
      if (!_.includes([...ALL_LETTERS, '.', 'Backspace'], event.key)) return;
      cachedInputQueue.current.push(event.key);
      setInputQueue(cachedInputQueue.current);
    },
    [setInputQueue]
  );

  useEffect(() => {
    if (!selectedTilesState || cachedInputQueue.current.length === 0) {
      console.log('skip', cachedInputQueue.current);
      cachedInputQueue.current = [];
      if (inputQueue.length > 0) setInputQueue([]);
      return;
    }
    console.log('process', cachedInputQueue.current);

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
    setInputQueue([]);

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
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onKeyDown]);
}
