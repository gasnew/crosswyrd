import confetti from 'canvas-confetti';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
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

import { CrosswordPuzzleType } from '../builder/builderSlice';
import { PuzzleMetadataType } from './CrosswordPlayer';

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
  const [open, setOpen] = useState(false);

  // Open the dialog when the puzzle is completed
  useEffect(() => {
    if (
      _.every(puzzle.tiles, (row, rowIndex) =>
        _.every(
          row,
          (tile, columnIndex) =>
            tile.value === puzzleKey.tiles[rowIndex][columnIndex].value
        )
      )
    )
      setOpen(true);
  }, [puzzle, puzzleKey]);

  useEffect(() => {
    if (open)
      confetti({
        particleCount: 100,
        spread: 70,
        startVelocity: 35,
        zIndex: 2000,
      });
  }, [open]);

  const shareUrl = window.location.href;
  const shareTitle = `I solved "${puzzleMetadata.title}" by "${puzzleMetadata.author}" on Crosswyrd! Check it out:`;

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      PaperProps={{ style: { backgroundColor: '#fafbfb' } }}
    >
      <DialogTitle>Complete</DialogTitle>
      <DialogContent>
        <div className="sheet share-dialog">
          <div className="share-dialog-text">
            <p>
              <span style={{ fontWeight: 'bold' }}>Great work!</span> Share "
              {puzzleMetadata.title}" with your friends if you liked it, or try
              your hand at building a puzzle of your own.
            </p>
            <p>Thank you for playing on Crosswyrd.</p>
          </div>
          <div className="share-container">
            <div className="share-content">
              <div className="share-buttons">
                <TwitterShareButton
                  url={shareUrl}
                  title={shareTitle}
                  className="share-button"
                >
                  <TwitterIcon size={32} round />
                </TwitterShareButton>
                <FacebookShareButton
                  url={shareUrl}
                  quote={shareTitle}
                  className="share-button"
                >
                  <FacebookIcon size={32} round />
                </FacebookShareButton>
                <RedditShareButton
                  url={shareUrl}
                  title={shareTitle}
                  windowWidth={660}
                  windowHeight={460}
                  className="share-button"
                >
                  <RedditIcon size={32} round />
                </RedditShareButton>
                <EmailShareButton
                  url={shareUrl}
                  subject={shareTitle}
                  body="body"
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
                <Button variant="contained" endIcon={<BuildIcon />}>
                  Build a Puzzle
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
