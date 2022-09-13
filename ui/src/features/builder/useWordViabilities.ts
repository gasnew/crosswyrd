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

export type ViabilityStateType = 'Checking' | 'Viable' | 'Not Viable';
export interface WordViabilityType {
  state: ViabilityStateType;
}
export default function useWordViabilities(
  dictionary: DictionaryType,
  wave: WaveType,
  puzzle: CrosswordPuzzleType,
  words: string[],
  selectedTilesState: SelectedTilesStateType | null
): WordViabilityType[] {
  const [wordViabilities, setWordViabilities] = useState<WordViabilityType[]>(
    []
  );

  // Instantiate WFCWorker
  const WFCWorkerRef = useRef<Remote<WFCWorkerAPIType> | null>(null);
  useEffect(() => {
    WFCWorkerRef.current = wrap<Remote<WFCWorkerAPIType>>(new WFCWorker());
  }, []);

  // Erase word viabilities if the puzzle version or selection changes
  const currentPuzzleVersion = useRef<string>(puzzle.version);
  const currentSelectedLocations = useRef<LocationType[]>(
    selectedTilesState?.locations || []
  );
  useEffect(() => {
    if (!selectedTilesState) return;
    if (
      puzzle.version !== currentPuzzleVersion.current ||
      !_.isEqual(selectedTilesState.locations, currentSelectedLocations.current)
    ) {
      setWordViabilities([]);
      currentPuzzleVersion.current = puzzle.version;
      currentSelectedLocations.current = selectedTilesState.locations;
    }
  }, [puzzle.version, selectedTilesState]);

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
          puzzle.version === currentPuzzleVersion.current &&
          _.isEqual(
            selectedTilesState.locations,
            currentSelectedLocations.current
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
    // Only iterate if we haven't reached our limit yet, and there are more
    // words available to check
    selectedTilesState &&
      wordViabilities.length < VIABILITY_CHECK_LIMIT &&
      words.length > wordViabilities.length
      ? 100
      : null
  );

  return wordViabilities;
}
