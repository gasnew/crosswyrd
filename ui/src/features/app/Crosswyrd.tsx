import React, { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import NewspaperIcon from '@mui/icons-material/Newspaper';

import { randomId } from '../../app/util';
import {
  DEFAULT_PUZZLE_SIZE,
  setDefaultGridDialogOpen,
  setLetterEntryEnabled,
  setWelcomeDialogState,
  selectDefaultGridDialogOpen,
  selectWelcomeDialogState,
  setPublishInfo,
} from '../builder/builderSlice';
import CrosswordBuilder from '../builder/CrosswordBuilder';
import GridsDialog, { blankGrid } from './GridsDialog';
import KoFiButton from './KoFiButton';
import Navbar, { NAVBAR_HEIGHT } from './Navbar';
import PublishDialog from './PublishDialog';
import useGrids, { GridType } from './useGrids';
import WelcomeDialog from './WelcomeDialog';

function DrawerContents({
  handleClose,
  setGridDialogState,
  handlePublishPuzzle,
}) {
  return (
    <List>
      <ListItem disablePadding>
        <ListItemButton
          onClick={() => {
            handleClose();
            setGridDialogState({ open: true, canClose: true });
          }}
        >
          <ListItemIcon>
            <AddIcon />
          </ListItemIcon>
          <ListItemText primary="New" />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton
          onClick={() => {
            handleClose();
            handlePublishPuzzle();
          }}
        >
          <ListItemIcon>
            <NewspaperIcon />
          </ListItemIcon>
          <ListItemText primary="Publish" />
        </ListItemButton>
      </ListItem>
      <Divider />
      <ListItem disablePadding>
        <div style={{ margin: 'auto', marginTop: 8 }}>
          <KoFiButton />
        </div>
      </ListItem>
    </List>
  );
}

export interface GridWithVersionType extends GridType {
  version: string;
}

export default function CrossWyrd() {
  const defaultGridDialogOpen = useSelector(selectDefaultGridDialogOpen);
  const welcomeDialogState = useSelector(selectWelcomeDialogState);
  const [gridDialogState, setGridDialogState] = useState<{
    open: boolean;
    canClose?: boolean;
  }>({ open: defaultGridDialogOpen, canClose: false });
  const [grid, setGrid] = useState<GridWithVersionType>({
    ...blankGrid(DEFAULT_PUZZLE_SIZE),
    version: randomId(),
  });

  const { grids } = useGrids();

  const dispatch = useDispatch();

  // Publish dialog stuff
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const handlePublishPuzzle = () => {
    setPublishDialogOpen(true);
    // Disable letter entry in the puzzle while the dialog is open.
    dispatch(setLetterEntryEnabled(false));
  };
  const handleClosePublishDialog = () => {
    setPublishDialogOpen(false);
    // Re-enable letter entry in the puzzle.
    dispatch(setLetterEntryEnabled(true));
  };
  const handleCloseWelcomeDialog = useCallback(
    () => dispatch(setWelcomeDialogState({ open: false, showCheckbox: false })),
    [dispatch]
  );

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      <CssBaseline />
      <Navbar supportsDesktopSidebar showInfoButton>
        {(handleClose) => (
          <DrawerContents
            handleClose={handleClose}
            setGridDialogState={setGridDialogState}
            handlePublishPuzzle={handlePublishPuzzle}
          />
        )}
      </Navbar>
      <Box
        component="main"
        sx={{ flexGrow: 1, marginTop: `${NAVBAR_HEIGHT}px` }}
      >
        <CrosswordBuilder grid={grid} />
      </Box>
      <GridsDialog
        open={!welcomeDialogState.open && gridDialogState.open}
        canClose={gridDialogState.canClose || false}
        onClose={() => setGridDialogState({ open: false })}
        grids={grids}
        selectGrid={(grid: GridType) => {
          setGrid({ ...grid, version: randomId() });
          setGridDialogState({ open: false });
          // Now that we've selected a grid, we no longer need the dialog to be
          // open by default
          dispatch(setDefaultGridDialogOpen(false));
          // We're starting a new puzzle, so don't persist any previous publish
          // info
          dispatch(setPublishInfo({ title: '', author: '', id: null }));
        }}
      />
      <PublishDialog
        open={publishDialogOpen}
        onClose={handleClosePublishDialog}
      />
      <WelcomeDialog
        open={welcomeDialogState.open}
        showCheckbox={welcomeDialogState.showCheckbox}
        onClose={handleCloseWelcomeDialog}
      />
    </Box>
  );
}
