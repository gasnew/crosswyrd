import _ from 'lodash';
import {
  Box,
  Button,
  CircularProgress,
  Input,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import CreateIcon from '@mui/icons-material/Create';
import DoneIcon from '@mui/icons-material/Done';
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FixedSizeList } from 'react-window';

import { LetterType, TileType } from './builderSlice';
import { ALL_LETTERS, LETTER_WEIGHTS } from './constants';
import { DictionaryType, inDictionary } from './useDictionary';
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
    const wordsExceptStagedWord = _.sortBy(
      _.without(
        wordsFilteredByTiles,
        _.join(
          _.times(optionsSet.length, (index) => tiles[index].value),
          ''
        )
      ),
      (word) => -_.sumBy(word, (letter) => LETTER_WEIGHTS[letter])
    );
    return wordsExceptStagedWord;
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
            itemSize={46}
            overscanCount={5}
          >
            {({ index, style }) => (
              <ListItem disablePadding style={style} component="div">
                <ListItemButton
                  disabled={processingLastChange}
                  onClick={mkHandleClickWord(index)}
                  divider
                >
                  <ListItemText primary={_.toUpper(possibleWords[index])} />
                </ListItemButton>
              </ListItem>
            )}
          </FixedSizeList>
        </List>
      </Box>
    </div>
  );
}

export default React.memo(WordSelector);
