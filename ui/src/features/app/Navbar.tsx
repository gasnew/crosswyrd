import React from 'react';
import AppBar from '@mui/material/AppBar';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

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
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="close drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={supportsDesktopSidebar ? { mr: 2, display: { lg: 'none' } } : {}}
        >
          <ArrowBackIcon />
        </IconButton>
      </Toolbar>
      <Divider style={{ height: 0 }} />
      <Box sx={{ overflow: 'auto' }}>{children(handleDrawerToggle)}</Box>
    </div>
  );
}
interface Props {
  children: (handleClose: () => void) => React.ReactNode;
  supportsDesktopSidebar?: boolean;
}

export default function Navbar({ children, supportsDesktopSidebar }: Props) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

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
        <Toolbar style={{ height: 64 }}>
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
