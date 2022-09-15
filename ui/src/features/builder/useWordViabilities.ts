import { Remote, wrap } from 'comlink';
import _ from 'lodash';
import { useEffect, useRef, useState } from 'react';

import { useInterval } from '../../app/util';
import { CrosswordPuzzleType, LetterType } from './builderSlice';
import { LocationType, puzzleCannotBeFilled } from './CrosswordBuilder';
import { DictionaryType } from './useDictionary';
import { SelectedTilesStateType } from './useTileSelection';
import { WaveType } from './useWaveFunctionCollapse';
import WFCWorker, { WFCWorkerAPIType } from './WFCWorker.worker';

const VIABILITY_CHECK_LIMIT = 20;

function shouldRunViabilityChecks(
  puzzleVersion,
  currentPuzzleVersion,
  selectedTilesLocations,
  currentSelectedLocations,
  fillAssistActive
) {
  return (
    puzzleVersion === currentPuzzleVersion &&
    _.isEqual(selectedTilesLocations, currentSelectedLocations) &&
    fillAssistActive
  );
}

export type ViabilityStateType = 'Checking' | 'Viable' | 'Not Viable';
export interface WordViabilityType {
  state: ViabilityStateType;
}
export default function useWordViabilities(
  dictionary: DictionaryType,
  wave: WaveType,
  puzzle: CrosswordPuzzleType,
  words: string[],
  selectedTilesState: SelectedTilesStateType | null,
  autoFillRunning: boolean,
  fillAssistActive: boolean
): WordViabilityType[] {
  //console.log(
  //dictionary,
  //wave,
  //puzzle,
  //words,
  //selectedTilesState,
  //autoFillRunning,
  //fillAssistActive
  //);
  const [wordViabilities, setWordViabilities] = useState<WordViabilityType[]>(
    []
  );

  // Instantiate WFCWorker
  const WFCWorkerRef = useRef<Remote<WFCWorkerAPIType> | null>(null);
  useEffect(() => {
    WFCWorkerRef.current = wrap<Remote<WFCWorkerAPIType>>(new WFCWorker());
  }, []);

  // Erase word viabilities if the puzzle version or selection changes or if
  // fill assist is not active
  const currentPuzzleVersion = useRef<string>(puzzle.version);
  const currentSelectedLocations = useRef<LocationType[]>(
    selectedTilesState?.locations || []
  );
  useEffect(() => {
    if (!selectedTilesState) return;
    if (
      !shouldRunViabilityChecks(
        puzzle.version,
        currentPuzzleVersion.current,
        selectedTilesState.locations,
        currentSelectedLocations.current,
        fillAssistActive
      )
    ) {
      setWordViabilities([]);
      currentPuzzleVersion.current = puzzle.version;
      currentSelectedLocations.current = selectedTilesState.locations;
    }
  }, [puzzle.version, selectedTilesState, fillAssistActive]);

  // Iteratively check the viability of the provided words
  const running = useRef(false);
  useInterval(
    () => {
      if (!WFCWorkerRef.current) return;

      const checkViability = async () => {
        if (!WFCWorkerRef.current || running.current || !selectedTilesState)
          return;
        running.current = true;

        // Add a new viability entry in the "Checking" state
        setWordViabilities([...wordViabilities, { state: 'Checking' }]);

        // Compute a new wave in the background
        const word = words[wordViabilities.length];
        const newWave = await WFCWorkerRef.current.withTileUpdates(
          dictionary,
          wave,
          puzzle,
          _.map(selectedTilesState.locations, ({ row, column }, index) => ({
            row,
            column,
            value: word[index] as LetterType,
          }))
        );

        if (
          shouldRunViabilityChecks(
            puzzle.version,
            currentPuzzleVersion.current,
            selectedTilesState.locations,
            currentSelectedLocations.current,
            fillAssistActive
          )
        )
          // Update the viability entry's state given the results (if the
          // puzzle version and selected tiles are still the same--otherwise,
          // discard results)
          setWordViabilities([
            ...wordViabilities,
            {
              state: puzzleCannotBeFilled(puzzle, newWave)
                ? 'Not Viable'
                : 'Viable',
            },
          ]);

        running.current = false;
      };

      checkViability();
    },
    // Only iterate if we haven't reached our limit yet, there are more words
    // available to check, the wave has been updated to the current puzzle
    // version, and auto-fill is not running
    selectedTilesState &&
      wordViabilities.length < VIABILITY_CHECK_LIMIT &&
      words.length > wordViabilities.length &&
      wave.puzzleVersion === puzzle.version &&
      !autoFillRunning && fillAssistActive
      ? 100
      : null
  );

  return wordViabilities;
}
