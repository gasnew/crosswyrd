import _ from 'lodash';
import { useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';

import { useInterval } from '../../app/util';
import {
  CrosswordPuzzleType,
  LetterType,
  setPuzzleTileValues,
} from './builderSlice';
import { DictionaryType } from './useDictionary';
import { getBestNextElementSet } from './useTileSelection';
import { WaveAndPuzzleType } from './useWaveAndPuzzleHistory';
import {
  ElementType,
  findWordOptionsFromDictionary,
  TileUpdateType,
  WaveType,
} from './useWaveFunctionCollapse';
import { sortByWordScore } from './WordSelector';

type AttemptedWordsType = { [version: string]: string[] };

function pickWord(
  dictionary: DictionaryType,
  puzzle: CrosswordPuzzleType,
  attemptedWords: React.MutableRefObject<AttemptedWordsType>,
  elementSet: ElementType[]
): string | null {
  const sortedWordOptions = sortByWordScore(
    findWordOptionsFromDictionary(
      dictionary,
      _.map(elementSet, (element) => element.options)
    )
  );
  const word = _.find(
    _.shuffle(_.take(sortedWordOptions, 15)),
    (word) => !_.includes(attemptedWords.current[puzzle.version] || [], word)
  );
  if (!word) return null;

  if (attemptedWords.current[puzzle.version]) {
    attemptedWords.current[puzzle.version].push(word);
  } else attemptedWords.current[puzzle.version] = [word];

  return word;
}

interface ReturnType {
  runAutoFill: () => void;
  stopAutoFill: () => void;
}

export default function useAutoFill(
  dictionary: DictionaryType | null,
  puzzle: CrosswordPuzzleType,
  wave: WaveType | null,
  autoFillRunning: boolean,
  setAutoFillRunning: (running: boolean) => void,
  pushStateHistory: (waveAndPuzzle: WaveAndPuzzleType) => void,
  updateWaveWithTileUpdates: (
    dictionary: DictionaryType,
    tileUpdates: TileUpdateType[]
  ) => Promise<WaveType | null>,
  WFCBusy: boolean,
  stepBack: (times: number) => any
): ReturnType {
  // the number of steps into the run we are from where we started (guards
  // against undoing something a user inputted)
  const stepsFromRunStart = useRef(0);
  // An object containing all attempted words arranged by the protocol version
  // they were tried on--this way, if we backtrack, we can iterate through our
  // list of best words without repeating a fork we've already tried.
  const attemptedWords = useRef<AttemptedWordsType>({});

  const dispatch = useDispatch();

  // Run auto-fill
  useInterval(() => {
    if (!wave || !dictionary || !autoFillRunning || WFCBusy) return;
    if (!_.some(_.flatten(puzzle.tiles), ['value', 'empty'])) {
      // The puzzle is finished!
      setAutoFillRunning(false);
      return;
    }

    const bestElementSet = getBestNextElementSet(puzzle, wave);
    const someTileIsRed = _.some(
      _.flatten(wave.elements),
      (element) => !element.solid && element.options.length === 0
    );
    const newWord =
      bestElementSet &&
      !someTileIsRed &&
      pickWord(dictionary, puzzle, attemptedWords, bestElementSet);
    if (newWord) {
      const tileUpdates = _.map(bestElementSet, ({ row, column }, index) => ({
        row,
        column,
        value: newWord[index] as LetterType,
      }));
      updateWaveWithTileUpdates(dictionary, tileUpdates).then((newWave) => {
        // This gets run before the next iteration of the auto-fill algorithm,
        // because WFCBusy is just about to be set to false (but not yet)
        if (newWave) {
          pushStateHistory({ wave, puzzle });
          // The observation succeeded, so set tile values for all tiles that
          // have just been updated
          dispatch(setPuzzleTileValues(tileUpdates));
        }
        // We have moved one step further from run start
        stepsFromRunStart.current += 1;
      });
    } else {
      if (stepsFromRunStart.current <= 0) {
        // Stop running so that we don't overwrite something the user did
        setAutoFillRunning(false);
        return;
      }

      stepBack(1);
      // We just moved 1 step toward run start
      stepsFromRunStart.current -= 1;
    }
  }, 100);

  const runAutoFill = useCallback(() => {
    if (autoFillRunning) return;
    // Reset these to their default values for the run
    stepsFromRunStart.current = 0;
    attemptedWords.current = {};
    // Start running
    setAutoFillRunning(true);
  }, [autoFillRunning, setAutoFillRunning]);

  const stopAutoFill = useCallback(() => {
    if (!autoFillRunning) return;
    setAutoFillRunning(false);
  }, [autoFillRunning, setAutoFillRunning]);

  return { runAutoFill, stopAutoFill };
}
