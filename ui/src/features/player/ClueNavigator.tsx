import _ from 'lodash';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import IconButton from '@mui/material/IconButton';
import { useMemo } from 'react';

import { LocationType } from '../builder/CrosswordBuilder';
import { PlayerClueType } from './CrosswordPlayer';
import {
  DirectionType,
  SelectedTilesStateType,
} from '../builder/useTileSelection';

interface Props {
  selectedTilesState: SelectedTilesStateType | null;
  clues: PlayerClueType[];
  selectNextAnswer: (forward: boolean) => void;
  updateSelection: (
    primaryLocation: LocationType,
    direction?: DirectionType
  ) => void;
}
export default function ClueNavigator({
  selectedTilesState,
  clues,
  selectNextAnswer,
  updateSelection,
}: Props) {
  const clue = useMemo<PlayerClueType | null>(() => {
    if (!selectedTilesState) return null;
    const firstLocation = selectedTilesState.locations[0];
    return (
      _.find(
        clues,
        ({ row, column, direction }) =>
          row === firstLocation.row &&
          column === firstLocation.column &&
          direction === selectedTilesState.direction
      ) || null
    );
  }, [selectedTilesState, clues]);

  const handleClickClue = () => {
    if (!selectedTilesState) return;
    const { primaryLocation, direction } = selectedTilesState;
    updateSelection(
      primaryLocation,
      direction === 'across' ? 'down' : 'across'
    );
  };

  return (
    <div className="clue-navigator sheet">
      <IconButton
        color="inherit"
        className="clue-nav-arrow-button"
        onClick={() => selectNextAnswer(false)}
      >
        <ArrowBackIosIcon />
      </IconButton>
      <div className="clue-nav-clue-box" onClick={handleClickClue}>
        {clue?.clue}
      </div>
      <IconButton
        color="inherit"
        className="clue-nav-arrow-button"
        onClick={() => selectNextAnswer(true)}
      >
        <ArrowForwardIosIcon />
      </IconButton>
    </div>
  );
}
