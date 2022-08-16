import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import AddIcon from '@mui/icons-material/Add';
import AppBar from '@mui/material/AppBar';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuIcon from '@mui/icons-material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import NewspaperIcon from '@mui/icons-material/Newspaper';

import { devMode, randomId } from '../../app/util';
import {
  DEFAULT_PUZZLE_SIZE,
  setLetterEntryEnabled,
} from '../builder/builderSlice';
import CrosswordBuilder from '../builder/CrosswordBuilder';
import GridsDialog, { blankGrid } from './GridsDialog';
import PublishDialog from './PublishDialog';
import useGrids, { GridType } from './useGrids';

const drawerWidth = 200;

function DrawerControls({
  handleDrawerToggle,
  setGridDialogState,
  handlePublishPuzzle,
}) {
  return (
    <div>
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="close drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { lg: 'none' } }}
        >
          <ArrowBackIcon />
        </IconButton>
      </Toolbar>
      <Divider style={{ height: 0 }} />
      <Box sx={{ overflow: 'auto' }}>
        <List>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                handleDrawerToggle();
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
                handleDrawerToggle();
                handlePublishPuzzle();
              }}
            >
              <ListItemIcon>
                <NewspaperIcon />
              </ListItemIcon>
              <ListItemText primary="Publish" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </div>
  );
}

export interface GridWithVersionType extends GridType {
  version: string;
}

export default function CrossWyrd() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Default grid dialog to open unless in development mode
  const [gridDialogState, setGridDialogState] = useState<{
    open: boolean;
    canClose?: boolean;
  }>({ open: !devMode(), canClose: false });
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

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          ml: { lg: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { lg: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            component="div"
            style={{ margin: 'auto' }}
          >
            CROSSWYRD
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { lg: drawerWidth }, flexShrink: { lg: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          sx={{
            display: { xs: 'block', lg: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          <DrawerControls
            handleDrawerToggle={handleDrawerToggle}
            setGridDialogState={setGridDialogState}
            handlePublishPuzzle={handlePublishPuzzle}
          />
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', lg: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          <DrawerControls
            handleDrawerToggle={handleDrawerToggle}
            setGridDialogState={setGridDialogState}
            handlePublishPuzzle={handlePublishPuzzle}
          />
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1 }}>
        <CrosswordBuilder grid={grid} />
      </Box>
      <GridsDialog
        open={gridDialogState.open}
        canClose={gridDialogState.canClose || false}
        onClose={() => setGridDialogState({ open: false })}
        grids={grids}
        selectGrid={(grid: GridType) => {
          setGrid({ ...grid, version: randomId() });
          setGridDialogState({ open: false });
        }}
      />
      <PublishDialog
        open={publishDialogOpen}
        onClose={handleClosePublishDialog}
      />
    </Box>
  );
}
