// This is adapted from https://mui.com/material-ui/react-tabs/
import React, { useLayoutEffect } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
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
  tilesSelected: boolean;
  clearSelection: () => void;
  wordSelector: React.ReactNode;
  wordBank: React.ReactNode;
  clueEntry: React.ReactNode;
}

export default function BuilderTabs({
  tilesSelected,
  clearSelection,
  wordSelector,
  wordBank,
  clueEntry,
}: Props) {
  const [value, setValue] = React.useState(0);

  // Set tab to "Dictionary" when tiles are selected
  useLayoutEffect(() => {
    if (tilesSelected && value === 1) setValue(0);
  }, [tilesSelected, value]);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    // Clear selection if moved tab to "Word Bank"
    if (newValue === 1) clearSelection();
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
        >
          <Tab label="Dictionary" {...a11yProps(0)} />
          <Tab label="Word Bank" {...a11yProps(1)} />
          <Tab label="Clues" {...a11yProps(1)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        {wordSelector}
      </TabPanel>
      <TabPanel value={value} index={1}>
        {wordBank}
      </TabPanel>
      <TabPanel value={value} index={2}>
        {clueEntry}
      </TabPanel>
    </Box>
  );
}
