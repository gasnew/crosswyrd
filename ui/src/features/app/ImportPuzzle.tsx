import {
  Alert,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Portal,
  Slide,
  Snackbar,
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { PuzCrossword } from '@confuzzle/puz-crossword';
import { batch, useDispatch, useSelector } from 'react-redux';
import {
  selectPublishInfo,
  setPuzzleState,
  ClueGridType,
  setClueGrid,
  setPublishInfo,
  setWaveState,
  CrosswordPuzzleType,
  setFillAssistActive,
} from '../builder/builderSlice';

import { styled } from '@mui/material/styles';
import _ from 'lodash';
import { randomId } from '../../app/util';
import { waveFromPuzzle, WaveType } from '../builder/useWaveFunctionCollapse';
import { ALL_LETTERS } from '../builder/constants';
import React from 'react';

const SuccessSnackbar = React.memo(
  ({
    open,
    title,
    onClose,
  }: {
    open: boolean;
    title: string;
    onClose: () => void;
  }) => {
    return (
      <Portal>
        <Snackbar
          open={open}
          onClose={(_event, reason) => {
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
          <Alert severity="success" sx={{ width: '100%' }}>
            Successfully imported {title}!
          </Alert>
        </Snackbar>
      </Portal>
    );
  }
);

const FailureSnackbar = React.memo(
  ({
    open,
    fileName,
    errorMessage,
    onClose,
  }: {
    open: boolean;
    fileName: string;
    errorMessage: string;
    onClose: () => void;
  }) => {
    return (
      <Portal>
        <Snackbar
          open={open}
          onClose={(_event, reason) => {
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
            Failed to import {fileName} with error: {errorMessage}
          </Alert>
        </Snackbar>
      </Portal>
    );
  }
);

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

export default function ImportPuzzle({ onImport }: { onImport: () => void }) {
  const publishInfo = useSelector(selectPublishInfo);
  const dispatch = useDispatch();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [successSnackbarOpenState, setSuccessSnackbarOpenState] =
    React.useState<{ title: string } | null>(null);
  const [failureSnackbarOpenState, setFailureSnackbarOpenState] =
    React.useState<{ fileName: string; errorMessage: string } | null>(null);

  const importPuzzle = (file: File) => {
    const fileName = file.name;

    try {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = (event) => {
        const result = event.target?.result;
        if (!result) return;
        const data = PuzCrossword.from(result);

        if (data.height !== data.width) {
          setFailureSnackbarOpenState({
            errorMessage: `Puzzle has a height of ${data.height} and width of ${data.width}. Only square puzzles are supported.`,
            fileName,
          });
          return;
        }

        const puzzle: CrosswordPuzzleType = {
          tiles: _.times(data.height, (row) =>
            _.times(data.width, (column) => {
              const index = row * data.width + column;
              const solutionValue = data.solution[index];
              return {
                value:
                  solutionValue === '.'
                    ? 'black'
                    : ALL_LETTERS.includes(solutionValue.toLowerCase())
                      ? solutionValue.toLowerCase()
                      : 'empty',
              };
            })
          ),
          version: randomId(),
        };
        const wave: WaveType = {
          ...waveFromPuzzle(puzzle),
          // Set a random puzzle version so that fill assist gets rerun (we do
          // not know what the wave should be off the bat)
          puzzleVersion: randomId(),
        };
        const clueGrid: ClueGridType = _.times(data.height, () =>
          _.times(data.width, () => ({ across: null, down: null }))
        );
        data.parsedClues.forEach((clue: any) => {
          clueGrid[clue.row][clue.col][clue.isAcross ? 'across' : 'down'] =
            clue.text;
        });

        batch(() => {
          dispatch(setPuzzleState(puzzle));
          dispatch(setWaveState(wave));
          dispatch(setClueGrid(clueGrid));
          dispatch(
            setPublishInfo({
              // Generally preserve publish info if present to allow importing
              // into an existing project and re-publishing that (e.g., if you've
              // saved multiple versions of a single puzzle)
              title: publishInfo.title ? publishInfo.title : data.title,
              author: publishInfo.author ? publishInfo.author : data.author,
              id: publishInfo.id,
            })
          );
          dispatch(setFillAssistActive(true));
        });

        setSuccessSnackbarOpenState({ title: data.title });
      };

      reader.onerror = () => {
        const errorMessage = `${reader.error}`;
        console.error(errorMessage);
        setFailureSnackbarOpenState({ errorMessage, fileName });
      };
    } catch (e) {
      const errorMessage = `${e}`;
      console.error(e);
      setFailureSnackbarOpenState({ errorMessage, fileName });
      return;
    }

    onImport();
  };

  return (
    <ListItemButton onClick={() => fileInputRef.current?.click()}>
      <ListItemIcon>
        <FileUploadIcon />
      </ListItemIcon>
      <ListItemText primary="Import" />
      <VisuallyHiddenInput
        ref={fileInputRef}
        type="file"
        accept=".puz"
        onChange={(event) => {
          if (!event.target.files || event.target.files?.length === 0) return;
          importPuzzle(event.target.files[0]);
          event.target.value = '';
        }}
        multiple
      />
      <SuccessSnackbar
        open={!!successSnackbarOpenState}
        title={successSnackbarOpenState?.title ?? ''}
        onClose={() => setSuccessSnackbarOpenState(null)}
      />
      <FailureSnackbar
        open={!!failureSnackbarOpenState}
        fileName={failureSnackbarOpenState?.fileName ?? ''}
        errorMessage={failureSnackbarOpenState?.errorMessage ?? ''}
        onClose={() => setFailureSnackbarOpenState(null)}
      />
    </ListItemButton>
  );
}
