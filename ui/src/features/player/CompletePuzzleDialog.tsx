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
import {
  Alert,
  colors,
  Divider,
  LinearProgress,
  Slide,
  Snackbar,
} from '@mui/material';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import BuildIcon from '@mui/icons-material/Build';
import sanitize from 'sanitize-filename';

import { GarrettNote } from '../app/KoFiButton';
import { isMobileOrTablet } from '../../app/util';
import { CrosswordPuzzleType } from '../builder/builderSlice';
import { PuzzleMetadataType } from './CrosswordPlayer';
import { logEvent } from '../../firebase';
import useGenerateReplayGIF, {
  GIF_HEIGHT,
  GIF_WIDTH,
} from './useGenerateReplayGIF';

declare global {
  interface Navigator {
    canShare: any;
  }
}

// Wait half a second before the dialog can be closed again. This is because
// tap events close the dialog immediately after it is opened.
const DIALOG_INTERACT_DELAY_MS = 200;
const GIF_DISPLAY_WIDTH = 200;
const GIF_DISPLAY_HEIGHT = (200 * GIF_HEIGHT) / GIF_WIDTH;

const CannotShareSnackbar = React.memo(
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
        style={{ pointerEvents: 'none' }}
      >
        <Alert severity="error" sx={{ width: '100%' }}>
          This browser does not support sharing GIFs!
        </Alert>
      </Snackbar>
    );
  }
);

function ReplayGif({
  metadata,
  url,
  blob,
  progress,
}: {
  metadata: PuzzleMetadataType;
  url: string | null;
  blob: Blob | null;
  progress: number;
}) {
  const [downloadHovered, setDownloadHovered] = React.useState(false);
  const [cannotShareSnackbarOpen, setCannotShareSnackbarOpen] = React.useState(
    false
  );

  const isMobileOrTabletMemo = React.useMemo(() => isMobileOrTablet(), []);
  const shouldShowDownload = downloadHovered && !isMobileOrTabletMemo;
  const getSanitizedFileName = () =>
    sanitize(`Crosswyrd - ${metadata.title} by ${metadata.author}`);

  const handleClickGIF = async () => {
    // Do nothing if on desktop because the <a> tag below handles downloads
    if (!isMobileOrTabletMemo || !blob || !url) return;

    const shareData = {
      files: [
        new File([blob], getSanitizedFileName() + '.gif', { type: blob.type }),
      ],
      title: metadata.title,
      text: `I solved "${metadata.title}" by "${metadata.author}" on Crosswyrd! Check it out!`,
      url: window.location.href,
    };
    try {
      // Check if sharing is supported
      if (!navigator.canShare(shareData))
        throw new Error('This browser does not support sharing!');
    } catch (err) {
      // Alert the user that we can't share
      setCannotShareSnackbarOpen(true);

      // Try to download the GIF anyway as a last resort
      var a = document.createElement('a');
      document.body.appendChild(a);
      a.href = url;
      a.download = getSanitizedFileName();
      a.click();

      // Don't even try to share if we know we can't
      return;
    }
    try {
      await navigator.share(shareData);
    } catch (err) {
      console.error(err.name, err.message);
    }
  };

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
            height={GIF_DISPLAY_HEIGHT}
            width={GIF_DISPLAY_WIDTH}
            style={{ height: GIF_DISPLAY_HEIGHT, margin: 'auto' }}
            onClick={handleClickGIF}
          />
          {!isMobileOrTabletMemo && (
            <a
              className="replay-gif-download"
              download={getSanitizedFileName()}
              href={url}
              style={{
                height: GIF_DISPLAY_HEIGHT,
                width: GIF_DISPLAY_WIDTH,
                backgroundColor: shouldShowDownload
                  ? 'rgba(0, 0, 0, 0.6)'
                  : 'rgba(0, 0, 0, 0)',
              }}
              onMouseOver={() => setDownloadHovered(true)}
              onMouseOut={() => setDownloadHovered(false)}
              onClick={() => logEvent('replay_gif_downloaded')}
            >
              {shouldShowDownload && (
                <span
                  className="replay-gif-download-text"
                  style={{ textDecoration: 'none' }}
                >
                  Click to download
                </span>
              )}
            </a>
          )}
        </>
      ) : (
        <div
          className="replay-gif-making-container"
          style={{ height: GIF_DISPLAY_HEIGHT, width: GIF_DISPLAY_WIDTH }}
        >
          <div className="replay-gif-making" style={{ margin: 'auto' }}>
            <span className="replay-gif-making-text">
              &nbsp;&nbsp;Preparing your custom{' '}
              <span style={{ fontWeight: 'bold', fontSize: 16 }}>
                Replay&nbsp;GIF
              </span>
            </span>
            <LinearProgress
              variant="determinate"
              value={Math.min(progress * 100 + 4, 100)}
              style={{
                marginTop: 4,
                height: 6,
                borderRadius: 5,
              }}
            />
          </div>
        </div>
      )}
      <span
        style={{
          width: GIF_DISPLAY_WIDTH,
          textAlign: 'justify',
          marginTop: 6,
        }}
      >
        {isMobileOrTabletMemo
          ? 'Tap to share your custom replay GIF with your friends!'
          : 'Click to download your custom replay GIF, then share it with your friends!'}{' '}
        They can upload this GIF to play "{metadata.title}".
      </span>
      <CannotShareSnackbar
        open={cannotShareSnackbarOpen}
        onClose={() => setCannotShareSnackbarOpen(false)}
      />
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
  const gifState = useGenerateReplayGIF(openState.open, puzzleKey);

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
      <DialogTitle>Replete</DialogTitle>
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
          <ReplayGif
            metadata={puzzleMetadata}
            url={gifState.url}
            blob={gifState.blob}
            progress={gifState.progress}
          />
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
