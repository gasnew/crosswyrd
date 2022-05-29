import axios from 'axios';
import _ from 'lodash';
import { useCallback, useEffect, useState } from 'react';

import { CrosswordPuzzleType, LetterType, TileValueType } from './builderSlice';
import { ALL_LETTERS } from './constants';

interface ElementType {
  row: number;
  column: number;
  options: LetterType[];
  solid: boolean;
}
export interface WaveType {
  elements: ElementType[][];
}
interface ReturnType {
  wave: WaveType | null;
  observeAtLocation: (
    row: number,
    column: number,
    value: LetterType
  ) => boolean;
}
type DictionaryType = string[];

function isSubset<T extends string>(subset: Array<T>, set: Array<T>): boolean {
  return _.every(subset, (element) => set.includes(element));
}

function intersection<T>(setA: Array<T>, setB: Array<T>): Array<T> {
  return _.filter(setA, (element) => setB.includes(element));
}

function findWordOptions(
  dictionary: DictionaryType,
  optionsSet: { options: LetterType[] }[]
): string[] {
  const regex = new RegExp(
    '^' +
      _.join(
        _.map(optionsSet, ({ options }) => `(?:${_.join(options, '|')})`),
        ''
      ) +
      '$'
  );

  return _.reject(dictionary, (word) => word.search(regex) === -1);
}

function wordsToOptionsSet(words: string[]): LetterType[][] {
  if (words.length === 0) return [];
  const sets = _.times(words[0].length, () => new Set<LetterType>());
  _.forEach(words, (word) => {
    _.forEach(word, (letter, letterIndex) => {
      sets[letterIndex].add(letter as LetterType);
    });
  });

  return _.map(sets, (set) => Array.from(set));
}

function computeDownOptions(
  dictionary: DictionaryType,
  wave: WaveType,
  row: number,
  column: number
): { options: LetterType[]; row: number; column: number }[] {
  let startRow = row;
  while (startRow > 0 && !wave.elements[startRow - 1][column].solid) startRow--;
  let stopRow = row;
  while (
    stopRow < wave.elements.length - 1 &&
    !wave.elements[stopRow + 1][column].solid
  )
    stopRow++;

  //console.log(
  //startRow,
  //stopRow,
  //_.range(startRow, stopRow + 1).length,
  //wave.elements[row][column]
  //);
  return _.map(
    wordsToOptionsSet(
      findWordOptions(
        dictionary,
        _.map(_.range(startRow, stopRow + 1), (newUpdateRow) => ({
          options: wave.elements[newUpdateRow][column].options,
        }))
      )
    ),
    (options, index) => ({
      options,
      row: startRow + index,
      column,
    })
  );
}

function computeAcrossOptions(
  dictionary: DictionaryType,
  wave: WaveType,
  row: number,
  column: number
): { options: LetterType[]; row: number; column: number }[] {
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
    wordsToOptionsSet(
      findWordOptions(
        dictionary,
        _.map(_.range(startColumn, stopColumn + 1), (newUpdateColumn) => ({
          options: wave.elements[row][newUpdateColumn].options,
        }))
      )
    ),
    (options, index) => ({
      options,
      row,
      column: startColumn + index,
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
    // TODO: compute entropy

    // Enqueue updates for all tiles in the down word that intersects this tile
    _.forEach(
      computeDownOptions(dictionary, waveCopy, update.row, update.column),
      ({ options, row, column }, index) => {
        updateQueue.push({
          row,
          column,
          options,
          solid: false,
        });
      }
    );
    // Enqueue updates for all tiles in the across word that intersects this
    // tile
    _.forEach(
      computeAcrossOptions(dictionary, waveCopy, update.row, update.column),
      ({ options, row, column }, index) => {
        updateQueue.push({
          row,
          column,
          options,
          solid: false,
        });
      }
    );
  }

  return waveCopy;
}

export default function useWaveFunctionCollapse(
  puzzle: CrosswordPuzzleType
): ReturnType {
  const [wave, setWave] = useState<WaveType | null>(null);
  const [dictionary, setDictionary] = useState<DictionaryType | null>(null);

  console.log(wave);
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
          solid: tile.value === 'black',
        }))
      ),
    });
  }, [puzzle, wave]);

  // Fetch dictionary
  useEffect(() => {
    const fetchDictionary = async () => {
      const response = await axios.get('dictionary.json');
      setDictionary(response.data);
    };
    fetchDictionary();
  }, []);

  const observeAtLocation = useCallback(
    (row: number, column: number, value: LetterType) => {
      if (!wave || !dictionary) return false;
      setWave(
        withNewObservationAtLocation(dictionary, wave, row, column, value)
      );
      return true;
    },
    [dictionary, wave]
  );

  return {
    wave,
    observeAtLocation,
  };
}
