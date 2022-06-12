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

import {
  LetterType,
  setStagedWord,
  selectStagedWord,
  TileType,
} from './builderSlice';
import { ALL_LETTERS } from './constants';
import { DictionaryType } from './CrosswordBuilder';
import { findWordOptions } from './useWaveFunctionCollapse';

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
  const stagedWord = useSelector(selectStagedWord);
  const dispatch = useDispatch();

  const allPossibleWords = useMemo(
    () => findWordOptions(dictionary, optionsSet),
    [dictionary, optionsSet]
  );
  const wordsFilteredByStagedWord = useMemo(
    () =>
      findWordOptions(
        allPossibleWords,
        _.map(_.range(optionsSet.length), (index) => [
          (stagedWord[index] ?? '?') === '?'
            ? '.'
            : (stagedWord[index] as LetterType),
        ])
      ),
    [allPossibleWords, optionsSet, stagedWord]
  );
  const possibleWords = useMemo(() => {
    const wordsExceptStagedWord = _.without(
      wordsFilteredByStagedWord,
      stagedWord
    );
    return wordsExceptStagedWord;
  }, [wordsFilteredByStagedWord, stagedWord]);

  // Auto-focus in input field, and clear staged word. We use useLayoutEffect
  // so that this update happens before the render (otherwise, the staged word
  // flashes for a moment in the new selection).
  const inputRef = useRef<HTMLElement | null>(null);
  const initialStagedWord = useRef('');
  useLayoutEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();

      // Seed the staged word with the word on the board up to the last known
      // letter (?s inserted where appropriate)
      const lastKnownLetterIndex = _.findLastIndex(
        tiles,
        ({ value }) => value !== 'empty'
      );
      initialStagedWord.current =
        lastKnownLetterIndex === -1
          ? ''
          : _.join(
              _.times(lastKnownLetterIndex + 1, (index) =>
                tiles[index].value === 'empty' ? '?' : tiles[index].value
              ),
              ''
            );
      dispatch(setStagedWord(initialStagedWord.current));
    }
  }, [dispatch, tiles]);

  const handleChangeStagedValue = (event) => {
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
  const handleClickCancel = () => {
    clearSelection();
  };
  const stagedWordFullAndNotInDictionary = useMemo(
    () =>
      stagedWord.length === optionsSet.length &&
      !_.includes(stagedWord, '?') &&
      !_.includes(dictionary, stagedWord),
    [dictionary, optionsSet.length, stagedWord]
  );

  return (
    <div className="word-selector-container">
      {optionsSet.length > 0 && (
        <div className="word-selector-input-container">
          <Input
            placeholder="Write a word"
            style={{ width: 170 }}
            onChange={handleChangeStagedValue}
            value={_.toUpper(stagedWord)}
            disabled={processingLastChange}
            inputRef={(ref) => {
              inputRef.current = ref;
            }}
            startAdornment={
              <InputAdornment position="start">
                <CreateIcon fontSize="small" />
              </InputAdornment>
            }
            onKeyPress={(event) => {
              if (event.key === 'Enter') onEnter(stagedWord);
            }}
          />
          {processingLastChange ? (
            <Processing />
          ) : (
            <>
              <Button
                size="small"
                style={{ marginLeft: 5 }}
                variant="contained"
                startIcon={<DoneIcon />}
                disabled={initialStagedWord.current === stagedWord}
                onClick={() => onEnter(stagedWord)}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  Enter
                  {stagedWordFullAndNotInDictionary && (
                    <span className="selector-add-word-text">
                      +&nbsp;Add&nbsp;Word
                    </span>
                  )}
                </div>
              </Button>
              {initialStagedWord.current !== stagedWord && (
                <Button
                  size="small"
                  style={{ marginLeft: 5 }}
                  color="inherit"
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleClickCancel}
                >
                  Cancel
                </Button>
              )}
            </>
          )}
        </div>
      )}
      {optionsSet.length === 0 &&
        (processingLastChange ? (
          <Processing />
        ) : (
          <span className="selector-comment">
            Click a tile to enter a new word!
          </span>
        ))}
      <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
        <List>
          <FixedSizeList
            height={350}
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
