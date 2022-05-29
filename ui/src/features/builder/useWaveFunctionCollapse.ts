import axios from 'axios';
import _ from 'lodash';
import { useCallback, useEffect, useState } from 'react';

import { LetterType, TileValueType } from './builderSlice';
import { ALL_LETTERS } from './constants';

interface ElementType {
  row: number;
  column: number;
  options: LetterType[];
}
interface WaveType {
  elements: ElementType[][];
}
interface ReturnType {
  wave: WaveType;
  observeAtLocation: (
    row: number,
    column: number,
    value: LetterType
  ) => boolean;
}
type DictionaryType = string[];

const DEFAULT_WAVE: WaveType = {
  elements: _.times(15, (rowIndex) =>
    _.times(15, (columnIndex) => ({
      row: rowIndex,
      column: columnIndex,
      options: [...ALL_LETTERS],
    }))
  ),
};

function withNewObservationAtLocation(
  dictionary: DictionaryType,
  wave: WaveType,
  row: number,
  column: number,
  value: LetterType
): WaveType {
  // TODO: Don't rely on JSON parsing for doing a deep copy?
  const waveCopy = JSON.parse(JSON.stringify(wave));
  const updateQueue: ElementType[] = [
    {
      row,
      column,
      options: [value],
    },
  ];

  while (true) {
    const update = updateQueue.shift();
    // Queue empty => break
    if (!update) break;
    const element = wave.elements[update.row][update.column];
    // Update is less constrained than the current wave element => go next
    if (update.options.length >= element.options.length) continue;
    // Update the element with the more constrained options
    element.options = update.options;
    // TODO: compute entropy?
  }

  return waveCopy;
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

  //console.log(regex);
  return _.reject(dictionary, (word) => word.search(regex) === -1);
}

export default function useWaveFunctionCollapse(): ReturnType {
  const [wave, setWave] = useState<WaveType>(DEFAULT_WAVE);
  const [dictionary, setDictionary] = useState<DictionaryType | null>(null);

  // Fetch dictionary
  useEffect(() => {
    const fetchDictionary = async () => {
      const response = await axios.get('dictionary.json');
      setDictionary(response.data);
      const start = Date.now();
      _.times(100, () => {
        //console.log(
          findWordOptions(response.data, [
            { options: [...ALL_LETTERS] },
            { options: [...ALL_LETTERS] },
            { options: [...ALL_LETTERS] },
            { options: [...ALL_LETTERS] },
            { options: [...ALL_LETTERS] },
            { options: [...ALL_LETTERS] },
            { options: [...ALL_LETTERS] },
            { options: [...ALL_LETTERS] },
            { options: [...ALL_LETTERS] },
            { options: [...ALL_LETTERS] },
            { options: [...ALL_LETTERS] },
            { options: [...ALL_LETTERS] },
            { options: [...ALL_LETTERS] },
          ])
        //);
      });
      console.log(Date.now() - start);
    };
    fetchDictionary();
  }, []);

  const observeAtLocation = useCallback(
    (row: number, column: number, value: LetterType) => {
      if (!dictionary) return false;
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
