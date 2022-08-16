import { doc, getDoc } from 'firebase/firestore';
import _ from 'lodash';
import { Alert } from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';

import { CompletePuzzleDataType } from '../app/PublishDialog';
import {
  CrosswordPuzzleType,
  selectPuzzle,
  setPuzzleState,
} from '../builder/builderSlice';
import { ALL_LETTERS } from '../builder/constants';
import { LocationType } from '../builder/CrosswordBuilder';
import { getFlattenedAnswers, useClueData } from '../builder/ClueEntry';
import Tiles from '../builder/Tiles';
import useTileInput from '../builder/useTileInput';
import useTileSelection, { DirectionType } from '../builder/useTileSelection';
import ClueNavigator from './ClueNavigator';
import CompletePuzzleDialog from './CompletePuzzleDialog';
import { db } from '../../firebase';

import './CrosswordPlayer.css';

export interface PlayerClueType {
  row: number;
  column: number;
  direction: DirectionType;
  clue: string;
  answer: string;
}

export interface PuzzleMetadataType {
  title: string;
  author: string;
}
interface PuzzleDataReturnType {
  puzzleKey: CrosswordPuzzleType | null;
  puzzleMetadata: PuzzleMetadataType | null;
  failed: boolean;
}
function usePuzzleData(
  puzzleId: string,
  setClues: (clues: PlayerClueType[]) => void
): PuzzleDataReturnType {
  const [failed, setFailed] = useState(false);
  const [puzzleKey, setPuzzleKey] = useState<CrosswordPuzzleType | null>(null);
  const [
    puzzleMetadata,
    setPuzzleMetadata,
  ] = useState<PuzzleMetadataType | null>(null);

  const dispatch = useDispatch();

  // Fetch, decode, and load puzzle data
  useEffect(() => {
    const fetchPuzzle = async () => {
      // Fetch the puzzle data
      const remotePuzzle = await getDoc(doc(db, 'puzzles', puzzleId));
      if (!remotePuzzle.exists()) {
        setFailed(true);
        return;
      }
      const remoteData = remotePuzzle.data();

      // Decode the puzzle data
      var codec = require('json-url')('lzma');
      const { puzzle, clueGrid } = (await codec.decompress(
        remoteData.dataLzma
      )) as CompletePuzzleDataType;

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
      // Set the puzzle key and metadata
      setPuzzleKey(puzzle);
      setPuzzleMetadata({ title: remoteData.title, author: remoteData.author });
    };

    fetchPuzzle();
  }, [dispatch, puzzleId, setClues]);

  return { puzzleKey, puzzleMetadata, failed };
}

interface ScaleDataType {
  scale: number;
  limitingDimension: 'horizontal' | 'vertical';
}
function usePuzzleScaleToFit(puzzleRef: HTMLElement | null): ScaleDataType {
  const [scaleData, setScaleData] = useState<ScaleDataType>({
    scale: 1,
    limitingDimension: 'horizontal',
  });

  const onResize = useCallback(() => {
    if (!puzzleRef) return;
    const horizontalScale = (window.innerWidth - 16) / puzzleRef.clientWidth;
    // Scale vertically with some buffer for the keyboard
    const verticalScale = (window.innerHeight - 228) / puzzleRef.clientHeight;
    setScaleData({
      // Scale by whichever dimension is more limiting
      scale: Math.min(horizontalScale, verticalScale),
      limitingDimension:
        horizontalScale < verticalScale ? 'horizontal' : 'vertical',
    });
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

  return scaleData;
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
    updateSelection,
  } = useTileSelection(puzzle, null, false, false, true);
  const clearHoveredTile = useCallback(() => setHoveredTile(null), [
    setHoveredTile,
  ]);
  const { inputKey, releaseKey } = useTileInput(
    puzzle,
    selectedTilesState,
    updateSelectionWithPuzzle,
    clearHoveredTile,
    selectNextAnswer,
    selectBestNext,
    true
  );

  const { puzzleId } = useParams();
  const {
    puzzleKey,
    puzzleMetadata,
    failed: puzzleFetchFailed,
  } = usePuzzleData(puzzleId, setClues);
  const { scale: puzzleScale } = usePuzzleScaleToFit(puzzleRef);

  // Default the selection to the first clue
  useEffect(() => {
    if (selectedTilesState || !clues || clues.length === 0) return;
    updateSelection({ row: clues[0].row, column: clues[0].column }, 'across');
  }, [clues, selectedTilesState, updateSelection]);

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

  if (puzzleFetchFailed)
    return (
      <div style={{ display: 'flex', height: '100%', width: '100%' }}>
        <Alert severity="error" style={{ margin: 'auto' }}>
          No puzzle "{puzzleId}" found!
        </Alert>
      </div>
    );
  if (!clues) return null;
  return (
    <div className="puzzle-player-content-container">
      <div
        className="puzzle-player-container"
        style={{
          position: 'relative',
          left: '50%',
          transform: `translate(-50%, 8px) scale(${puzzleScale})`,
          transformOrigin: 'top center',
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
      <div className="puzzle-player-input-container">
        <ClueNavigator
          selectedTilesState={selectedTilesState}
          clues={clues}
          selectNextAnswer={selectNextAnswer}
          updateSelection={updateSelection}
        />
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
            '{bksp}': '⌫',
          }}
          onKeyPress={(key) => inputKey(key === '{bksp}' ? 'Backspace' : key)}
          onKeyReleased={(key) =>
            releaseKey(key === '{bksp}' ? 'Backspace' : key)
          }
        />
      </div>
      {puzzleKey && puzzleMetadata && (
        <CompletePuzzleDialog
          puzzle={puzzle}
          puzzleKey={puzzleKey}
          puzzleMetadata={puzzleMetadata}
        />
      )}
    </div>
  );
}
