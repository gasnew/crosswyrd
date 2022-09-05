import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import AppBar from '@mui/material/AppBar';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MenuIcon from '@mui/icons-material/Menu';
import Toolbar from '@mui/material/Toolbar';

import { setWelcomeDialogState } from '../builder/builderSlice';
import { PuzzleMetadataType } from '../player/CrosswordPlayer';

const SHOW_FULL_CROSSWYRD_WIDTH = 730;

function useShowFullCrosswyrd(): boolean {
  const [show, setShow] = useState<boolean>(false);

  const onResize = useCallback(() => {
    if (!show && window.innerWidth > SHOW_FULL_CROSSWYRD_WIDTH) setShow(true);
    if (show && window.innerWidth <= SHOW_FULL_CROSSWYRD_WIDTH) setShow(false);
  }, [show]);

  // Set on load
  const init = useRef(false);
  useEffect(() => {
    if (init.current) return;
    init.current = true;
    onResize();
    setTimeout(() => onResize(), 1000);
  }, [onResize]);

  // Add resize listener
  useEffect(() => {
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [onResize]);

  return show;
}

const drawerWidth = 200;

function DrawerControls({
  handleDrawerToggle,
  supportsDesktopSidebar,
  children,
}: {
  handleDrawerToggle: () => void;
  supportsDesktopSidebar?: boolean;
  children: (handleClose: () => void) => React.ReactNode;
}) {
  return (
    <div>
      <Toolbar style={{ height: 64 }}>
        <IconButton
          color="inherit"
          aria-label="close drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={supportsDesktopSidebar ? { display: { lg: 'none' } } : {}}
        >
          <ArrowBackIcon />
        </IconButton>
        <div className="navbar-puzzle-crosswyrd-logo-and-title">
          <img
            src="/logo152.png"
            alt="Crosswyrd"
            className="navbar-crosswyrd-logo"
            style={{ margin: 'auto' }}
          />
          <span className="navbar-puzzle-crosswyrd">CROSSWYRD</span>
        </div>
      </Toolbar>
      <Divider style={{ height: 0 }} />
      <Box sx={{ overflow: 'auto' }}>{children(handleDrawerToggle)}</Box>
    </div>
  );
}
interface Props {
  children: (handleClose: () => void) => React.ReactNode;
  supportsDesktopSidebar?: boolean;
  showInfoButton?: boolean;
  meta?: PuzzleMetadataType | null;
}

export default function Navbar({
  children,
  supportsDesktopSidebar,
  showInfoButton,
  meta,
}: Props) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const dispatch = useDispatch();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  const handleOpenInfo = () => {
    dispatch(setWelcomeDialogState({ open: true, showCheckbox: false }));
  };
  const showFullCrosswyrd = useShowFullCrosswyrd();

  return (
    <>
      <AppBar
        position="fixed"
        color="transparent"
        sx={{
          ...(supportsDesktopSidebar
            ? {
                width: { lg: `calc(100% - ${drawerWidth}px)` },
                ml: { lg: `${drawerWidth}px` },
              }
            : {}),
          backgroundColor: '#fff',
          borderBottom: '1px solid',
          borderColor: '#e0e2e6',
        }}
        elevation={0}
      >
        <Toolbar style={{ height: 64, width: '100%' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={
              supportsDesktopSidebar ? { mr: 2, display: { lg: 'none' } } : {}
            }
          >
            <MenuIcon />
          </IconButton>
          <Box
            sx={
              supportsDesktopSidebar
                ? {
                    display: { xs: 'flex', lg: 'none' },
                  }
                : { display: 'flex' }
            }
          >
            <img
              src="/logo152.png"
              alt="Crosswyrd"
              className="navbar-crosswyrd-logo"
            />
            {(showFullCrosswyrd || supportsDesktopSidebar) && (
              <span className="navbar-puzzle-crosswyrd">CROSSWYRD</span>
            )}
          </Box>
          {meta && (
            <>
              <Divider orientation="vertical" flexItem style={{ margin: 16 }} />
              <div className="navbar-puzzle-title-container">
                <div className="navbar-puzzle-title">{meta.title}</div>
                <span className="navbar-puzzle-author">
                  by&nbsp;{meta.author}
                </span>
              </div>
            </>
          )}
          {showInfoButton && (
            <IconButton
              color="inherit"
              aria-label="show info"
              edge="start"
              onClick={handleOpenInfo}
              style={{ marginLeft: 'auto' }}
            >
              <HelpOutlineIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={
          supportsDesktopSidebar
            ? { width: { lg: drawerWidth }, flexShrink: { lg: 0 } }
            : {}
        }
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          sx={{
            ...(supportsDesktopSidebar
              ? { display: { xs: 'block', lg: 'none' } }
              : {}),
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          <DrawerControls
            handleDrawerToggle={handleDrawerToggle}
            supportsDesktopSidebar={supportsDesktopSidebar}
            children={children}
          />
        </Drawer>
        {supportsDesktopSidebar && (
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
              supportsDesktopSidebar={supportsDesktopSidebar}
              children={children}
            />
          </Drawer>
        )}
      </Box>
    </>
  );
}
