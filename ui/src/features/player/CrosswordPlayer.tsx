import _ from 'lodash';
import React, { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { GridWithVersionType } from '../app/Crosswyrd';
import { selectPuzzle } from '../builder/builderSlice';
import { LocationType } from '../builder/CrosswordBuilder';
import { useClueData } from '../builder/ClueEntry';
import Tiles from '../builder/Tiles';
import useTileInput from '../builder/useTileInput';
import useTileSelection from '../builder/useTileSelection';

import './CrosswordPlayer.css';

export default function CrosswordBuilder() {
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
