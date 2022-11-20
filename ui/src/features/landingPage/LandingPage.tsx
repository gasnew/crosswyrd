import { parseGIF, decompressFrames } from 'gifuct-js';
import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Link, useHistory } from 'react-router-dom';
import { Alert, Button, Divider, Slide, Snackbar } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import DownloadIcon from '@mui/icons-material/Download';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { stringify as uuidStringify } from 'uuid';

import Navbar, { NAVBAR_HEIGHT } from '../app/Navbar';
import { logEvent } from '../../firebase';
import { decodePalette } from '../player/gifSteganography';
import './LandingPage.css';

const BadGIFSnackbar = React.memo(
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
          A puzzle could not be parsed from this GIF!
        </Alert>
      </Snackbar>
    );
  }
);

function UploadReplayGif() {
  const [badGIFSnackbarOpen, setBadGIFSnackbarOpen] = React.useState(false);

  const history = useHistory();

  const onDrop = React.useCallback(
    (acceptedFiles) => {
      acceptedFiles.forEach((file) => {
        logEvent('replay_gif_uploaded');
        const reader = new FileReader();

        reader.onabort = () => setBadGIFSnackbarOpen(true);
        reader.onerror = () => setBadGIFSnackbarOpen(true);
        reader.onload = () => {
          const buff = reader.result;
          if (!buff || typeof buff === 'string') {
            setBadGIFSnackbarOpen(true);
            return;
          }
          var gif = parseGIF(buff);
          var frames = decompressFrames(gif, true);

          try {
            // Try to decode the puzzle UUID from the GIF's global color
            // palette
            history.push(
              `puzzles/${uuidStringify(decodePalette(frames[0].colorTable))}`
            );
          } catch {
            setBadGIFSnackbarOpen(true);
          }
        };
        reader.readAsArrayBuffer(file);
      });
    },
    [history]
  );

  const {
    getRootProps,
    getInputProps,
    isDragAccept,
    isDragReject,
  } = useDropzone({ onDrop, accept: { 'image/gif': [] } });

  return (
    <div
      className={
        'upload-replay-gif' +
        (isDragAccept
          ? ' upload-replay-gif--accept'
          : isDragReject
          ? ' upload-replay-gif--reject'
          : '')
      }
      {...getRootProps()}
    >
      <input {...getInputProps()} />
      <DownloadIcon
        sx={{
          fontSize: 64,
          margin: 'auto',
          marginBottom: 0,
          transform: isDragAccept ? 'scale(1.2)' : '',
          opacity: isDragAccept ? 1 : 0.75,
          transition: 'transform 200ms ease-out, opacity 200ms ease-out',
        }}
      />
      <span className="upload-replay-gif-text">
        {isDragAccept ? (
          <strong>Drop the GIF here...</strong>
        ) : isDragReject ? (
          <strong>Only GIFs, please!</strong>
        ) : (
          <span>
            <strong className="choose-a-gif">Choose a GIF</strong> or drag it
            here.
          </span>
        )}
      </span>
      <BadGIFSnackbar
        open={badGIFSnackbarOpen}
        onClose={() => setBadGIFSnackbarOpen(false)}
      />
    </div>
  );
}

function BuildPuzzle() {
  return <div className="build-puzzle">Build a puzzle</div>;
}

export default function LandingPage() {
  return (
    <div className="landing-page-content-container">
      <Navbar />
      <div style={{ height: NAVBAR_HEIGHT }} />
      <div className="landing-page-content">
        <div className="landing-page-header-block">
          <span className="landing-page-header">Welcome to CROSSWYRD</span>
          <span className="landing-page-subtitle">
            Build, Share, and Solve Crossword Puzzles Online
          </span>
        </div>
        <div className="sheet landing-page-sheet">
          <span className="landing-page-subheader" style={{ marginBottom: 8 }}>
            Solve a puzzle
          </span>
          <span className="landing-page-description">
            Upload someone else's <strong>replay GIF</strong> below to play that
            puzzle!
          </span>
          <UploadReplayGif />
          <div className="landing-page-divider">
            <Divider style={{ margin: 'auto' }} />
            <span className="landing-page-divider-or">or</span>
          </div>
          <span className="landing-page-subheader" style={{ marginBottom: 8 }}>
            Build your own
          </span>
          <span className="landing-page-description">
            Use Crosswyrd's accessible yet powerful crossword builder.
          </span>
          <Link to="/builder" style={{ margin: 'auto' }}>
            <Button
              variant="contained"
              onClick={() => logEvent('build_puzzle_clicked')}
              endIcon={<BuildIcon />}
            >
              Build a Puzzle
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
