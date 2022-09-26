import axios from 'axios';
import dayjs from 'dayjs';
import _ from 'lodash';
import IconButton, { IconButtonProps } from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  CircularProgress,
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

// NOTE(gnewman): Add me to some code that runs once, and create an element
// with ID "compressed-file-download" to compress and download any file in the
// public folder.
//async function download_txt() {
//  console.log('click!!');

//  console.log('download!!');
//  const response = await axios.get('clues_raw.json');
//  const cluesData = response.data;

//  console.log('encode!!');
//  var codec = require('json-url')('lzma');
//  var textToSave = await codec.compress(cluesData);
//  if (!textToSave) return;

//  console.log('download!!');
//  var hiddenElement = document.createElement('a');
//  hiddenElement.href = 'data:attachment/text,' + encodeURI(textToSave);
//  hiddenElement.target = '_blank';
//  hiddenElement.download = 'myFile.txt';
//  hiddenElement.click();
//}
//document
//  ?.getElementById('compressed-file-download')
//  ?.addEventListener('click', download_txt);

interface ClueEntryType {
  clue: string;
  lastSeen: string;
  timesSeen: number;
}
interface HistoricalCluesType {
  getCluesForWord: (word: string | null) => ClueEntryType[];
  loading: boolean;
}

function useHistoricalClues(selectedWord: string | null): HistoricalCluesType {
  const [clues, setClues] = React.useState<HistoricalCluesType>({
    getCluesForWord: (word) => [],
    loading: false,
  });

  // Fetch clues once we have a completed word to fetch for
  const triedLoad = React.useRef(false);
  React.useEffect(() => {
    // Only try to fetch once we have a complete word to fetch for
    if (!selectedWord || _.includes(selectedWord, '-')) return;

    // Don't ever allow fetching to happen more than once (maybe someday we'll
    // have a retry button?)
    if (triedLoad.current) return;
    triedLoad.current = true;

    // Set loading
    setClues({
      getCluesForWord: (word) => [],
      loading: true,
    });

    const fetchClues = async () => {
      // Fetch remote clue data
      const response = await axios.get('clues.lzma');
      const compressedCluesData = response.data;

      // Decode the data
      var codec = require('json-url')('lzma');
      const cluesData = (await codec.decompress(compressedCluesData)) as {
        [word: string]: {
          [clue: string]: { last_seen: string; times_seen: number };
        };
      };

      // Map data to frontend world
      const clues = _.mapValues(cluesData, (clues) =>
        _.map(clues, ({ last_seen, times_seen }, clue) => ({
          lastSeen: last_seen,
          timesSeen: times_seen,
          clue,
        }))
      );

      // Set the clues state
      setClues({
        getCluesForWord: (word) => {
          if (!word || _.includes(word, '-')) return [];
          return clues[_.toUpper(word)] || [];
        },
        loading: false,
      });
    };

    fetchClues();
  }, [selectedWord]);

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
  const clues = useHistoricalClues(selectedWord);

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
          {clues.loading ? (
            <div style={{ display: 'flex', height: '100%' }}>
              <CircularProgress
                style={{ margin: 'auto' }}
                size={50}
                thickness={4}
                disableShrink
              />
            </div>
          ) : clues.getCluesForWord(selectedWord).length > 0 ? (
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
