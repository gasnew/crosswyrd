import _ from 'lodash';
import { useCallback, useRef } from 'react';

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
    return state;
  }, []);

  const checkHistoryEmpty = useCallback(
    () => stateHistory.current.length === 0,
    []
  );

  return { pushStateHistory, popStateHistory, checkHistoryEmpty };
}
