import IconButton, { IconButtonProps } from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Collapse, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';

import {
  CLUE_SUGGESTER_BAR_HEIGHT,
  CLUE_SUGGESTER_BODY_HEIGHT,
} from './ClueEntry';

interface ExpandMoreProps extends IconButtonProps {
  expand: boolean;
}

const ExpandMore = styled((props: ExpandMoreProps) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme, expand }) => ({
  transform: !expand ? 'rotate(0deg)' : 'rotate(180deg)',
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
}));

interface Props {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  selectedWord: string | null;
}

export default function ClueSuggester({
  expanded,
  setExpanded,
  selectedWord,
}: Props) {
  const handleExpandClick = () => setExpanded(!expanded);

  return (
    <div className="clue-suggester">
      <Divider style={{ width: '100%' }} />
      <div
        className="clue-suggester-bar"
        style={{ height: CLUE_SUGGESTER_BAR_HEIGHT }}
      >
        <span
          style={{
            fontWeight: 'bold',
            fontSize: 16,
            margin: 'auto',
            marginLeft: 0,
          }}
        >
          Clue Examples
        </span>
        <ExpandMore
          expand={expanded}
          onClick={handleExpandClick}
          aria-expanded={expanded}
          aria-label="show more"
        >
          <ExpandMoreIcon />
        </ExpandMore>
      </div>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <div
          className="clue-suggester-body"
          style={{ height: CLUE_SUGGESTER_BODY_HEIGHT }}
        >
          {selectedWord}
          <p>A whole paragraph...</p>
          <p>of things!!</p>
        </div>
      </Collapse>
    </div>
  );
}
