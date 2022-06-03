import _ from 'lodash';
import {
  Box,
  Button,
  Input,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import CreateIcon from '@mui/icons-material/Create';
import DoneIcon from '@mui/icons-material/Done';
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FixedSizeList } from 'react-window';

import { LetterType, setStagedWord, selectStagedWord } from './builderSlice';
import { ALL_LETTERS } from './constants';
import { DictionaryType } from './CrosswordBuilder';
import { findWordOptions } from './useWaveFunctionCollapse';

interface Props {
  dictionary: DictionaryType;
  optionsSet: LetterType[][];
  onEnter: (word: string) => void;
  onClear: () => void;
}

function WordSelector({ dictionary, optionsSet, onEnter, onClear }: Props) {
  const stagedWord = useSelector(selectStagedWord);
  const dispatch = useDispatch();

  const possibleWords = useMemo(() => {
    const allPossibleWords = findWordOptions(dictionary, optionsSet);
    const wordsFilteredByStagedWord = findWordOptions(
      allPossibleWords,
      _.map(_.range(optionsSet.length), (index) => [
        (stagedWord[index] ?? '?') === '?'
          ? '.'
          : (stagedWord[index] as LetterType),
      ])
    );
    const wordsExceptStagedWord = _.without(
      wordsFilteredByStagedWord,
      stagedWord
    );
    return wordsExceptStagedWord;
  }, [dictionary, optionsSet, stagedWord]);

  // Auto-focus in input field, and clear staged word. We use useLayoutEffect
  // so that this update happens before the render (otherwise, the staged word
  // flashes for a moment in the new selection).
  const inputRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      dispatch(setStagedWord(''));
    }
  }, [dispatch, optionsSet]);

  const handleChangeSearchValue = (event) => {
    dispatch(
      setStagedWord(
        _.join(
          _.take(
            _.filter(_.toLower(event.target.value), (char) =>
              _.includes([...ALL_LETTERS, '?'], _.toLower(char))
            ),
            optionsSet.length
          ),
          ''
        )
      )
    );
  };
  const mkHandleClickWord = (index: number) => () => {
    dispatch(setStagedWord(possibleWords[index]));
    if (inputRef.current) inputRef.current.focus();
  };
  const handleClickEnter = () => {
    if (!canClickEnter) return;
    onEnter(stagedWord);
  };
  const handleClickClear = () => {
    onClear();
  };

  const canClickEnter =
    stagedWord.length === optionsSet.length && !_.includes(stagedWord, '?');

  return (
    <div className="word-selector-container">
      {optionsSet.length > 0 ? (
        <div className="word-selector-input-container">
          <Input
            placeholder="Write a word"
            style={{ width: 170 }}
            onChange={handleChangeSearchValue}
            value={_.toUpper(stagedWord)}
            inputRef={(ref) => {
              inputRef.current = ref;
            }}
            startAdornment={
              <InputAdornment position="start">
                <CreateIcon fontSize="small" />
              </InputAdornment>
            }
            onKeyPress={(event) => {
              if (event.key === 'Enter') handleClickEnter();
            }}
          />
          <Button
            size="small"
            style={{ marginLeft: 5 }}
            variant="contained"
            startIcon={<DoneIcon />}
            disabled={!canClickEnter}
            onClick={handleClickEnter}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              Enter
            </div>
          </Button>
          <Button
            size="small"
            style={{ marginLeft: 5 }}
            color="error"
            startIcon={<ClearIcon />}
            onClick={handleClickClear}
          >
            Clear
          </Button>
        </div>
      ) : (
        <span style={{ fontStyle: 'italic' }}>
          Click a tile to enter a new word!
        </span>
      )}
      <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
        <List>
          <FixedSizeList
            height={350}
            itemCount={possibleWords.length}
            itemSize={46}
            //width={200}
            overscanCount={5}
          >
            {({ index, style }) => (
              <ListItem disablePadding style={style} component="div">
                <ListItemButton onClick={mkHandleClickWord(index)}>
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
