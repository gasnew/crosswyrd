import _ from 'lodash';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Input,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';
import DeleteIcon from '@mui/icons-material/Delete';
import DoneIcon from '@mui/icons-material/Done';
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  CrosswordPuzzleType,
  setDraggedWord,
  selectDraggedWord,
  TileType,
} from './builderSlice';
import { ALL_LETTERS } from './constants';
import { LocationType } from './CrosswordBuilder';
import { ElementType, WaveType } from './useWaveFunctionCollapse';

function getAllElementSets(
  puzzle: CrosswordPuzzleType,
  wave: WaveType
): ElementType[][] {
  // Returns a list of all possible wave element sets (across and down)
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
  const allMatchingElementSets = _.filter(
    allElementSets,
    (elements) =>
      elements.length === word.length &&
      _.every(word, (letter, index) =>
        _.includes(elements[index].options, letter)
      )
  );
  const unusedValidLocationSets = _.map(
    _.filter(
      allMatchingElementSets,
      (elements) =>
        !_.every(elements, (element) => element.options.length === 1)
    ),
    (elements) => _.map(elements, ({ row, column }) => ({ row, column }))
  );

  return {
    word,
    used: allMatchingElementSets.length !== unusedValidLocationSets.length,
    validLocationSets: unusedValidLocationSets,
  };
}

interface WordEntry {
  word: string;
  used: boolean;
  validLocationSets: LocationType[][];
}
interface WordLocationOptionsType {
  across: LocationType[] | null;
  down: LocationType[] | null;
}
export type WordLocationsGridType = WordLocationOptionsType[][];

function buildWordLocationsGrid(
  puzzle: CrosswordPuzzleType,
  entry: WordEntry
): WordLocationsGridType {
  const grid: WordLocationsGridType = _.times(puzzle.tiles.length, (rowIndex) =>
    _.times(puzzle.tiles.length, (columnIndex) => ({
      across: null,
      down: null,
    }))
  );
  _.forEach(entry.validLocationSets, (locations) => {
    const direction =
      locations.length > 1 && locations[1].column > locations[0].column
        ? 'across'
        : 'down';
    _.forEach(locations, ({ row, column }) => {
      grid[row][column][direction] = locations;
    });
  });
  return grid;
}

interface Props {
  wave: WaveType;
  puzzle: CrosswordPuzzleType;
  processingLastChange: boolean;
  setWordLocationsGrid: (grid: WordLocationsGridType | null) => void;
}

function WordBank({
  wave,
  puzzle,
  processingLastChange,
  setWordLocationsGrid,
}: Props) {
  const [currentWord, setCurrentWord] = useState('');
  const [words, setWords] = useState<string[]>([]);

  const draggedWord = useSelector(selectDraggedWord);

  const dispatch = useDispatch();

  // Cancel word locations grid when dragging stops
  useEffect(() => {
    if (!draggedWord) setWordLocationsGrid(null);
  }, [setWordLocationsGrid, draggedWord]);

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
    setCurrentWord('');
    if (_.includes(words, currentWord)) return;
    setWords(_.sortBy([...words, currentWord]));
  };
  const mkHandleClickWord = (index) => () => {
    dispatch(setDraggedWord(wordBank[index].word));
  };
  const mkHandleHoverWord = (index) => () => {
    setWordLocationsGrid(buildWordLocationsGrid(puzzle, wordBank[index]));
  };
  const mkHandleDeleteEntry = (index) => () => {
    setWords(_.sortBy(_.without(words, words[index])));
  };
  const handleMouseOut = () => {
    const entry = _.find(wordBank, ['word', draggedWord]);
    if (draggedWord && entry)
      setWordLocationsGrid(buildWordLocationsGrid(puzzle, entry));
    else setWordLocationsGrid(null);
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
        <List className="word-bank-list-container" onMouseOut={handleMouseOut}>
          {_.map(wordBank, (entry, index) => (
            <ListItem
              key={entry.word}
              disablePadding
              component="div"
              style={{ position: 'relative' }}
            >
              <ListItemButton
                disabled={
                  processingLastChange ||
                  entry.used ||
                  entry.validLocationSets.length === 0 ||
                  !!draggedWord
                }
                onClick={mkHandleClickWord(index)}
                onMouseOver={mkHandleHoverWord(index)}
                divider
              >
                <ListItemText primary={_.toUpper(entry.word)} />
                <Chip
                  style={{ marginRight: 40 }}
                  color={
                    entry.used
                      ? 'warning'
                      : entry.validLocationSets.length > 0
                      ? 'success'
                      : 'error'
                  }
                  variant={
                    entry.used
                      ? 'filled'
                      : entry.validLocationSets.length > 0
                      ? 'filled'
                      : 'outlined'
                  }
                  label={
                    entry.used
                      ? 'Used'
                      : `${entry.validLocationSets.length} option${
                          entry.validLocationSets.length === 1 ? '' : 's'
                        }`
                  }
                />
              </ListItemButton>
              <IconButton
                disabled={
                  processingLastChange ||
                  entry.used ||
                  !!draggedWord
                }
                size="small"
                style={{ position: 'absolute', right: 15 }}
                onClick={mkHandleDeleteEntry(index)}
              >
                <DeleteIcon />
              </IconButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </div>
  );
}

export default React.memo(WordBank);
