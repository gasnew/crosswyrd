import _ from 'lodash';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
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
  useEffect,
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
  const solid = (tile: TileType): boolean => !tile || tile.value === 'black';
  return _.reject(
    _.flatMap(puzzle.tiles, (row, rowIndex) =>
      _.flatMap(row, (tile, columnIndex) => {
        const leftTile = puzzle.tiles[rowIndex]?.[columnIndex - 1];
        const aboveTile = puzzle.tiles?.[rowIndex - 1]?.[columnIndex];
        return _.compact([
          solid(leftTile) &&
            _.map(
              _.takeWhile(
                _.range(puzzle.tiles.length),
                (index) => !solid(puzzle.tiles[rowIndex]?.[columnIndex + index])
              ),
              (index) => wave.elements[rowIndex][columnIndex + index]
            ),
          solid(aboveTile) &&
            _.map(
              _.takeWhile(
                _.range(puzzle.tiles.length),
                (index) =>
                  !solid(puzzle.tiles?.[rowIndex + index]?.[columnIndex])
              ),
              (index) => wave.elements[rowIndex + index][columnIndex]
            ),
        ]);
      })
    ),
    (set) => set.length === 0
  );
}

function computeWordEntry(
  allElementSets: ElementType[][],
  word: string
): WordEntry {
  const validLocationSets = _.map(
    _.filter(
      allElementSets,
      (elements) =>
        elements.length === word.length &&
        _.every(word, (letter, index) =>
          _.includes(elements[index].options, letter)
        ) &&
        !_.every(elements, (element) => element.options.length === 1)
    ),
    (elements) => _.map(elements, ({ row, column }) => ({ row, column }))
  );

  return {
    word,
    validLocationSets,
  };
}

interface WordEntry {
  word: string;
  validLocationSets: LocationType[][];
}
interface WordLocationOptionsType {
  across: LocationType[] | null;
  down: LocationType[] | null;
}
export type WordLocationsGridType = WordLocationOptionsType[][];

interface Props {
  wave: WaveType;
  puzzle: CrosswordPuzzleType;
  processingLastChange: boolean;
  setWordLocationsGrid: (grid: WordLocationsGridType | null) => void;
  fillWordAtLocations: (word: string, locations: LocationType[]) => void;
}

function WordBank({
  wave,
  puzzle,
  processingLastChange,
  setWordLocationsGrid,
  fillWordAtLocations,
}: Props) {
  const [currentWord, setCurrentWord] = useState('');
  const [words, setWords] = useState<string[]>([]);

  const allElementSets = useMemo(() => getAllElementSets(puzzle, wave), [
    puzzle,
    wave,
  ]);

  const wordBank: WordEntry[] = useMemo(
    () => _.map(words, (word) => computeWordEntry(allElementSets, word)),
    [allElementSets, words]
  );

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
    setWords(_.sortBy([...words, currentWord]));
    setCurrentWord('');
  };
  const mkHandleClickWord = (index) => () => {
    console.log('click');
  };
  const mkHandleHoverWord = (index) => () => {
    const grid: WordLocationsGridType = _.times(
      puzzle.tiles.length,
      (rowIndex) =>
        _.times(puzzle.tiles.length, (columnIndex) => ({
          across: null,
          down: null,
        }))
    );
    _.forEach(wordBank[index].validLocationSets, (locations) => {
      const direction =
        locations.length > 1 && locations[1].column > locations[0].column
          ? 'across'
          : 'down';
      _.forEach(locations, ({ row, column }) => {
        grid[row][column][direction] = locations;
      });
    });

    setWordLocationsGrid(grid);
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
        <List
          className="word-bank-list-container"
          onMouseOut={() => setWordLocationsGrid(null)}
        >
          {_.map(wordBank, (entry, index) => (
            <ListItem key={index} disablePadding component="div">
              <ListItemButton
                disabled={
                  processingLastChange || entry.validLocationSets.length === 0
                }
                onClick={mkHandleClickWord(index)}
                onMouseOver={mkHandleHoverWord(index)}
                divider
              >
                <ListItemText primary={_.toUpper(entry.word)} />
                <Chip
                  color={
                    entry.validLocationSets.length > 0 ? 'success' : 'error'
                  }
                  variant={
                    entry.validLocationSets.length > 0 ? 'filled' : 'outlined'
                  }
                  label={`${entry.validLocationSets.length} option${
                    entry.validLocationSets.length === 1 ? '' : 's'
                  }`}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </div>
  );
}

export default React.memo(WordBank);
