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
import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FixedSizeList } from 'react-window';

import {
  CrosswordPuzzleType,
  LetterType,
  setStagedWord,
  selectStagedWord,
  TileType,
} from './builderSlice';
import { ALL_LETTERS } from './constants';
import { LocationType } from './CrosswordBuilder';
import { ElementType, WaveType } from './useWaveFunctionCollapse';

function getAllElementSets(
  puzzle: CrosswordPuzzleType,
  wave: WaveType
): ElementType[][] {
  return [];
}

interface Props {
  wave: WaveType;
  puzzle: CrosswordPuzzleType;
  processingLastChange: boolean;
  fillWordAtLocations: (word: string, locations: LocationType[]) => void;
}

function WordBank({
  wave,
  puzzle,
  processingLastChange,
  fillWordAtLocations,
}: Props) {
  const [currentWord, setCurrentWord] = useState('');
  const [wordBank, setWordBank] = useState<string[]>([]);

  const allElementSets = useCallback(() => getAllElementSets(puzzle, wave), [
    puzzle,
    wave,
  ]);

  const handleChangeCurrentWordValue = (event) => {
    setCurrentWord(
      _.join(
        _.take(
          _.filter(_.toLower(event.target.value), (char) =>
            _.includes(ALL_LETTERS, char)
          ),
          puzzle.tiles.length
        ),
        ''
      )
    );
  };
  const handleInsertCurrentWord = () => {
    setWordBank(_.sortBy([...wordBank, currentWord]));
    setCurrentWord('');
  };
  const mkHandleClickWord = (index) => () => {
    console.log('click');
  };

  return (
    <div className="word-bank-container">
      <div className="word-bank-input-container">
        <Input
          placeholder="Write a word"
          style={{ width: 170 }}
          onChange={handleChangeCurrentWordValue}
          value={_.toUpper(currentWord)}
          startAdornment={
            <InputAdornment position="start">
              <CreateIcon fontSize="small" />
            </InputAdornment>
          }
          onKeyPress={(event) => {
            if (event.key === 'Enter') handleInsertCurrentWord();
          }}
        />
        <Button
          size="small"
          style={{ marginLeft: 5 }}
          variant="contained"
          startIcon={<DoneIcon />}
          disabled={!currentWord}
          onClick={handleInsertCurrentWord}
        >
          Add Word
        </Button>
      </div>
      <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
        <List className="word-bank-list-container">
          {_.map(wordBank, (word, index) => (
            <ListItem key={index} disablePadding component="div">
              <ListItemButton
                disabled={processingLastChange}
                onClick={mkHandleClickWord(index)}
                divider
              >
                <ListItemText primary={_.toUpper(word)} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </div>
  );
}

export default React.memo(WordBank);
