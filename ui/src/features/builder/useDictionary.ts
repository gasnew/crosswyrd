import axios from 'axios';
import _ from 'lodash';
import { useCallback, useEffect, useState } from 'react';

export interface DictionaryType {
  [length: number]: string[];
}

export default function useDictionary(): {
  dictionary: DictionaryType | null;
  addWordsToDictionary: (words: string[]) => DictionaryType | null;
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

  const addWordsToDictionary = useCallback(
    (newWords: string[]) => {
      if (!dictionary) return null;
      const newDictionary = _.mapValues(dictionary, (existingWords) =>
        _.flow((newWordsOfLength) =>
          newWordsOfLength.length > 0
            ? _.sortBy([...existingWords, ...newWordsOfLength])
            : existingWords
        )(_.filter(newWords, ['length', existingWords[0].length]))
      );
      setDictionary(newDictionary);
      return newDictionary;
    },
    [dictionary]
  );

  return { dictionary, addWordsToDictionary };
}
export function inDictionary(
  dictionary: DictionaryType,
  word: string
): boolean {
  // Find the index of the word using binary search
  return _.sortedIndexOf(dictionary[word.length], word) >= 0;
}
