import _ from 'lodash';
import { useCallback, useRef } from 'react';

import { WaveType } from './useWaveFunctionCollapse';

interface ReturnType {
  pushStateHistory: (wave: WaveType) => void;
  popStateHistory: () => WaveType | null;
}

export default function useWaveHistory(wave: WaveType | null): ReturnType {
  //const [stateHistory, setStateHistory] = useState<WaveType[]>([]);
  const stateHistory = useRef<WaveType[]>([]);

  const pushStateHistory = useCallback((wave) => {
    if (!wave) return;
    stateHistory.current = [wave, ...stateHistory.current];
  }, []);

  const popStateHistory = useCallback(() => {
    if (stateHistory.current.length === 0) return null;
    const state = stateHistory.current[0];
    stateHistory.current = _.drop(stateHistory.current);
    return state;
  }, []);

  return { pushStateHistory, popStateHistory };
}
