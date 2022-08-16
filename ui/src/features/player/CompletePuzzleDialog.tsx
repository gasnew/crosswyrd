import confetti from 'canvas-confetti';
import _ from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  EmailIcon,
  EmailShareButton,
  FacebookIcon,
  FacebookShareButton,
  RedditIcon,
  RedditShareButton,
  TwitterIcon,
  TwitterShareButton,
} from 'react-share';
import { Divider } from '@mui/material';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import BuildIcon from '@mui/icons-material/Build';

import KoFiButton from '../app/KoFiButton';
import { CrosswordPuzzleType } from '../builder/builderSlice';
import { PuzzleMetadataType } from './CrosswordPlayer';
import { logEvent } from '../../firebase';

// Wait half a second before the dialog can be closed again. This is because
// tap events close the dialog immediately after it is opened.
const DIALOG_CLOSE_DELAY_MS = 200;

interface Props {
  puzzle: CrosswordPuzzleType;
  puzzleKey: CrosswordPuzzleType;
  puzzleMetadata: PuzzleMetadataType;
}

export default function CompletePuzzleDialog({
  puzzleKey,
  puzzle,
  puzzleMetadata,
}: Props) {
  const [openState, setOpenState] = useState<{ open: boolean; date: number }>({
    open: false,
    date: Date.now(),
  });

  // Open the dialog when the puzzle is completed
  const prevPuzzleVersion = useRef<string>(puzzle.version);
  useEffect(() => {
    // If the puzzle's version hasn't changed, skip.
    if (prevPuzzleVersion.current === puzzle.version) return;
    prevPuzzleVersion.current = puzzle.version;
    if (
      _.every(puzzle.tiles, (row, rowIndex) =>
        _.every(
          row,
          (tile, columnIndex) =>
            tile.value === puzzleKey.tiles[rowIndex][columnIndex].value
        )
      )
    ) {
      setOpenState({ open: true, date: Date.now() });
      logEvent('puzzle_completed', {
        title: puzzleMetadata.title,
        author: puzzleMetadata.author,
      });
    }
  }, [puzzle, puzzleKey, puzzleMetadata]);

  useEffect(() => {
    if (openState.open)
      confetti({
        particleCount: 100,
        spread: 70,
        startVelocity: 35,
        zIndex: 2000,
      });
  }, [openState.open]);

  const shareUrl = window.location.href;
  const shareTitle = `I solved "${puzzleMetadata.title}" by "${puzzleMetadata.author}" on Crosswyrd! Check it out:`;
  const shareHashtag = 'crosswyrd';
  const mkHandleShareClick = (appName: string) => () => {
    logEvent('puzzle_share_clicked', {
      title: puzzleMetadata.title,
      author: puzzleMetadata.author,
      appName,
    });
  };

  return (
    <Dialog
      open={openState.open}
      onClose={(_, reason) => {
        if (Date.now() - openState.date > DIALOG_CLOSE_DELAY_MS)
          setOpenState({ open: false, date: Date.now() });
      }}
      PaperProps={{ style: { backgroundColor: '#fafbfb' } }}
    >
      <DialogTitle>Complete</DialogTitle>
      <DialogContent>
        <div className="sheet share-dialog">
          <div className="share-dialog-text">
            <p>
              <span style={{ fontWeight: 'bold' }}>
                You solved "{puzzleMetadata.title}"!
              </span>{' '}
              Great work. If you liked this puzzle, share it with your friends,
              or try your hand at building a puzzle of your own.
            </p>
            <p>Thank you for playing on Crosswyrd.</p>
          </div>
          <div className="share-container">
            <div className="share-content">
              <div className="share-buttons">
                <TwitterShareButton
                  url={shareUrl}
                  title={shareTitle}
                  hashtags={[shareHashtag]}
                  className="share-button"
                  onClick={mkHandleShareClick('twitter')}
                >
                  <TwitterIcon size={32} round />
                </TwitterShareButton>
                <FacebookShareButton
                  url={shareUrl}
                  quote={shareTitle}
                  hashtag={`#${shareHashtag}`}
                  className="share-button"
                  onClick={mkHandleShareClick('facebook')}
                >
                  <FacebookIcon size={32} round />
                </FacebookShareButton>
                <RedditShareButton
                  url={shareUrl}
                  title={shareTitle}
                  className="share-button"
                  onClick={mkHandleShareClick('reddit')}
                >
                  <RedditIcon size={32} round />
                </RedditShareButton>
                <EmailShareButton
                  url={shareUrl}
                  subject={shareTitle}
                  onClick={mkHandleShareClick('email')}
                >
                  <EmailIcon size={32} round />
                </EmailShareButton>
              </div>
              <Divider
                variant="middle"
                flexItem
                style={{ marginTop: 8, marginBottom: 8 }}
              />
              <Link to="/builder">
                <Button
                  variant="contained"
                  endIcon={<BuildIcon />}
                  onClick={() => logEvent('build_puzzle_clicked')}
                >
                  Build a Puzzle
                </Button>
              </Link>
            </div>
          </div>
          <Divider style={{ margin: 12 }} />
          <p>
            By the way, if you're enjoying Crosswyrd, it really helps me to drop
            a donation! Your donations help me to develop and maintain this
            passion project. Thank you.
          </p>
          <p>- Garrett </p>
          <div style={{ display: 'flex', margin: 'auto' }}>
            <KoFiButton />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
