import _ from 'lodash';
import { useCallback, useEffect, useState } from 'react';

import { CrosswordPuzzleType, LetterType, TileValueType } from './builderSlice';
import { ALL_LETTERS } from './constants';
import { DictionaryType } from './CrosswordBuilder';

import MyWorker, { api } from './WFCWorker.worker';

import { wrap } from 'comlink';

//import Comlink from 'comlink';
//[> eslint-disable import/no-webpack-loader-syntax <]
//import Worker from 'worker-loader!../util/worker';

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
interface TileUpdateType {
  row: number;
  column: number;
  value: TileValueType;
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

export interface ObservationType {
  row: number;
  column: number;
  value: LetterType;
}

interface ReturnType {
  wave: WaveType | null;
  updateWaveWithTileUpdates: (
    dictionary: DictionaryType,
    tileUpdates: TileUpdateType[]
  ) => WaveType | null;
  setWaveState: (wave: WaveType) => void;
}

export default function useWaveFunctionCollapse(
  puzzle: CrosswordPuzzleType
): ReturnType {
  const [wave, setWave] = useState<WaveType | null>(null);

  useEffect(() => {
    // Instantiate worker
    const myComlinkWorkerInstance: Worker = new MyWorker();
    const myComlinkWorkerApi = wrap<typeof api>(myComlinkWorkerInstance);

    // Call function in worker
    console.log('send');
    myComlinkWorkerApi.createMessage('John Doe').then((message: string) => {
      console.log(message);
    });
    console.log('send');
    myComlinkWorkerApi.createMessage('John Doe').then((message: string) => {
      console.log(message);
    });
    console.log('send');
    myComlinkWorkerApi.createMessage('John Doe').then((message: string) => {
      console.log(message);
    });
  }, []);

  // Ingest puzzle into wave
  useEffect(() => {
    // TODO: Run this effect when the black tiles change?
    if (wave) return;
    setWave(waveFromPuzzle(puzzle));
  }, [puzzle, wave]);

  const withNewObservations = useCallback(
    (
      dictionary: DictionaryType,
      wave: WaveType,
      observations: ObservationType[]
    ): WaveType =>
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
      ),
    []
  );

  const newWaveFromPuzzle = useCallback(
    (dictionary: DictionaryType, puzzle: CrosswordPuzzleType): WaveType => {
      const surroundingTiles = (row: number, column: number) =>
        _.map(
          [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ],
          ([xdir, ydir]) => puzzle.tiles?.[row + ydir]?.[column + xdir]
        );
      const newWave = waveFromPuzzle(puzzle);

      // Commit observations on the filled-in tiles touching at least one empty
      // tile, and just set the collapsed state for the other filled-in tiles.
      return withNewObservations(
        dictionary,
        newWave,
        _.compact(
          _.flatMap(puzzle.tiles, (row, rowIndex) =>
            _.map(row, (tile, columnIndex) => {
              if (tile.value === 'empty' || tile.value === 'black') return;
              // Some surrounding tile is empty
              if (
                _.some(
                  surroundingTiles(rowIndex, columnIndex),
                  (tile) => tile?.value === 'empty'
                )
              )
                return {
                  row: rowIndex,
                  column: columnIndex,
                  value: tile.value,
                };
              // Write options directly for elements that have no empty
              // adjacent tiles (these are already collapsed)
              newWave.elements[rowIndex][columnIndex].options = [tile.value];

              return null;
            })
          )
        )
      );
    },
    [withNewObservations]
  );

  const withTileUpdates = useCallback(
    (
      dictionary: DictionaryType,
      wave: WaveType,
      puzzle: CrosswordPuzzleType,
      tileUpdates: TileUpdateType[]
    ): WaveType => {
      // Find all of the observations that are "proper", i.e., they only
      // further constrain the options for all given wave elements.
      // NOTE(gnewman): We have to use this strange compact+map syntax so the
      // type system recognizes we're constraining the type of `value`.
      const properObservations: ObservationType[] = _.compact(
        _.map(tileUpdates, ({ row, column, value }) => {
          if (
            // Tile value empty or black
            value === 'empty' ||
            value === 'black' ||
            // Tile value not included in options
            !_.includes(wave.elements[row][column].options, value)
          )
            return null;
          return { row, column, value };
        })
      );

      if (properObservations.length === tileUpdates.length) {
        // All observations are proper! This is the fast path.
        return withNewObservations(dictionary, wave, properObservations);
      }

      // At least one observation is redefining constraints, e.g., we are
      // overwriting an existing word, toggling a grid tile, or clearing a
      // tile. We must now copy the puzzle, overwrite these locations, make a
      // new wave, and observe at ALL filled tile locations adjacent to empty
      // spaces.
      // This is the slow path.
      const puzzleCopy: CrosswordPuzzleType = JSON.parse(
        JSON.stringify(puzzle)
      );
      _.forEach(tileUpdates, ({ row, column, value }) => {
        puzzleCopy.tiles[row][column].value = value;
      });
      return newWaveFromPuzzle(dictionary, puzzleCopy);
    },
    [withNewObservations, newWaveFromPuzzle]
  );

  const updateWaveWithTileUpdates = useCallback(
    (
      dictionary: DictionaryType,
      tileUpdates: TileUpdateType[]
    ): WaveType | null => {
      if (!wave) return null;
      const newWave = withTileUpdates(dictionary, wave, puzzle, tileUpdates);
      setWave(newWave);
      return newWave;
    },
    [puzzle, wave, withTileUpdates]
  );

  const setWaveState = useCallback((wave: WaveType) => {
    setWave(wave);
  }, []);

  return {
    wave,
    updateWaveWithTileUpdates,
    setWaveState,
  };
}
