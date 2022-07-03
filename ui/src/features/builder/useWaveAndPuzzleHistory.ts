import _ from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CrosswordPuzzleType } from './builderSlice';
import { SelectedTilesStateType } from './useTileSelection';
import { WaveType } from './useWaveFunctionCollapse';

export interface WaveAndPuzzleType {
  wave: WaveType;
  puzzle: CrosswordPuzzleType;
  selectedTilesState?: SelectedTilesStateType | null;
}
interface ReturnType {
  pushStateHistory: (waveAndPuzzle: WaveAndPuzzleType) => void;
  popStateHistory: () => WaveAndPuzzleType | null;
  checkHistoryEmpty: () => boolean;
  atLastSnapshot: boolean;
}

export default function useWaveAndPuzzleHistory(
  wave: WaveType | null,
  puzzle: CrosswordPuzzleType
): ReturnType {
  const [stateHistory, setStateHistory] = useState<WaveAndPuzzleType[]>([]);
  const seenVersions = useRef<string[]>([]);

  const pushStateHistory = useCallback(
    (waveAndPuzzle) => {
      if (
        !waveAndPuzzle ||
        // Wave must have changed in order to be pushed to history
        (stateHistory.length > 0 &&
          waveAndPuzzle.wave.puzzleVersion ===
            stateHistory[0].wave.puzzleVersion) ||
        // The new puzzle version must not have been seen before
        _.includes(seenVersions.current, waveAndPuzzle.puzzle.version)
      )
        return;

      seenVersions.current.push(waveAndPuzzle.puzzle.version);
      setStateHistory([waveAndPuzzle, ...stateHistory]);
    },
    [stateHistory]
  );

  // Seed history with the initial puzzle
  useEffect(() => {
    if (!wave || stateHistory.length !== 0) return;
    pushStateHistory({ wave, puzzle });
  }, [stateHistory, pushStateHistory, wave, puzzle]);

  const atLastSnapshot = useMemo(
    () =>
      stateHistory.length > 0 &&
      stateHistory[0].puzzle.version === puzzle.version,
    [stateHistory, puzzle]
  );

  const popStateHistory = useCallback(() => {
    if (stateHistory.length === 0) return null;
    if (atLastSnapshot) {
      // Go back past the last snapshot if we are at that snapshot now
      setStateHistory(_.drop(stateHistory));
      return stateHistory[1];
    }

    // Go to the last checkpoint
    return stateHistory[0];
  }, [atLastSnapshot, stateHistory]);

  const checkHistoryEmpty = useCallback(() => stateHistory.length <= 1, [
    stateHistory,
  ]);

  // Log state history
  //useEffect(() => {
    //const short = (id) => _.join(_.take(id, 4), '');
    //console.log(
      //'state history',
      //_.map(
        //stateHistory,
        //({ wave, puzzle }) =>
          //`w${short(wave.puzzleVersion)} p${short(puzzle.version)}`
      //)
    //);
  //}, [stateHistory]);

  return {
    pushStateHistory,
    popStateHistory,
    checkHistoryEmpty,
    atLastSnapshot,
  };
}
