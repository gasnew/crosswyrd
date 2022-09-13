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

import { CrosswordPuzzleType, LetterType } from './builderSlice';
import { LETTER_WEIGHTS } from './constants';
import { FillAssistState } from './PuzzleBanner';
import { DictionaryType } from './useDictionary';
import { SelectedTilesStateType } from './useTileSelection';
import {
  findWordOptions,
  findWordOptionsFromDictionary,
  WaveType,
} from './useWaveFunctionCollapse';
import useWordViabilities, {
  ViabilityStateType,
  WordViabilityType,
} from './useWordViabilities';

function WordEntry({
  data: { possibleWords, wordViabilities, mkHandleClickWord },
  index,
  style,
}: {
  data: {
    possibleWords: string[];
    wordViabilities: WordViabilityType[];
    mkHandleClickWord: (index: number) => () => void;
  };
  index: number;
  style: any;
}) {
  const viabilityState: ViabilityStateType | null =
    wordViabilities[index]?.state || null;
  return (
    <ListItem key={index} disablePadding style={style} component="div">
      <ListItemButton onClick={mkHandleClickWord(index)} divider>
        <ListItemText
          className="word-selector-entry"
          primary={_.toUpper(possibleWords[index])}
          style={{ opacity: viabilityState === 'Not Viable' ? 0.5 : 1 }}
        />
        {viabilityState && (
          <FillAssistState
            state={
              viabilityState === 'Checking'
                ? 'running'
                : viabilityState === 'Viable'
                ? 'success'
                : 'error'
            }
          />
        )}
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
  wave: WaveType;
  puzzle: CrosswordPuzzleType;
  optionsSet: LetterType[][];
  selectedTilesState: SelectedTilesStateType | null;
  onEnter: (word: string) => void;
  clearSelection: () => void;
}

function WordSelector({
  dictionary,
  wave,
  puzzle,
  optionsSet,
  selectedTilesState,
  onEnter,
  clearSelection,
}: Props) {
  const selectedTiles = useMemo(
    () =>
      _.map(
        selectedTilesState?.locations || [],
        ({ row, column }) => puzzle.tiles[row][column]
      ),
    [selectedTilesState, puzzle]
  );
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

  const wordViabilities = useWordViabilities(
    dictionary,
    wave,
    puzzle,
    possibleWords,
    selectedTilesState
  );

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
              wordViabilities,
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
