import _ from 'lodash';
import {
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListSubheader,
} from '@mui/material';
import React from 'react';

import {
  DirectionType,
  SelectedTilesStateType,
} from '../builder/useTileSelection';
import { TileNumbersType } from '../builder/ClueEntry';
import { LocationType } from '../builder/CrosswordBuilder';
import { PlayerClueType } from './CrosswordPlayer';

function ClueListEntry({ tileNumber, clue, selected }) {
  return (
    <ListItemButton
      className={
        'clue-list-entry' + (selected ? ' clue-list-entry--selected' : '')
      }
    >
      <span
        style={{
          width: 20,
          textAlign: 'right',
          fontWeight: 'bold',
          marginRight: 5,
        }}
      >
        {tileNumber}.
      </span>
      <span>{clue.clue}</span>
    </ListItemButton>
  );
}

function ClueList({
  direction,
  clues,
  tileNumbers,
  updateSelection,
  selectedTilesState,
}: {
  direction: DirectionType;
  clues: PlayerClueType[];
  tileNumbers: TileNumbersType;
  updateSelection: (
    primaryLocation: LocationType,
    direction?: DirectionType
  ) => void;
  selectedTilesState: SelectedTilesStateType | null;
}) {
  const selectedTileLocations = selectedTilesState?.locations || [];

  return (
    <div className="clues-sidebar-list-container">
      <ListSubheader style={{ lineHeight: '36px', paddingLeft: 8 }}>
        {_.capitalize(direction)}
      </ListSubheader>
      <Divider style={{ marginRight: 8, marginBottom: 8 }} />
      <List className="clues-sidebar-list">
        {_.map(clues, (clue, index) => (
          <ListItem key={index} component="div" disablePadding>
            <ClueListEntry
              tileNumber={tileNumbers[clue.row][clue.column]}
              clue={clue}
              selected={
                selectedTileLocations.length > 1 &&
                direction ===
                  (selectedTileLocations[1].row > selectedTileLocations[0].row
                    ? 'down'
                    : 'across') &&
                clue.row === selectedTileLocations[0].row &&
                clue.column === selectedTileLocations[0].column
              }
            />
          </ListItem>
        ))}
      </List>
    </div>
  );
}

interface Props {
  clues: PlayerClueType[];
  tileNumbers: TileNumbersType;
  updateSelection: (
    primaryLocation: LocationType,
    direction?: DirectionType
  ) => void;
  selectedTilesState: SelectedTilesStateType | null;
}
export default function CluesSidebar({
  clues,
  tileNumbers,
  updateSelection,
  selectedTilesState,
}: Props) {
  return (
    <>
      <ClueList
        direction="across"
        clues={_.filter(clues, ['direction', 'across'])}
        tileNumbers={tileNumbers}
        updateSelection={updateSelection}
        selectedTilesState={selectedTilesState}
      />
      <ClueList
        direction="down"
        clues={_.filter(clues, ['direction', 'down'])}
        tileNumbers={tileNumbers}
        updateSelection={updateSelection}
        selectedTilesState={selectedTilesState}
      />
    </>
  );
}

// TODO memoize?
