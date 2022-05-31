import _ from 'lodash';
import { useCallback, useEffect, useState } from 'react';

import { CrosswordPuzzleType, LetterType } from './builderSlice';
import { ALL_LETTERS } from './constants';
import { DictionaryType } from './CrosswordBuilder';
import useWaveHistory from './useWaveHistory';

interface ElementType {
  row: number;
  column: number;
  options: LetterType[];
  entropy: number;
  solid: boolean;
}
export interface WaveType {
  elements: ElementType[][];
}

function isSubset<T extends string>(subset: Array<T>, set: Array<T>): boolean {
  return _.every(subset, (element) => set.includes(element));
}

function intersection<T>(setA: Array<T>, setB: Array<T>): Array<T> {
  return _.filter(setA, (element) => setB.includes(element));
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

function wordsToLettersSets(words: string[]): LetterType[][] {
  if (words.length === 0) return [];
  const lettersSets = _.times(words[0].length, () => new Array<LetterType>());
  _.forEach(words, (word) => {
    _.forEach(word, (letter, letterIndex) => {
      lettersSets[letterIndex].push(letter as LetterType);
    });
  });

  return lettersSets;
}

function computeDownElementUpdates(
  dictionary: DictionaryType,
  wave: WaveType,
  row: number,
  column: number
): ElementType[] {
  let startRow = row;
  while (startRow > 0 && !wave.elements[startRow - 1][column].solid) startRow--;
  let stopRow = row;
  while (
    stopRow < wave.elements.length - 1 &&
    !wave.elements[stopRow + 1][column].solid
  )
    stopRow++;

  return _.map(
    wordsToLettersSets(
      findWordOptions(
        dictionary,
        _.map(
          _.range(startRow, stopRow + 1),
          (newUpdateRow) => wave.elements[newUpdateRow][column].options
        )
      )
    ),
    (letters, index) => ({
      options: _.uniq(letters),
      entropy: computeEntropy(letters),
      row: startRow + index,
      column,
      solid: false,
    })
  );
}

function computeAcrossElementUpdates(
  dictionary: DictionaryType,
  wave: WaveType,
  row: number,
  column: number
): ElementType[] {
  let startColumn = column;
  while (startColumn > 0 && !wave.elements[row][startColumn - 1].solid)
    startColumn--;
  let stopColumn = column;
  while (
    stopColumn < wave.elements.length - 1 &&
    !wave.elements[row][stopColumn + 1].solid
  )
    stopColumn++;

  return _.map(
    wordsToLettersSets(
      findWordOptions(
        dictionary,
        _.map(
          _.range(startColumn, stopColumn + 1),
          (newUpdateColumn) => wave.elements[row][newUpdateColumn].options
        )
      )
    ),
    (letters, index) => ({
      options: _.uniq(letters),
      entropy: computeEntropy(letters),
      row,
      column: startColumn + index,
      solid: false,
    })
  );
}

function withNewObservationAtLocation(
  dictionary: DictionaryType,
  wave: WaveType,
  row: number,
  column: number,
  value: LetterType
): WaveType {
  // TODO: Don't rely on JSON parsing for doing a deep copy?
  const waveCopy = JSON.parse(JSON.stringify(wave));
  // Start with the given observation in the queue
  const updateQueue: ElementType[] = [
    {
      row,
      column,
      options: [value],
      entropy: computeEntropy([value]),
      solid: false,
    },
  ];

  // Churn through the queue
  while (true) {
    const update = updateQueue.shift();
    // Queue empty => break
    if (!update) break;

    const element = waveCopy.elements[update.row][update.column];
    // Update is less constrained than the current wave element (i.e., current
    // constraints are a subset of the update's) => go next
    if (isSubset(element.options, update.options)) continue;

    // Update the element with the intersection of the current options and the
    // update's options
    element.options = intersection(element.options, update.options);
    // TODO: think about if it's OK to set entropy like this, even though we're
    // not strictly setting this element's options to the update's options
    // UPDATE: Probably actually calculate entropy from the unique set of
    // letters with scrabble weights (e.g., ['a', 'e'] is higher entropy than
    // ['z', 'x'])
    element.entropy = element.options.length === 1 ? 0 : update.entropy;

    // Enqueue updates for all tiles in the down word that intersects this tile
    _.forEach(
      computeDownElementUpdates(
        dictionary,
        waveCopy,
        update.row,
        update.column
      ),
      (update, index) => {
        updateQueue.push(update);
      }
    );
    // Enqueue updates for all tiles in the across word that intersects this
    // tile
    _.forEach(
      computeAcrossElementUpdates(
        dictionary,
        waveCopy,
        update.row,
        update.column
      ),
      (update, index) => {
        updateQueue.push(update);
      }
    );
  }

  return waveCopy;
}

interface ReturnType {
  wave: WaveType | null;
  observeAtLocation: (
    row: number,
    column: number,
    value: LetterType
  ) => boolean;
  observeAtLocations: (
    observations: {
      row: number;
      column: number;
      value: LetterType;
    }[]
  ) => boolean;
  stepBack: () => void;
}

export default function useWaveFunctionCollapse(
  dictionary: DictionaryType | null,
  puzzle: CrosswordPuzzleType
): ReturnType {
  const [wave, setWave] = useState<WaveType | null>(null);
  const { pushStateHistory, popStateHistory } = useWaveHistory(wave);

  // Ingest puzzle into wave
  useEffect(() => {
    // TODO: Run this effect when the black tiles change
    if (wave) return;
    setWave({
      elements: _.map(puzzle.tiles, (row, rowIndex) =>
        _.map(row, (tile, columnIndex) => ({
          row: rowIndex,
          column: columnIndex,
          options: [...ALL_LETTERS],
          entropy:
            tile.value === 'black' ? 0 : computeEntropy([...ALL_LETTERS]),
          solid: tile.value === 'black',
        }))
      ),
    });
  }, [puzzle, wave]);

  const observeAtLocation = useCallback(
    (row: number, column: number, value: LetterType) => {
      if (!wave || !dictionary) return false;
      setWave(
        withNewObservationAtLocation(dictionary, wave, row, column, value)
      );
      pushStateHistory(wave);
      return true;
    },
    [dictionary, wave, pushStateHistory]
  );

  const observeAtLocations = useCallback(
    (observations: { row: number; column: number; value: LetterType }[]) => {
      if (!wave || !dictionary) return false;
      setWave(
        _.reduce(
          observations,
          (finalWave, { row, column, value }) =>
            withNewObservationAtLocation(
              dictionary,
              finalWave,
              row,
              column,
              value
            ),
          wave
        )
      );
      pushStateHistory(wave);
      return true;
    },
    [dictionary, wave, pushStateHistory]
  );

  const stepBack = useCallback(() => {
    const newWave = popStateHistory();
    setWave(newWave);
  }, [popStateHistory]);

  return {
    wave,
    observeAtLocation,
    observeAtLocations,
    stepBack,
  };
}
