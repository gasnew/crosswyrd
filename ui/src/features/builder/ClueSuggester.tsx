import axios from 'axios';
import dayjs from 'dayjs';
import _ from 'lodash';
import IconButton, { IconButtonProps } from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Collapse,
  Divider,
  Table,
  TableCell,
  TableContainer,
  TableBody,
  TableHead,
  TableRow,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';

import {
  CLUE_SUGGESTER_BAR_HEIGHT,
  CLUE_SUGGESTER_BODY_HEIGHT,
} from './ClueEntry';
import { DifficultyChip, getDifficulty } from '../app/GridsDialog';

interface ClueEntryType {
  clue: string;
  lastSeen: string;
  timesSeen: number;
}
interface HistoricalCluesType {
  getCluesForWord: (word: string | null) => ClueEntryType[];
}

function useHistoricalClues(): HistoricalCluesType {
  const [clues, setClues] = React.useState<HistoricalCluesType>({
    getCluesForWord: (word) => [],
  });

  // Fetch clues on mount
  React.useEffect(() => {
    const fetchClues = async () => {
      const response = await axios.get('clues_raw.json');
      const cluesData = response.data as {
        [word: string]: {
          [clue: string]: { last_seen: string; times_seen: number };
        };
      };
      const clues = _.mapValues(cluesData, (clues) =>
        _.map(clues, ({ last_seen, times_seen }, clue) => ({
          lastSeen: last_seen,
          timesSeen: times_seen,
          clue,
        }))
      );

      setClues({
        getCluesForWord: (word) => {
          if (!word || _.includes(word, '-')) return [];
          return clues[_.toUpper(word)] || [];
        },
      });
    };

    fetchClues();
  }, []);

  return clues;
}

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
  enterClue: (clue: string) => void;
}

export default function ClueSuggester({
  expanded,
  setExpanded,
  selectedWord,
  enterClue,
}: Props) {
  const clues = useHistoricalClues();

  const handleExpandClick = () => setExpanded(!expanded);
  const mkHandleClickClue = (clue: string) => () => enterClue(clue);

  return (
    <div className="clue-suggester">
      <Divider style={{ width: '100%' }} />
      <div
        className="clue-suggester-bar"
        style={{ height: CLUE_SUGGESTER_BAR_HEIGHT }}
        onClick={handleExpandClick}
      >
        <span
          style={{
            fontWeight: 'bold',
            fontSize: 16,
            margin: 'auto',
            marginLeft: 0,
          }}
        >
          Clue Examples{selectedWord && ` - ${_.toUpper(selectedWord)}`}
        </span>
        <ExpandMore
          expand={expanded}
          aria-expanded={expanded}
          aria-label="show more"
        >
          <ExpandMoreIcon />
        </ExpandMore>
      </div>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <TableContainer
          className="clue-suggester-body"
          style={{ height: CLUE_SUGGESTER_BODY_HEIGHT }}
        >
          {clues.getCluesForWord(selectedWord).length > 0 ? (
            <Table stickyHeader aria-label="sticky table" size="small">
              <TableHead>
                <TableRow>
                  <TableCell style={{ width: '50%' }}>Clue</TableCell>
                  <TableCell style={{ width: '25%' }}>Usages</TableCell>
                  <TableCell style={{ width: '25%' }}>Last&nbsp;Seen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {_.map(
                  _.sortBy(clues.getCluesForWord(selectedWord), [
                    (clue) => -clue.timesSeen,
                    (clue) => -dayjs(clue.lastSeen).year(),
                    (clue) => {
                      const difficulty = getDifficulty(clue.lastSeen);
                      return difficulty === 'easy'
                        ? 0
                        : difficulty === 'medium'
                        ? 1
                        : 2;
                    },
                  ]),
                  ({ clue, timesSeen, lastSeen }, index) => (
                    <TableRow
                      hover
                      role="checkbox"
                      tabIndex={-1}
                      key={clue}
                      style={{ cursor: 'pointer' }}
                      onClick={mkHandleClickClue(clue)}
                    >
                      <TableCell style={{ display: 'flex' }}>
                        <DifficultyChip
                          date={lastSeen}
                          short
                          style={{
                            margin: 'auto',
                            marginLeft: 0,
                            marginRight: 0,
                            width: 28,
                            minWidth: 28,
                          }}
                        />
                        <span style={{ marginLeft: 8 }}>{clue}</span>
                      </TableCell>
                      <TableCell>{timesSeen}</TableCell>
                      <TableCell>{dayjs(lastSeen).year()}</TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          ) : (
            <div style={{ display: 'flex', height: '100%' }}>
              {selectedWord ? (
                <span className="clue-suggester-comment">
                  No clues found for this word
                </span>
              ) : (
                <span className="clue-suggester-comment">No clue selected</span>
              )}
            </div>
          )}
        </TableContainer>
      </Collapse>
    </div>
  );
}
