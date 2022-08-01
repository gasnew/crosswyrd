import _ from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';

import { CompletePuzzleDataType } from '../app/Crosswyrd';
import { selectPuzzle, setPuzzleState } from '../builder/builderSlice';
import { ALL_LETTERS } from '../builder/constants';
import { LocationType } from '../builder/CrosswordBuilder';
import { getFlattenedAnswers, useClueData } from '../builder/ClueEntry';
import Tiles from '../builder/Tiles';
import useTileInput from '../builder/useTileInput';
import useTileSelection, { DirectionType } from '../builder/useTileSelection';

import './CrosswordPlayer.css';

function usePuzzleData(
  puzzleData: string,
  setClues: (clues: PlayerClueType[]) => void
) {
  const dispatch = useDispatch();

  // Decode and load puzzle data
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
  }, [dispatch, puzzleData, setClues]);
}

function usePuzzleScaleToFit(puzzleRef: HTMLElement | null): number {
  const [scale, setScale] = useState(1);

  const onResize = useCallback(() => {
    if (!puzzleRef) return;
    setScale(window.innerWidth / puzzleRef.clientWidth);
  }, [puzzleRef]);

  // Scale on load
  useEffect(() => {
    if (!puzzleRef) return;
    onResize();
  }, [onResize, puzzleRef]);

  // Add resize listener
  useEffect(() => {
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [onResize]);

  return scale;
}

interface PlayerClueType {
  row: number;
  column: number;
  direction: DirectionType;
  clue: string;
  answer: string;
}

export default function CrosswordPlayer() {
  const [clues, setClues] = useState<PlayerClueType[] | null>(null);

  const puzzle = useSelector(selectPuzzle);
  const { tileNumbers } = useClueData(puzzle);
  const [hoveredTile, setHoveredTile] = useState<LocationType | null>(null);
  const [puzzleRef, setPuzzleRef] = useState<HTMLElement | null>(null);

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
  const { inputKey, releaseKey } = useTileInput(
    puzzle,
    selectedTilesState,
    updateSelectionWithPuzzle,
    clearHoveredTile,
    selectNextAnswer,
    selectBestNext
  );

  const { puzzleData } = useParams();
  usePuzzleData(puzzleData, setClues);

  const puzzleScale = usePuzzleScaleToFit(puzzleRef);

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
    <div className="puzzle-player-content-container">
      <div
        className="puzzle-player-container"
        style={{
          transform: `scale(${puzzleScale})`,
          // Transform from center left when scaling down
          transformOrigin: puzzleScale <= 1 ? 'center left' : 'initial',
        }}
        ref={setPuzzleRef}
      >
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
      <Keyboard
        layout={{
          default: [
            'q w e r t y u i o p',
            'a s d f g h j k l',
            'z x c v b n m {bksp}',
          ],
        }}
        display={{
          ..._.keyBy(_.map(ALL_LETTERS, _.toUpper), (letter) =>
            _.toLower(letter)
          ),
          '{bksp}': 'backspace',
        }}
        onKeyPress={(key) => inputKey(key === '{bksp}' ? 'Backspace' : key)}
        onKeyReleased={(key) =>
          releaseKey(key === '{bksp}' ? 'Backspace' : key)
        }
      />
    </div>
  );
}
