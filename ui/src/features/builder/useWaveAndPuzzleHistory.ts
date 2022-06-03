import _ from 'lodash';
import { useCallback, useLayoutEffect, useEffect, useRef } from 'react';

import { CrosswordPuzzleType } from './builderSlice';
import { WaveType } from './useWaveFunctionCollapse';

export interface WaveAndPuzzleType {
  wave: WaveType;
  puzzle: CrosswordPuzzleType;
}
interface ReturnType {
  pushStateHistory: (waveAndPuzzle: WaveAndPuzzleType) => void;
  popStateHistory: () => WaveAndPuzzleType | null;
}

export default function useWaveAndPuzzleHistory(
  wave: WaveType | null,
  puzzle: CrosswordPuzzleType
): ReturnType {
  const stateHistory = useRef<WaveAndPuzzleType[]>([]);

  const pushStateHistory = useCallback((waveAndPuzzle) => {
    if (!waveAndPuzzle) return;
    stateHistory.current = [waveAndPuzzle, ...stateHistory.current];
  }, []);

  const popStateHistory = useCallback(() => {
    if (stateHistory.current.length === 0) return null;
    const state = stateHistory.current[0];
    stateHistory.current = _.drop(stateHistory.current);
    lastPuzzle.current = state.puzzle;
    lastWave.current = state.wave;
    return state;
  }, []);

  // Push the previous state to the history queue when puzzle changes
  const lastPuzzle = useRef<CrosswordPuzzleType>(puzzle);
  const lastWave = useRef<WaveType | null>(wave);
  useEffect(() => {
    // Don't do anything if either the puzzle or the wave hasn't changed
    if (
      !wave ||
      _.isEqual(puzzle, lastPuzzle.current) ||
      _.isEqual(wave, lastWave.current)
    )
      return;

    pushStateHistory({
      wave: lastWave.current,
      puzzle: lastPuzzle.current,
    });
    lastPuzzle.current = puzzle;
    lastWave.current = wave;
  }, [pushStateHistory, puzzle, wave]);

  return { pushStateHistory, popStateHistory };
}
