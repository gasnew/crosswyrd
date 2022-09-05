import _ from 'lodash';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import React, { useMemo } from 'react';
import { FixedSizeList } from 'react-window';

import { LetterType, TileType } from './builderSlice';
import { LETTER_WEIGHTS } from './constants';
import { DictionaryType } from './useDictionary';
import {
  findWordOptions,
  findWordOptionsFromDictionary,
} from './useWaveFunctionCollapse';

function WordEntry({
  data: { possibleWords, mkHandleClickWord },
  index,
  style,
}: {
  data: {
    possibleWords: string[];
    mkHandleClickWord: (index: number) => () => void;
  };
  index: number;
  style: any;
}) {
  return (
    <ListItem key={index} disablePadding style={style} component="div">
      <ListItemButton onClick={mkHandleClickWord(index)} divider>
        <ListItemText primary={_.toUpper(possibleWords[index])} />
      </ListItemButton>
    </ListItem>
  );
}

export function sortByWordScore(words: string[]): string[] {
  return _.sortBy(
    words,
    (word) => -_.sumBy(word, (letter) => LETTER_WEIGHTS[letter])
  );
}

interface Props {
  dictionary: DictionaryType;
  optionsSet: LetterType[][];
  selectedTiles: TileType[];
  onEnter: (word: string) => void;
  clearSelection: () => void;
}

function WordSelector({
  dictionary,
  optionsSet,
  selectedTiles,
  onEnter,
  clearSelection,
}: Props) {
  const allPossibleWords = useMemo(
    () => findWordOptionsFromDictionary(dictionary, optionsSet),
    [dictionary, optionsSet]
  );
  const wordsFilteredByTiles = useMemo(
    () =>
      // Filter even before wave updates come in
      findWordOptions(
        allPossibleWords,
        _.map(_.range(optionsSet.length), (index) => {
          const tileValue = selectedTiles[index].value;
          if (tileValue === 'empty' || tileValue === 'black') return ['.'];
          return [tileValue];
        })
      ),
    [allPossibleWords, optionsSet, selectedTiles]
  );
  const possibleWords = useMemo(() => {
    const sortedWordsExceptSelectedWord = sortByWordScore(
      _.without(
        wordsFilteredByTiles,
        _.join(
          _.times(optionsSet.length, (index) => selectedTiles[index].value),
          ''
        )
      )
    );
    return sortedWordsExceptSelectedWord;
  }, [wordsFilteredByTiles, selectedTiles, optionsSet]);

  const mkHandleClickWord = (index: number) => () => {
    onEnter(possibleWords[index]);
  };

  return (
    <div className="word-selector-container">
      {optionsSet.length === 0 ? (
        <span className="selector-comment">
          Click a tile to enter a new word!
        </span>
      ) : (
        possibleWords.length === 0 && (
          <span className="selector-comment">
            No words found to place here.
          </span>
        )
      )}
      <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
        <List style={{ padding: 0 }}>
          <FixedSizeList
            height={546}
            itemCount={possibleWords.length}
            itemData={{
              possibleWords,
              mkHandleClickWord,
            }}
            itemSize={46}
            overscanCount={5}
          >
            {WordEntry}
          </FixedSizeList>
        </List>
      </Box>
    </div>
  );
}

export default React.memo(WordSelector);
