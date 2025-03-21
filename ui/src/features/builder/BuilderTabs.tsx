// This is adapted from https://mui.com/material-ui/react-tabs/
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import React, { useLayoutEffect } from 'react';
import { useDispatch } from 'react-redux';

import { setCurrentTab } from './builderSlice';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  style?: any;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      <Box
        style={{
          visibility: value === index ? 'visible' : 'hidden',
          paddingTop: 8,
        }}
      >
        {children}
      </Box>
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

interface Props {
  currentTab: number;
  tilesSelected: boolean;
  clearSelection: () => void;
  wordSelector: React.ReactNode;
  wordBank: React.ReactNode;
  clueEntry: React.ReactNode;
}

function BuilderTabs({
  currentTab,
  tilesSelected,
  clearSelection,
  wordSelector,
  wordBank,
  clueEntry,
}: Props) {
  const dispatch = useDispatch();

  // Set tab to "Fill" when tiles are selected
  useLayoutEffect(() => {
    if (tilesSelected && currentTab === 1) dispatch(setCurrentTab(0));
  }, [tilesSelected, dispatch, currentTab]);

  const handleChange = (event: React.SyntheticEvent, newCurrentTab: number) => {
    // Clear selection if moved tab to "Word Bank"
    if (newCurrentTab === 1) clearSelection();
    dispatch(setCurrentTab(newCurrentTab));
  };

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={currentTab}
          onChange={handleChange}
          aria-label="basic tabs example"
        >
          <Tab label="Fill" {...a11yProps(0)} />
          <Tab label="Word Bank" {...a11yProps(1)} />
          <Tab label="Clues" {...a11yProps(1)} />
        </Tabs>
      </Box>
      <TabPanel value={currentTab} index={0}>
        {wordSelector}
      </TabPanel>
      <TabPanel value={currentTab} index={1}>
        {wordBank}
      </TabPanel>
      <TabPanel value={currentTab} index={2}>
        {clueEntry}
      </TabPanel>
    </Box>
  );
}

export default React.memo(BuilderTabs);
