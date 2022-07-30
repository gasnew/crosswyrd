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
  popStateHistory: (depth?: number) => WaveAndPuzzleType | null;
  popStateFuture: () => WaveAndPuzzleType | null;
  checkHistoryEmpty: () => boolean;
  checkFutureEmpty: () => boolean;
  atLastSnapshot: boolean;
}

export default function useWaveAndPuzzleHistory(
  wave: WaveType | null,
  puzzle: CrosswordPuzzleType
): ReturnType {
  const [stateHistory, setStateHistory] = useState<WaveAndPuzzleType[]>([]);
  const [stateFuture, setStateFuture] = useState<WaveAndPuzzleType[]>([]);
  const seenVersions = useRef<string[]>([]);

  const pushStateHistory = useCallback(
    (waveAndPuzzle: WaveAndPuzzleType) => {
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
      setStateFuture([]);
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

  const popStateHistory = useCallback(
    (depth: number = 1) => {
      if (stateHistory.length < depth) return null;
      if (atLastSnapshot || depth > 1) {
        // Go back past the last snapshot if we are at that snapshot now
        setStateHistory(_.drop(stateHistory, depth));
        setStateFuture([stateHistory[0], ...stateFuture]);
        return stateHistory[depth];
      }

      // Go to the last checkpoint
      return stateHistory[0];
    },
    [atLastSnapshot, stateHistory, stateFuture]
  );

  const popStateFuture = useCallback(() => {
    if (stateFuture.length < 1) return null;

    setStateFuture(_.drop(stateFuture));
    setStateHistory([stateFuture[0], ...stateHistory]);
    return stateFuture[0];
  }, [stateFuture, stateHistory]);

  const checkHistoryEmpty = useCallback(() => stateHistory.length <= 1, [
    stateHistory,
  ]);
  const checkFutureEmpty = useCallback(() => stateFuture.length < 1, [
    stateFuture,
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
    popStateFuture,
    checkHistoryEmpty,
    checkFutureEmpty,
    atLastSnapshot,
  };
}
