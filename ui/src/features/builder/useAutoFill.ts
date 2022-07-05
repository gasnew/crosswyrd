import _ from 'lodash';
import {
  Alert,
  Button,
  ButtonGroup,
  colors,
  Divider,
  Slide,
  Snackbar,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import UndoIcon from '@mui/icons-material/Undo';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { useInterval } from '../../app/util';
import {
  CrosswordPuzzleType,
  getSymmetricTile,
  LetterType,
  selectCurrentTab,
  selectDraggedWord,
  selectPuzzle,
  setDraggedWord,
  setPuzzleState,
  setPuzzleTilesToResolvedWaveElements,
  setPuzzleTileValues,
  TileValueType,
  toggleTileBlack,
} from './builderSlice';
import BuilderTabs from './BuilderTabs';
import ClueEntry, { useClueData } from './ClueEntry';
import { ALL_LETTERS, LETTER_WEIGHTS } from './constants';
import DraggedWord from './DraggedWord';
import PuzzleBanner from './PuzzleBanner';
import TileLetterOptions from './TileLetterOptions';
import useDictionary, { DictionaryType } from './useDictionary';
import { GridType } from './useGrids';
import useTileInput from './useTileInput';
import { getBestNextElementSet } from './useTileSelection';
import useWaveAndPuzzleHistory, {
  WaveAndPuzzleType,
} from './useWaveAndPuzzleHistory';
import useWaveFunctionCollapse, {
  findWordOptionsFromDictionary,
  TileUpdateType,
  waveFromPuzzle,
  WaveType,
} from './useWaveFunctionCollapse';
import WordBank, { WordLocationsGridType } from './WordBank';
import WordSelector, { sortByWordScore } from './WordSelector';
import { randomId } from '../../app/util';

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
  stepBack: () => any
) {
  // negative number means we've passed the last failed depth
  const stepsToLastFailure = useRef(-1);
  // the number of steps to backtrack next time we reach a failure
  const stepsToBacktrack = useRef(1);
  // the number of steps into the run we are from where we started (guards
  // against undoing something a user inputted)
  const stepsFromRunStart = useRef(0);
  // An object containing all attempted words arranged by the protocol version
  // they were tried on--this way, if we backtrack, we can iterate through our
  // list of best words without repeating a fork we've already tried.
  const attemptedWords = useRef<{ [version: string]: string[] }>({});
  const outOfWords = useRef(false);

  const dispatch = useDispatch();

  const pickNextWord = useCallback(
    (sortedWordOptions: string[]): string | null => {
      const word = _.find(
        sortedWordOptions,
        (word) =>
          !_.includes(attemptedWords.current[puzzle.version] || [], word)
      );
      if (!word) return null;

      if (attemptedWords.current[puzzle.version]) {
        console.log(puzzle.version, attemptedWords.current, word);
        attemptedWords.current[puzzle.version].push(word);
      } else attemptedWords.current[puzzle.version] = [word];

      return word;
    },
    [puzzle.version]
  );

  const maybePlaceOneWord = useCallback(async () => {
    if (!wave || !dictionary) return;
    const bestElementSet = getBestNextElementSet(puzzle, wave);
    if (!bestElementSet) return;
    const sortedWordOptions = sortByWordScore(
      findWordOptionsFromDictionary(
        dictionary,
        _.map(bestElementSet, (element) => element.options)
      )
    );
    const newWord = pickNextWord(sortedWordOptions);
    if (!newWord) return;

    const newWave = await updateWaveWithTileUpdates(
      dictionary,
      _.map(bestElementSet, ({ row, column }, index) => ({
        row,
        column,
        value: newWord[index] as LetterType,
      }))
    );
    if (newWave) {
      outOfWords.current = false;
      pushStateHistory({ wave, puzzle });
      // The observation succeeded, so set tile values for all tiles that are
      // now collapsed to one state in the new wave.
      dispatch(setPuzzleTilesToResolvedWaveElements(newWave));
    }
  }, [
    dispatch,
    pushStateHistory,
    dictionary,
    updateWaveWithTileUpdates,
    puzzle,
    wave,
    pickNextWord,
  ]);

  // Run auto-fill
  useInterval(() => {
    if (!wave || !autoFillRunning || WFCBusy) return;
    if (!_.some(_.flatten(puzzle.tiles), ['value', 'empty'])) {
      // The puzzle is finished!
      setAutoFillRunning(false);
      return;
    }

    console.log(stepsFromRunStart.current, stepsToBacktrack.current);
    if (
      outOfWords.current ||
      _.some(
        _.flatten(wave.elements),
        (element) => !element.solid && element.options.length === 0
      )
    ) {
      // We are about to move stepsToBacktrack.current steps toward run start
      stepsFromRunStart.current -= stepsToBacktrack.current;
      if (stepsFromRunStart.current < 0) {
        // Stop running so that we don't overwrite something the user did
        setAutoFillRunning(false);
        return;
      }

      // Backstep N times!
      _.times(stepsToBacktrack.current, stepBack);
      // We are now N steps removed from this backtrack
      stepsToLastFailure.current = stepsToBacktrack.current;
      // Next time we backtrack at this level, backtrack one more step
      stepsToBacktrack.current += 1;
    } else {
      if (stepsToLastFailure.current <= 0) {
        // We've passed the barrier! Reset backtrack step count
        stepsToBacktrack.current = 1;
      }
      // A silly way to say that we are in an error mode, even though there
      // are technically no contradictions
      outOfWords.current = true;
      maybePlaceOneWord();
      // We're one step closer to last backtrack
      stepsToLastFailure.current -= 1;
      // We have moved one step further from run start
      stepsFromRunStart.current += 1;
    }
  }, 100);

  const runAutoFill = useCallback(() => {
    if (autoFillRunning) return;
    // Reset these to their default values for the run
    stepsToLastFailure.current = -1;
    stepsToBacktrack.current = 1;
    stepsFromRunStart.current = 0;
    attemptedWords.current = {};
    outOfWords.current = false;
    // Start running
    setAutoFillRunning(true);
  }, [autoFillRunning, setAutoFillRunning]);

  const stopAutoFill = useCallback(() => {
    if (!autoFillRunning) return;
    setAutoFillRunning(false);
  }, [autoFillRunning, setAutoFillRunning]);

  return { runAutoFill, stopAutoFill };
}
