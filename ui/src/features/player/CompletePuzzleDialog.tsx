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
import DownloadIcon from '@mui/icons-material/Download';
import { CircularProgress, colors, Divider } from '@mui/material';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import BuildIcon from '@mui/icons-material/Build';
import sanitize from 'sanitize-filename';

import { GarrettNote } from '../app/KoFiButton';
import { CrosswordPuzzleType } from '../builder/builderSlice';
import { PuzzleMetadataType } from './CrosswordPlayer';
import { logEvent } from '../../firebase';
import useGenerateReplayGIF from './useGenerateReplayGIF';

// Wait half a second before the dialog can be closed again. This is because
// tap events close the dialog immediately after it is opened.
const DIALOG_INTERACT_DELAY_MS = 200;
const GIF_HEIGHT = 200;

function ReplayGif({
  metadata,
  url,
}: {
  metadata: PuzzleMetadataType;
  url: string | null;
}) {
  const [downloadHovered, setDownloadHovered] = React.useState(false);

  const handleDownloadGif = () => {};

  return (
    <div
      className="sheet replay-gif-container"
      style={{ backgroundColor: url ? 'rgb(250, 251, 251)' : colors.grey[300] }}
    >
      {url ? (
        <>
          <img
            src={url}
            alt="Replay GIF"
            height={GIF_HEIGHT}
            style={{ height: GIF_HEIGHT }}
          />
          <a
            className="replay-gif-download"
            download={sanitize(`${metadata.title} by ${metadata.author}`)}
            href={url}
            style={{
              height: GIF_HEIGHT + 16,
              width: GIF_HEIGHT + 16,
              backgroundColor: downloadHovered
                ? 'rgba(0, 0, 0, 0.6)'
                : 'rgba(0, 0, 0, 0)',
            }}
            onMouseOver={() => setDownloadHovered(true)}
            onMouseOut={() => setDownloadHovered(false)}
            onClick={handleDownloadGif}
          >
            {downloadHovered && (
              <span
                className="replay-gif-download-text"
                style={{ textDecoration: 'none' }}
              >
                Click to download
              </span>
            )}
          </a>
        </>
      ) : (
        <div
          className="replay-gif-making-container"
          style={{ height: GIF_HEIGHT, width: GIF_HEIGHT }}
        >
          <div className="replay-gif-making" style={{ margin: 'auto' }}>
            <span className="replay-gif-making-progress">
              <CircularProgress size={20} thickness={5} />
            </span>
            <span className="replay-gif-making-text">
              &nbsp;&nbsp;Making your custom{' '}
              <span style={{ fontWeight: 'bold', fontSize: 16 }}>
                Replay&nbsp;GIF
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function ShareButtons({
  shareUrl,
  shareTitle,
  shareHashtag,
  mkHandleShareClick,
}) {
  return (
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
        openShareDialogOnClick
      >
        <EmailIcon size={32} round />
      </EmailShareButton>
    </div>
  );
}

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

  // Render confetti
  useEffect(() => {
    if (openState.open)
      confetti({
        particleCount: 100,
        spread: 70,
        startVelocity: 35,
        zIndex: 2000,
      });
  }, [openState.open]);

  // Delay making this dialog interactable after it's opened so that touch
  // events on the keyboard don't automatically close the dialog or trigger its
  // buttons.
  const [interactable, setInteractable] = useState(false);
  useEffect(() => {
    if (!openState.open && interactable) {
      // Make non-interactable if closed
      setInteractable(false);
      return;
    }
    if (openState.open && !interactable) {
      // Make interactable after some delay if open
      const timeoutId = setTimeout(
        () => setInteractable(true),
        DIALOG_INTERACT_DELAY_MS
      );
      return () => clearTimeout(timeoutId);
    }
  }, [openState, interactable]);

  // Generate a replay GIF
  const gifUrl = useGenerateReplayGIF(openState.open, puzzleKey);

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
      onClose={() => setOpenState({ open: false, date: Date.now() })}
      PaperProps={{
        style: {
          backgroundColor: '#fafbfb',
          pointerEvents: interactable ? 'all' : 'none',
        },
      }}
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
          <ReplayGif metadata={puzzleMetadata} url={gifUrl} />
          <div className="share-container">
            <div className="share-content">
              <ShareButtons
                shareUrl={shareUrl}
                shareTitle={shareTitle}
                shareHashtag={shareHashtag}
                mkHandleShareClick={mkHandleShareClick}
              />
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
          <GarrettNote />
        </div>
      </DialogContent>
    </Dialog>
  );
}
