import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import React, { useMemo } from 'react';
import { FixedSizeList } from 'react-window';

import { LetterType } from './builderSlice';
import { DictionaryType } from './CrosswordBuilder';
import { findWordOptions } from './useWaveFunctionCollapse';

interface Props {
  dictionary: DictionaryType;
  optionsSet: LetterType[][];
  onSelect: (word: string) => void;
}

function WordSelector({ dictionary, optionsSet, onSelect }: Props) {
  const words = useMemo(() => findWordOptions(dictionary, optionsSet), [
    dictionary,
    optionsSet,
  ]);

  return (
    <div className="word-selector-container">
      <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
        <List>
          <FixedSizeList
            height={350}
            itemCount={words.length}
            itemSize={46}
            width={250}
            overscanCount={5}
          >
            {({ index, style }) => (
              <ListItem disablePadding style={style} component="div">
                <ListItemButton onClick={() => onSelect(words[index])}>
                  <ListItemText primary={words[index]} />
                </ListItemButton>
              </ListItem>
            )}
          </FixedSizeList>
        </List>
      </Box>
    </div>
  );
}

export default React.memo(WordSelector);
