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
  WordViabilitiesType,
} from './useWordViabilities';

function WordEntry({
  data: { possibleWords, wordViabilities, mkHandleClickWord },
  index,
  style,
}: {
  data: {
    possibleWords: string[];
    wordViabilities: WordViabilitiesType;
    mkHandleClickWord: (index: number) => () => void;
  };
  index: number;
  style: any;
}) {
  const viabilityState: ViabilityStateType | null =
    wordViabilities[possibleWords[index]] || null;
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
            noTooltip
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
  wave: WaveType | null;
  puzzle: CrosswordPuzzleType;
  optionsSet: LetterType[][];
  selectedTilesState: SelectedTilesStateType | null;
  onEnter: (word: string) => void;
  clearSelection: () => void;
  autoFillRunning: boolean;
  fillAssistActive: boolean;
}

function WordSelector({
  dictionary,
  wave,
  puzzle,
  optionsSet,
  selectedTilesState,
  onEnter,
  clearSelection,
  autoFillRunning,
  fillAssistActive,
}: Props) {
  const selectedTiles = useMemo(
    () =>
      _.map(
        selectedTilesState?.locations || [],
        ({ row, column }) => puzzle.tiles[row][column]
      ),
    [selectedTilesState, puzzle]
  );
  // The pattern of the selected word as typed so far (a letter where a tile
  // is filled, '.' wherever it's empty or black), independent of anything
  // the wave function collapse solver has narrowed down.
  const tilesPattern: (LetterType | '.')[][] = useMemo(
    () =>
      _.map(_.range(optionsSet.length), (index) => {
        const tileValue = selectedTiles[index].value;
        if (tileValue === 'empty' || tileValue === 'black') return ['.'];
        return [tileValue];
      }),
    [optionsSet.length, selectedTiles]
  );

  const selectedWord = useMemo(
    () =>
      _.join(
        _.times(optionsSet.length, (index) => selectedTiles[index].value),
        ''
      ),
    [selectedTiles, optionsSet.length]
  );

  const allPossibleWords = useMemo(
    () => findWordOptionsFromDictionary(dictionary, optionsSet),
    [dictionary, optionsSet]
  );
  const wordsFilteredByTiles = useMemo(
    // Filter even before wave updates come in
    () => _.without(findWordOptions(allPossibleWords, tilesPattern), selectedWord),
    [allPossibleWords, tilesPattern, selectedWord]
  );

  // If the wave function collapse solver has narrowed the board down to no
  // other viable words here (e.g. because it can't find a way to fully solve
  // the rest of the puzzle from this state), fall back to words that simply
  // match the letters already typed in, unverified against the rest of the
  // board. Only bother scanning the dictionary for this when we'd actually
  // use the result.
  const basicWordsFilteredByTiles = useMemo(
    () =>
      optionsSet.length === 0 || wordsFilteredByTiles.length > 0
        ? []
        : _.without(
            findWordOptionsFromDictionary(dictionary, tilesPattern),
            selectedWord
          ),
    [dictionary, tilesPattern, optionsSet.length, wordsFilteredByTiles, selectedWord]
  );
  const usingBasicFallback =
    wordsFilteredByTiles.length === 0 && basicWordsFilteredByTiles.length > 0;

  const possibleWords = useMemo(
    () =>
      sortByWordScore(
        usingBasicFallback ? basicWordsFilteredByTiles : wordsFilteredByTiles
      ),
    [wordsFilteredByTiles, basicWordsFilteredByTiles, usingBasicFallback]
  );

  // Viability checks rely on being able to solve the rest of the board, so
  // they aren't meaningful for the basic fallback list--skip them there.
  const wordViabilities = useWordViabilities(
    dictionary,
    wave,
    puzzle,
    possibleWords,
    selectedTilesState,
    autoFillRunning,
    fillAssistActive && !usingBasicFallback
  );

  const mkHandleClickWord = (index: number) => () => {
    onEnter(possibleWords[index]);
  };

  if (!fillAssistActive) {
    return (
      <div className="word-selector-container">
        <span className="selector-comment">Fill Assist Disabled</span>
      </div>
    );
  }

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
      {usingBasicFallback && (
        <span className="selector-fallback-notice">
          Unable to fill entire board - suggestions for the selected spaces
          only
        </span>
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
