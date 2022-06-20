import axios from 'axios';
import _ from 'lodash';
import { useCallback, useEffect, useState } from 'react';

export interface DictionaryType {
  [length: number]: string[];
}

export default function useDictionary(): {
  dictionary: DictionaryType | null;
  addWordToDictionary: (word: string) => DictionaryType | null;
} {
  const [dictionary, setDictionary] = useState<DictionaryType | null>(null);

  // Fetch dictionary
  useEffect(() => {
    const fetchDictionary = async () => {
      const response = await axios.get('word_list.json');
      const words = response.data as string[];
      const dictionary = _.groupBy(words, 'length');
      setDictionary(_.mapValues(dictionary, (words) => _.sortBy(words)));
    };
    fetchDictionary();
  }, []);

  const addWordToDictionary = useCallback(
    (word: string) => {
      if (!dictionary) return null;
      const newDictionary = _.mapValues(dictionary, (words) =>
        word.length === words[0].length ? _.sortBy([...words, word]) : words
      );
      setDictionary(newDictionary);
      return newDictionary;
    },
    [dictionary]
  );

  return { dictionary, addWordToDictionary };
}
export function inDictionary(
  dictionary: DictionaryType,
  word: string
): boolean {
  // TODO binary search?
  return _.includes(dictionary[word.length] || [], word);
}
