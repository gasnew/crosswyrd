import _ from 'lodash';
import {
  Box,
  Input,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FixedSizeList } from 'react-window';

import { LetterType } from './builderSlice';
import { ALL_LETTERS } from './constants';
import { DictionaryType } from './CrosswordBuilder';
import { findWordOptions } from './useWaveFunctionCollapse';

interface Props {
  dictionary: DictionaryType;
  optionsSet: LetterType[][];
  onSelect: (word: string) => void;
}

function WordSelector({ dictionary, optionsSet, onSelect }: Props) {
  const [searchWord, setSearchWord] = useState('');

  const allPossibleWords = useMemo(() => {
    const allPossibleWords = findWordOptions(dictionary, optionsSet);
    return findWordOptions(
      allPossibleWords,
      _.map(_.range(optionsSet.length), (index) => [
        (searchWord[index] ?? '?') === '?'
          ? '.'
          : (searchWord[index] as LetterType),
      ])
    );
  }, [dictionary, optionsSet, searchWord]);

  // Auto-focus in input field
  const inputRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      setSearchWord('');
    }
  }, [optionsSet]);

  const handleChangeSearchValue = (event) => {
    setSearchWord(
      _.join(
        _.filter(_.toLower(event.target.value), (char) =>
          _.includes([...ALL_LETTERS, '?'], char)
        ),
        ''
      )
    );
  };

  return (
    <div className="word-selector-container">
      <Input
        placeholder="Search dictionary"
        onChange={handleChangeSearchValue}
        value={searchWord}
        inputRef={(ref) => {
          inputRef.current = ref;
        }}
        startAdornment={
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        }
      />
      <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
        <List>
          <FixedSizeList
            height={350}
            itemCount={allPossibleWords.length}
            itemSize={46}
            width={250}
            overscanCount={5}
          >
            {({ index, style }) => (
              <ListItem disablePadding style={style} component="div">
                <ListItemButton
                  onClick={() => onSelect(allPossibleWords[index])}
                >
                  <ListItemText primary={allPossibleWords[index]} />
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
