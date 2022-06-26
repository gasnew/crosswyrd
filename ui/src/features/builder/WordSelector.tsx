import _ from 'lodash';
import {
  Box,
  CircularProgress,
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

function Processing() {
  return (
    <span>
      <span style={{ position: 'relative', top: 3, margin: 5 }}>
        <CircularProgress size={15} thickness={6} />
      </span>
      <span style={{ fontStyle: 'italic' }}>Processing...</span>
    </span>
  );
}

function WordEntry({
  data: { possibleWords, processingLastChange, mkHandleClickWord },
  index,
  style,
}: {
  data: {
    possibleWords: string[];
    processingLastChange: boolean;
    mkHandleClickWord: (index: number) => () => void;
  };
  index: number;
  style: any;
}) {
  return (
    <ListItem key={index} disablePadding style={style} component="div">
      <ListItemButton
        disabled={processingLastChange}
        onClick={mkHandleClickWord(index)}
        divider
      >
        <ListItemText primary={_.toUpper(possibleWords[index])} />
      </ListItemButton>
    </ListItem>
  );
}

interface Props {
  dictionary: DictionaryType;
  optionsSet: LetterType[][];
  tiles: TileType[];
  processingLastChange: boolean;
  onEnter: (word: string) => void;
  clearSelection: () => void;
}

function WordSelector({
  dictionary,
  optionsSet,
  tiles,
  processingLastChange,
  onEnter,
  clearSelection,
}: Props) {
  const allPossibleWords = useMemo(
    () => findWordOptionsFromDictionary(dictionary, optionsSet),
    [dictionary, optionsSet]
  );
  const wordsFilteredByTiles = useMemo(
    () =>
      findWordOptions(
        allPossibleWords,
        _.map(_.range(optionsSet.length), (index) => {
          const tileValue = tiles[index].value;
          if (tileValue === 'empty' || tileValue === 'black') return ['.'];
          return [tileValue];
        })
      ),
    [allPossibleWords, optionsSet, tiles]
  );
  const possibleWords = useMemo(() => {
    const wordsExceptSelectedWord = _.sortBy(
      _.without(
        wordsFilteredByTiles,
        _.join(
          _.times(optionsSet.length, (index) => tiles[index].value),
          ''
        )
      ),
      (word) => -_.sumBy(word, (letter) => LETTER_WEIGHTS[letter])
    );
    return wordsExceptSelectedWord;
  }, [wordsFilteredByTiles, tiles, optionsSet]);

  const mkHandleClickWord = (index: number) => () => {
    onEnter(possibleWords[index]);
  };

  return (
    <div className="word-selector-container">
      {optionsSet.length === 0 &&
        (processingLastChange ? (
          <Processing />
        ) : (
          <span className="selector-comment">
            Click a tile to enter a new word!
          </span>
        ))}
      <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
        <List style={{ padding: 0 }}>
          <FixedSizeList
            height={416}
            itemCount={possibleWords.length}
            itemData={{
              possibleWords,
              processingLastChange,
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
