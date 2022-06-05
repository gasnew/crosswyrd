import _ from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CrosswordPuzzleType, LetterType, TileValueType } from './builderSlice';
import { ALL_LETTERS } from './constants';
import { DictionaryType } from './CrosswordBuilder';

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
}
export interface TileUpdateType {
  row: number;
  column: number;
  value: TileValueType;
}

export function findWordOptions(
  dictionary: DictionaryType,
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

  return _.reject(dictionary, (word) => word.search(regex) === -1);
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

function waveFromPuzzle(puzzle: CrosswordPuzzleType): WaveType {
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
  };
}

interface ReturnType {
  wave: WaveType | null;
  updateWaveWithTileUpdates: (
    dictionary: DictionaryType,
    tileUpdates: TileUpdateType[]
  ) => Promise<WaveType | null>;
  setWaveState: (wave: WaveType) => void;
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

  const setWaveState = useCallback((wave: WaveType) => {
    setWave(wave);
  }, []);

  return {
    wave,
    updateWaveWithTileUpdates,
    setWaveState,
    busy,
  };
}
