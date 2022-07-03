import _ from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CrosswordPuzzleType, LetterType, TileValueType } from './builderSlice';
import { ALL_LETTERS } from './constants';
import { DictionaryType } from './useDictionary';
import { SelectedTilesStateType } from './useTileSelection';

import WFCWorker, { WFCWorkerAPIType } from './WFCWorker.worker';

import { Remote, wrap } from 'comlink';

export interface ElementType {
  row: number;
  column: number;
  options: LetterType[];
  entropy: number;
  solid: boolean;
}
export interface WaveType {
  elements: ElementType[][];
  puzzleVersion: string;
}
export interface TileUpdateType {
  row: number;
  column: number;
  value: TileValueType;
}

export function findWordOptions(
  words: string[],
  optionsSet: (LetterType | '.')[][]
): string[] {
  const regex = new RegExp(
    '^' +
      _.join(
        _.map(optionsSet, (options) => `(?:${_.join(options, '|')})`),
        ''
      ) +
      '$'
  );

  return _.reject(words, (word) => word.search(regex) === -1);
}
export function findWordOptionsFromDictionary(
  dictionary: DictionaryType,
  optionsSet: (LetterType | '.')[][]
): string[] {
  return findWordOptions(dictionary[optionsSet.length] || [], optionsSet);
}

function computeEntropy(options: LetterType[]): number {
  // TODO: Make this computeWeightedEntropy, and use scrabble weights
  // Adapted from this numpy code
  //value,counts = np.unique(labels, return_counts=True)
  //norm_counts = counts / counts.sum()
  //base = e if base is None else base
  //return -(norm_counts * np.log(norm_counts)/np.log(base)).sum()

  const counts = _.values(_.countBy(options));
  const countsSum = _.sum(counts);
  const normalizedCounts = _.map(counts, (count) => count / countsSum);
  const entropy = -_.sum(
    _.map(normalizedCounts, (count) => count * Math.log(count))
  );
  return entropy;
}

export function waveFromPuzzle(puzzle: CrosswordPuzzleType): WaveType {
  // Returns a wave given the pattern of the puzzle. The puzzle values are NOT
  // transferred, only whether the value is solid or not is taken into account.
  // I.e., each non-solid tile has all letters as options.
  const solid = (tile) => tile.value === 'black';
  const options = (tile) => (solid(tile) ? [] : [...ALL_LETTERS]);
  return {
    elements: _.map(puzzle.tiles, (row, rowIndex) =>
      _.map(row, (tile, columnIndex) => ({
        row: rowIndex,
        column: columnIndex,
        options: options(tile),
        entropy: computeEntropy(options(tile)),
        solid: solid(tile),
      }))
    ),
    puzzleVersion: puzzle.version,
  };
}

type UpdateWaveReturnType = {
  wave: WaveType;
  puzzle: CrosswordPuzzleType;
  selectedTilesState: SelectedTilesStateType | null;
} | null;
interface ReturnType {
  wave: WaveType | null;
  updateWaveWithTileUpdates: (
    dictionary: DictionaryType,
    tileUpdates: TileUpdateType[]
  ) => Promise<WaveType | null>;
  updateWave: (
    dictionary: DictionaryType,
    selectedTilesState: SelectedTilesStateType | null
  ) => Promise<UpdateWaveReturnType>;
  setWaveState: (wave: WaveType, puzzle: CrosswordPuzzleType) => void;
  busy: boolean;
}

export default function useWaveFunctionCollapse(
  puzzle: CrosswordPuzzleType
): ReturnType {
  const [wave, setWave] = useState<WaveType | null>(null);
  const WFCWorkerRef = useRef<Remote<WFCWorkerAPIType> | null>(null);
  // A nice boolean for clients to see if we are accepting new wave-update
  // requests
  const [busy, setBusy] = useState(false);
  // The actual flag used for preventing simultaneous wave updates
  const computingWave = useRef(false);

  // Ingest puzzle into wave
  useEffect(() => {
    // TODO: Run this effect when the black tiles change?
    if (wave) return;
    // TODO: Request this from WFCWorker?
    setWave(waveFromPuzzle(puzzle));
    previousPuzzle.current = puzzle;
  }, [puzzle, wave]);

  // Instantiate WFCWorker
  useEffect(() => {
    WFCWorkerRef.current = wrap<Remote<WFCWorkerAPIType>>(new WFCWorker());
  }, []);

  const updateWaveWithTileUpdates = useCallback(
    async (
      dictionary: DictionaryType,
      tileUpdates: TileUpdateType[]
    ): Promise<WaveType | null> => {
      if (computingWave.current || !wave || !WFCWorkerRef.current) return null;
      computingWave.current = true;
      setBusy(true);

      const newWave = await WFCWorkerRef.current.withTileUpdates(
        dictionary,
        wave,
        puzzle,
        tileUpdates
      );
      setWave(newWave);

      computingWave.current = false;
      setBusy(false);

      return newWave;
    },
    [puzzle, wave]
  );

  const previousPuzzle = useRef<CrosswordPuzzleType | null>(null);
  const updateWave = useCallback(
    async (
      dictionary: DictionaryType,
      selectedTilesState: SelectedTilesStateType | null
    ): Promise<UpdateWaveReturnType> => {
      if (computingWave.current || !wave || !WFCWorkerRef.current) return null;
      const previous = previousPuzzle.current;
      if (!previous)
        // previousPuzzle should be instantiated when this hook is first
        // called--we don't want to be in the business of inferring the initial
        // puzzle
        return null;

      const tileUpdates = _.flatMap(puzzle.tiles, (row, rowIndex) =>
        _.filter(
          _.map(row, (tile, columnIndex) => ({
            row: rowIndex,
            column: columnIndex,
            value: tile.value,
          })),
          ({ row, column, value }) =>
            value !== previous.tiles[row][column].value
        )
      );
      if (tileUpdates.length === 0)
        // Do nothing because the puzzle hasn't changed
        return null;
      previousPuzzle.current = puzzle;

      const newWave = await updateWaveWithTileUpdates(dictionary, tileUpdates);
      return (
        newWave && {
          puzzle,
          wave: newWave,
          selectedTilesState,
        }
      );
    },
    [wave, puzzle, updateWaveWithTileUpdates]
  );

  const setWaveState = useCallback(
    (wave: WaveType, puzzle: CrosswordPuzzleType) => {
      setWave(wave);
      previousPuzzle.current = puzzle;
    },
    []
  );

  return {
    wave,
    updateWaveWithTileUpdates,
    updateWave,
    setWaveState,
    busy,
  };
}
