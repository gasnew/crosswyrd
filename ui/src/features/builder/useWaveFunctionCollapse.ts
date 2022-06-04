import _ from 'lodash';
import { useCallback, useEffect, useState } from 'react';

import { CrosswordPuzzleType, LetterType } from './builderSlice';
import { ALL_LETTERS } from './constants';
import { DictionaryType, LocationType } from './CrosswordBuilder';

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
  // transferred, i.e., each non-solid tile has all letters as options.
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
  observeAtLocations: (
    observations: ObservationType[],
    dictionary: DictionaryType
  ) => WaveType | null;
  clearLocations: (
    locations: LocationType[],
    dictionary: DictionaryType
  ) => boolean;
  setWaveState: (wave: WaveType) => void;
}

export default function useWaveFunctionCollapse(
  puzzle: CrosswordPuzzleType
): ReturnType {
  const [wave, setWave] = useState<WaveType | null>(null);

  //useEffect(() => {
    //async function eyy() {
      //const worker = new Worker();
      //const obj = Comlink.wrap(worker);
      //console.log(obj);
      //await obj?.inc();
      //console.log(obj);
    //}
    //eyy();
  //}, []);

  // Ingest puzzle into wave
  useEffect(() => {
    // TODO: Run this effect when the black tiles change
    if (wave) return;
    setWave(waveFromPuzzle(puzzle));
  }, [puzzle, wave]);

  const commitObservationsToWave = useCallback(
    (
      observations: ObservationType[],
      customWave: WaveType,
      dictionary: DictionaryType
    ) => {
      const newWave = _.reduce(
        observations,
        (finalWave, { row, column, value }) =>
          withNewObservationAtLocation(
            dictionary,
            finalWave,
            row,
            column,
            value
          ),
        customWave
      );
      setWave(newWave);
      return newWave;
    },
    []
  );

  const commitNewWaveFromPuzzle = useCallback(
    (
      puzzle: CrosswordPuzzleType,
      dictionary: DictionaryType
    ): WaveType | null => {
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
      return commitObservationsToWave(
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
        ),
        newWave,
        dictionary
      );
    },
    [commitObservationsToWave]
  );

  const clearLocations = useCallback(
    (locations, dictionary) => {
      if (!wave) return false;
      // Copy puzzle, make empty values at locations, make a new wave, observe
      // at ALL filled tile locations.
      //
      // NOTE(gnewman): We HAVE to re-observe at all filled tile locations
      // because we are not guaranteed that this clear operation will propagate
      // across the entire board. This is slow, but this is the only way we can
      // ensure are wave has resolved correctly.
      const puzzleCopy: CrosswordPuzzleType = JSON.parse(
        JSON.stringify(puzzle)
      );
      _.forEach(locations, (location) => {
        puzzleCopy.tiles[location.row][location.column].value = 'empty';
      });
      commitNewWaveFromPuzzle(puzzleCopy, dictionary);

      return true;
    },
    [puzzle, wave, commitNewWaveFromPuzzle]
  );

  const observeAtLocations = useCallback(
    (
      observations: ObservationType[],
      dictionary: DictionaryType
    ): WaveType | null => {
      if (!wave) return null;
      if (
        _.some(
          observations,
          ({ row, column, value }) =>
            !_.includes(wave.elements[row][column].options, value)
        )
      ) {
        // At least one observation is redefining constraints, e.g., we are
        // overwriting an existing word. We must now copy puzzle, overwrite these
        // locations, make a new wave, and observe at ALL filled tile locations
        // adjacent to empty spaces.
        // This is the slow path.
        const puzzleCopy: CrosswordPuzzleType = JSON.parse(
          JSON.stringify(puzzle)
        );
        _.forEach(observations, ({ row, column, value }) => {
          puzzleCopy.tiles[row][column].value = value;
        });
        return commitNewWaveFromPuzzle(puzzleCopy, dictionary);
      }
      // This is the fast path.
      return commitObservationsToWave(observations, wave, dictionary);
    },
    [puzzle, wave, commitNewWaveFromPuzzle, commitObservationsToWave]
  );

  const setWaveState = useCallback((wave: WaveType) => {
    setWave(wave);
  }, []);

  return {
    wave,
    observeAtLocations,
    clearLocations,
    setWaveState,
  };
}
