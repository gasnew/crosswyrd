import axios from 'axios';
import copy from 'copy-to-clipboard';
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { colors, Slide, Snackbar } from '@mui/material';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import LinkIcon from '@mui/icons-material/Link';
import { v4 as uuidv4 } from 'uuid';

import {
  CrosswordPuzzleType,
  ClueGridType,
  selectPuzzle,
  selectClueGrid,
} from '../builder/builderSlice';
import { db, logEvent } from '../../firebase';
import { GarrettNote } from './KoFiButton';
import { ShareButtons } from '../player/CompletePuzzleDialog';

const CHARACTER_LIMIT = 45;

export const CopyAlertSnackbar = React.memo(
  ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    return (
      <Snackbar
        open={open}
        onClose={(event, reason) => {
          if (reason === 'clickaway') {
            return;
          }
          onClose();
        }}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={(props) => <Slide {...props} direction="down" />}
      >
        <Alert sx={{ width: '100%' }}>Link copied!</Alert>
      </Snackbar>
    );
  }
);

export interface CompletePuzzleDataType {
  puzzle: CrosswordPuzzleType;
  clueGrid: ClueGridType;
}

function getPuzzleLink(id: string): string {
  return `${window.location.origin}/puzzles/${id}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PublishDialog({ open, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [state, setState] = useState<'prePublish' | 'publishing' | 'published'>(
    'prePublish'
  );
  const [id, setId] = useState<string | null>('');
  const [copyAlertSnackbarOpen, setCopyAlertSnackbarOpen] = useState(false);

  const puzzle = useSelector(selectPuzzle);
  const clueGrid = useSelector(selectClueGrid);

  const fieldsFilled = !!title && !!author;
  const puzzleLink = id ? getPuzzleLink(id) : 'No ID found';

  const handlePublish = async () => {
    if (!clueGrid || !fieldsFilled) return;
    setState('publishing');

    // Compress the puzzle data into a base64-encoded string
    const completePuzzleData: CompletePuzzleDataType = {
      puzzle,
      clueGrid,
    };
    var codec = require('json-url')('lzma');
    const dataLzma = await codec.compress(completePuzzleData);

    // Create a new puzzle document
    const id = uuidv4();
    await setDoc(doc(db, 'puzzles', id), {
      title,
      author,
      dataLzma,
    });

    setId(id);
    setState('published');
    logEvent('puzzle_published', { title, author });

    // Send the puzzle to Discord (it's totally OK if this fails)
    try {
      await axios.post(
        'https://discord.com/api/webhooks/1045940418816262215/6Swf9rOOI7CmdSy773ZZW5kR9AiAqbQ8ey8Gc1wcwA1Kbycy4472oAd0DF6RcD4uA6Rg',
        {
          content: `${author} just published "${title}"! ${getPuzzleLink(id)}`,
        }
      );
    } catch {}
  };

  const copyLink = () => {
    copy(puzzleLink);
    setCopyAlertSnackbarOpen(true);
    logEvent('puzzle_link_copied', { title, author, puzzleLink });
  };
  const shareTitle = `I created a crossword puzzle called "${title}" on Crosswyrd! Check it out:`;
  const shareHashtag = 'crosswyrd';
  const mkHandleShareClick = (appName: string) => () => {
    logEvent('puzzle_link_shared', { title, author, appName });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ style: { backgroundColor: '#fafbfb' } }}
    >
      <DialogTitle>Publish Your Puzzle!</DialogTitle>
      <DialogContent>
        <div
          style={{
            pointerEvents: state === 'publishing' ? 'none' : 'initial',
          }}
          className="sheet publish-dialog-container"
        >
          {(state === 'prePublish' || state === 'publishing') && (
            <div
              className="publish-dialog-prepublish-container"
              style={{
                display: 'flex',
                flexDirection: 'column',
                opacity: state === 'publishing' ? 0.35 : 1,
              }}
            >
              <p>
                Give your puzzle a title and author, then share it with the
                world!
              </p>
              <TextField
                autoFocus
                label="Title"
                variant="standard"
                style={{ margin: 'auto', marginTop: 12 }}
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value.slice(0, CHARACTER_LIMIT))
                }
                onKeyPress={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handlePublish();
                  }
                }}
              />
              <TextField
                label="Author"
                variant="standard"
                style={{ margin: 'auto', marginTop: 12 }}
                value={author}
                onChange={(event) =>
                  setAuthor(event.target.value.slice(0, CHARACTER_LIMIT))
                }
                onKeyPress={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handlePublish();
                  }
                }}
              />
              <Button
                onClick={handlePublish}
                variant="contained"
                style={{ margin: 'auto', marginTop: 12 }}
                endIcon={<NewspaperIcon />}
                disabled={!fieldsFilled}
              >
                Publish
              </Button>
            </div>
          )}
          {state === 'publishing' && (
            <div className="publish-dialog-publishing">
              <span className="publish-dialog-publishing-progress">
                <CircularProgress size={20} thickness={5} />
              </span>
              <span>&nbsp;&nbsp;Publishing...</span>
            </div>
          )}
          {state === 'published' && (
            <>
              <Alert severity="success" style={{ marginBottom: 12 }}>
                <span style={{ fontWeight: 'bold' }}>{title}</span> has been
                published successfully!
              </Alert>
              <p>
                Share the link below with others so that they can play your
                puzzle.
              </p>
              <p>
                <span style={{ fontWeight: 'bold' }}>
                  Be sure to save this link somewhere!
                </span>{' '}
                If the link is lost, you will not be able to retrieve your
                puzzle again.
              </p>
              <div style={{ display: 'flex', flexDirection: 'row' }}>
                <Button
                  className="publish-dialog-copy-link"
                  onClick={copyLink}
                  variant="contained"
                  endIcon={<LinkIcon />}
                >
                  Copy&nbsp;Link
                </Button>
                <pre
                  className="sheet publish-dialog-link"
                  style={{
                    backgroundColor: colors.grey[100],
                  }}
                >
                  {puzzleLink}
                </pre>
              </div>
              <div style={{ display: 'flex', width: '100%', marginTop: 16 }}>
                <ShareButtons
                  shareUrl={puzzleLink}
                  shareTitle={shareTitle}
                  shareHashtag={shareHashtag}
                  mkHandleShareClick={mkHandleShareClick}
                />
              </div>
              <p style={{ margin: 0 }}>
                You are invited to share your puzzle to{' '}
                <a
                  href="https://discord.gg/xvb9MhkY"
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>our new online community on Discord</strong>
                </a>
                . Get feedback from other builders, and play puzzles that others
                have made. Check it out!
              </p>
              <GarrettNote />
            </>
          )}
        </div>
      </DialogContent>
      <CopyAlertSnackbar
        open={copyAlertSnackbarOpen}
        onClose={() => {
          setCopyAlertSnackbarOpen(false);
        }}
      />
    </Dialog>
  );
}
