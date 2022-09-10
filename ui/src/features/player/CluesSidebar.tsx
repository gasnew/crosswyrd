import _ from 'lodash';
import {
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListSubheader,
} from '@mui/material';
import React, { useEffect, useMemo, useRef } from 'react';

import { CrosswordPuzzleType } from '../builder/builderSlice';
import {
  DirectionType,
  SelectedTilesStateType,
} from '../builder/useTileSelection';
import {
  AnswerEntryType,
  AnswerGridCellType,
  getAnswerGrid,
  TileNumbersType,
} from '../builder/ClueEntry';
import { PlayerClueType } from './CrosswordPlayer';

function ClueListEntry({
  entryRef,
  tileNumber,
  clue,
  selected,
  complete,
  onClick,
}) {
  return (
    <ListItemButton
      className={
        'clue-list-entry' +
        (selected ? ' clue-list-entry--selected' : '') +
        (complete ? ' clue-list-entry--complete' : '')
      }
      onClick={(event) => {
        // We do not want hitting a key to click the button because we handle
        // key inputs elsewhere.
        if (event.type === 'keydown' || event.type === 'keyup') return;
        onClick();
      }}
    >
      <span
        ref={entryRef}
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
  answerGrid,
  clues,
  tileNumbers,
  selectAnswer,
  selectedTilesState,
}: {
  direction: DirectionType;
  answerGrid: AnswerGridCellType[][];
  clues: PlayerClueType[];
  tileNumbers: TileNumbersType;
  selectAnswer: (answer: AnswerEntryType) => void;
  selectedTilesState: SelectedTilesStateType | null;
}) {
  const selectedTileLocations = useMemo(
    () => selectedTilesState?.locations || [],
    [selectedTilesState]
  );
  const refsGrid = useRef<(HTMLElement | null)[][] | null>(null);

  // Set the refs grid when the grid changes size
  useEffect(() => {
    refsGrid.current = _.times(tileNumbers.length, (row) =>
      _.times(tileNumbers.length, (column) => null)
    );
  }, [tileNumbers.length]);

  // Scroll to the selected clue
  useEffect(() => {
    if (
      !selectedTilesState ||
      selectedTilesState.locations.length === 0 ||
      selectedTilesState.direction !== direction
    )
      return;
    const location = selectedTilesState.locations[0];
    const ref = refsGrid.current?.[location.row]?.[location.column];
    if (ref)
      ref.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
  }, [selectedTilesState, refsGrid, direction]);

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
              entryRef={(ref) => {
                if (
                  refsGrid.current &&
                  clue.row < refsGrid.current.length &&
                  clue.column < refsGrid.current.length
                )
                  refsGrid.current[clue.row][clue.column] = ref;
              }}
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
              complete={
                !!answerGrid[clue.row][clue.column][direction]?.complete
              }
              onClick={() => {
                const answer = answerGrid[clue.row][clue.column][direction];
                if (!answer) return;
                selectAnswer({
                  row: clue.row,
                  column: clue.column,
                  direction,
                  answer,
                });
              }}
            />
          </ListItem>
        ))}
      </List>
    </div>
  );
}

interface Props {
  puzzle: CrosswordPuzzleType;
  clues: PlayerClueType[];
  tileNumbers: TileNumbersType;
  selectAnswer: (answer: AnswerEntryType) => void;
  selectedTilesState: SelectedTilesStateType | null;
}
function CluesSidebar({
  puzzle,
  clues,
  tileNumbers,
  selectAnswer,
  selectedTilesState,
}: Props) {
  const answerGrid = useMemo(() => getAnswerGrid(puzzle), [puzzle]);

  return (
    <>
      <ClueList
        direction="across"
        answerGrid={answerGrid}
        clues={_.filter(clues, ['direction', 'across'])}
        tileNumbers={tileNumbers}
        selectAnswer={selectAnswer}
        selectedTilesState={selectedTilesState}
      />
      <ClueList
        direction="down"
        answerGrid={answerGrid}
        clues={_.filter(clues, ['direction', 'down'])}
        tileNumbers={tileNumbers}
        selectAnswer={selectAnswer}
        selectedTilesState={selectedTilesState}
      />
    </>
  );
}

export default React.memo(CluesSidebar);
