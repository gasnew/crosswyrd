import _ from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CrosswordPuzzleType } from './builderSlice';
import { WaveType } from './useWaveFunctionCollapse';

export interface WaveAndPuzzleType {
  wave: WaveType;
  puzzle: CrosswordPuzzleType;
}
interface ReturnType {
  pushStateHistory: (waveAndPuzzle: WaveAndPuzzleType) => void;
  popStateHistory: () => WaveAndPuzzleType | null;
  checkHistoryEmpty: () => boolean;
  atLastCheckpoint: boolean;
}

export default function useWaveAndPuzzleHistory(
  wave: WaveType | null,
  puzzle: CrosswordPuzzleType
): ReturnType {
  const [stateHistory, setStateHistory] = useState<WaveAndPuzzleType[]>([]);

  const pushStateHistory = useCallback(
    (waveAndPuzzle) => {
      if (!waveAndPuzzle) return;
      if (
        !waveAndPuzzle ||
        // Wave must have changed to be added to history
        (stateHistory.length > 0 &&
          _.isEqual(waveAndPuzzle.wave, stateHistory[0].wave))
      )
        return;

      setStateHistory([waveAndPuzzle, ...stateHistory]);
    },
    [stateHistory]
  );

  useEffect(() => {
    if (!wave || stateHistory.length !== 0) return;
    pushStateHistory({ wave, puzzle });
  }, [stateHistory, pushStateHistory, wave, puzzle]);

  const atLastCheckpoint = useMemo(() => {
    const state = stateHistory[0];
    if (!state) {
      return false;
    }
    return _.isEqual(puzzle, state.puzzle) && _.isEqual(wave, state.wave);
  }, [puzzle, wave, stateHistory]);

  const popStateHistory = useCallback(() => {
    if (stateHistory.length === 0) return null;
    if (atLastCheckpoint) {
      // Go back past the last checkpoint if we are at the last checkpoint now
      setStateHistory(_.drop(stateHistory));
      return stateHistory[1];
    }

    // Go to the last checkpoint
    return stateHistory[0];
  }, [atLastCheckpoint, stateHistory, puzzle, wave]);

  const checkHistoryEmpty = useCallback(() => stateHistory.length <= 1, [
    stateHistory,
  ]);

  return {
    pushStateHistory,
    popStateHistory,
    checkHistoryEmpty,
    atLastCheckpoint,
  };
}
