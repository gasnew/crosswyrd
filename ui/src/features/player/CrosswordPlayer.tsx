import _ from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import { CompletePuzzleDataType } from '../app/Crosswyrd';
import { selectPuzzle, setPuzzleState } from '../builder/builderSlice';
import { LocationType } from '../builder/CrosswordBuilder';
import { getFlattenedAnswers, useClueData } from '../builder/ClueEntry';
import Tiles from '../builder/Tiles';
import useTileInput from '../builder/useTileInput';
import useTileSelection, { DirectionType } from '../builder/useTileSelection';

import './CrosswordPlayer.css';

interface PlayerClueType {
  row: number;
  column: number;
  direction: DirectionType;
  clue: string;
  answer: string;
}

export default function CrosswordPlayer() {
  const { puzzleData } = useParams();

  const [clues, setClues] = useState<PlayerClueType[] | null>(null);

  const puzzle = useSelector(selectPuzzle);
  const { tileNumbers } = useClueData(puzzle);
  const [hoveredTile, setHoveredTile] = useState<LocationType | null>(null);

  const {
    onClick,
    updateSelectionWithPuzzle,
    selectedTilesState,
    selectBestNext,
    selectNextAnswer,
  } = useTileSelection(puzzle, null, false, false);
  const clearHoveredTile = useCallback(() => setHoveredTile(null), [
    setHoveredTile,
  ]);
  useTileInput(
    puzzle,
    selectedTilesState,
    updateSelectionWithPuzzle,
    clearHoveredTile,
    selectNextAnswer,
    selectBestNext
  );

  const dispatch = useDispatch();

  // Load puzzle data
  useEffect(() => {
    var codec = require('json-url')('lzma');
    codec
      .decompress(puzzleData)
      .then(({ puzzle, clueGrid }: CompletePuzzleDataType) => {
        // Set a puzzle with empty tiles
        dispatch(
          setPuzzleState({
            ...puzzle,
            tiles: _.map(puzzle.tiles, (row) =>
              _.map(row, (tile) => ({
                ...tile,
                value: tile.value === 'black' ? 'black' : 'empty',
              }))
            ),
          })
        );
        // Set a list of clues in the order of flattened answers
        setClues(
          _.map(
            getFlattenedAnswers(puzzle),
            ({ row, column, direction, answer }) => ({
              row,
              column,
              direction,
              answer: answer.word,
              clue: clueGrid[row][column][direction] || '',
            })
          )
        );
      });
  }, [dispatch, puzzleData]);

  const mkHandleMouseoverTile = useCallback((row, column) => {
    return () => setHoveredTile({ row, column });
  }, []);

  const onTilesMouseOut = useCallback(() => setHoveredTile(null), []);
  const mkHandleClickTile = useCallback(
    (row, column) => {
      return (event) => {
        onClick(row, column);
      };
    },
    [onClick]
  );

  return (
    <div className="content-container">
      <div className="puzzle-player-container">
        <div className="puzzle-container sheet">
          <Tiles
            puzzle={puzzle}
            wave={null}
            tileNumbers={tileNumbers}
            selectedTilesState={selectedTilesState}
            wordLocationsGrid={null}
            hoveredTile={hoveredTile}
            draggedWord={null}
            mkHandleClickTile={mkHandleClickTile}
            mkHandleMouseoverTile={mkHandleMouseoverTile}
            onMouseOut={onTilesMouseOut}
          />
        </div>
      </div>
    </div>
  );
}
