import CloseIcon from '@mui/icons-material/Close';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import DoneIcon from '@mui/icons-material/Done';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import {
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Popover,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  selectFillAssistActive,
  selectFillAssistToggledAutomatically,
  setFillAssistActive,
} from './builderSlice';
import { AUTO_FILL_ASSIST_TOGGLE_THRESHOLD } from './constants';

function FillAssistPopover({ anchorEl }: { anchorEl: HTMLElement }) {
  const [state, setState] = useState<'activated' | 'deactivated' | null>(null);
  const [open, setOpen] = useState(false);

  const active = useSelector(selectFillAssistActive);
  const toggledAutomatically = useSelector(
    selectFillAssistToggledAutomatically
  );

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    if (toggledAutomatically) {
      if (active) setState('activated');
      else setState('deactivated');
      setOpen(true);
      timeoutId = setTimeout(() => setOpen(false), 5000);
    } else timeoutId = setTimeout(() => setOpen(false), 100);
    return () => {
      timeoutId && clearTimeout(timeoutId);
    };
  }, [active, toggledAutomatically]);

  return (
    <Popover
      anchorEl={anchorEl}
      open={open}
      sx={{ pointerEvents: 'none' }}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
    >
      <Typography sx={{ p: 1 }} style={{ maxWidth: 340, textAlign: 'center' }}>
        {state === 'activated' ? (
          <span>
            There are {AUTO_FILL_ASSIST_TOGGLE_THRESHOLD} or more words in the
            puzzle: <span style={{ fontWeight: 'bold' }}>Fill&nbsp;Assist</span>
            &nbsp;automatically&nbsp;activated!
          </span>
        ) : (
          <span>
            There are fewer than {AUTO_FILL_ASSIST_TOGGLE_THRESHOLD} words in
            the puzzle:{' '}
            <span style={{ fontWeight: 'bold' }}>Fill&nbsp;Assist</span>
            &nbsp;automatically&nbsp;deactivated!
          </span>
        )}
      </Typography>
    </Popover>
  );
}

type FillAssistStateType = 'running' | 'success' | 'error';
function FillAssistState({ state }: { state: FillAssistStateType }) {
  const [spinnerVisible, setSpinnerVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);

  // Stop rendering the spinner after a little time if it isn't supposed to be
  // rendered
  useEffect(() => {
    if (state === 'running') {
      setSpinnerVisible(true);
      return;
    }
    const timeoutId = setTimeout(() => setSpinnerVisible(false), 1000);
    return () => clearTimeout(timeoutId);
  }, [state]);

  // Stop rendering the red cross after a little time if it isn't supposed to be
  // rendered
  useEffect(() => {
    if (state === 'error') {
      setErrorVisible(true);
      return;
    }
    const timeoutId = setTimeout(() => setErrorVisible(false), 1000);
    return () => clearTimeout(timeoutId);
  }, [state]);

  return (
    <div
      style={{
        marginTop: 'auto',
        marginBottom: 'auto',
        marginLeft: -10,
        display: 'flex',
        width: 24,
        height: 24,
        position: 'relative',
      }}
    >
      <DoneIcon
        className={
          'fill-state-icon ' +
          (state === 'success' ? 'rotate-in' : 'rotate-out')
        }
        color="primary"
      />
      {errorVisible && (
        <CloseIcon
          className={
            'fill-state-icon ' +
            (state === 'error' ? 'rotate-in' : 'rotate-out')
          }
          color="error"
        />
      )}
      {spinnerVisible && (
        <div
          className={'fill-state-icon fill-state-progress'}
          style={{
            top: -3,
            left: 2,
            opacity: state === 'running' ? 1 : 0,
          }}
        >
          <CircularProgress size={20} thickness={5} />
        </div>
      )}
    </div>
  );
}

interface Props {
  WFCBusy: boolean;
  autoFillRunning: boolean;
  autoFillErrored: boolean;
  runAutoFill: () => void;
  stopAutoFill: () => void;
  undo: () => void;
  undoDisabled: boolean;
  redo: () => void;
  redoDisabled: boolean;
  clearLetters: () => void;
  clearSelection: () => void;
  selectBestNext: () => void;
}

export default function PuzzleBanner({
  WFCBusy,
  autoFillRunning,
  autoFillErrored,
  runAutoFill,
  stopAutoFill,
  undo,
  undoDisabled,
  redo,
  redoDisabled,
  clearLetters,
  clearSelection,
  selectBestNext,
}: Props) {
  const [
    fillAssistElement,
    setFillAssistElement,
  ] = useState<HTMLElement | null>(null);

  const dispatch = useDispatch();

  const fillAssistActive = useSelector(selectFillAssistActive);

  const handleClickRun = () => {
    clearSelection();
    runAutoFill();
  };
  const handleClickStop = () => {
    stopAutoFill();
  };

  return (
    <div className="puzzle-banner-container">
      <IconButton disabled={undoDisabled} onClick={undo}>
        <UndoIcon />
      </IconButton>
      <IconButton disabled={redoDisabled} onClick={redo}>
        <RedoIcon />
      </IconButton>
      <div style={{ marginTop: 'auto', marginBottom: 'auto' }}>
        <Button disabled={WFCBusy || autoFillRunning} onClick={clearLetters}>
          Clear
        </Button>
      </div>
      <div style={{ marginTop: 'auto', marginBottom: 'auto' }}>
        <Button disabled={WFCBusy || autoFillRunning} onClick={selectBestNext}>
          Next
        </Button>
      </div>
      <Divider
        orientation="vertical"
        variant="middle"
        flexItem
        style={{ marginLeft: 8, marginRight: 8 }}
      />
      <FormGroup
        style={{ marginTop: 'auto', marginBottom: 'auto', marginLeft: 12 }}
        ref={setFillAssistElement}
      >
        <FormControlLabel
          control={
            <Switch
              disabled={WFCBusy || autoFillRunning}
              size="small"
              checked={fillAssistActive}
              onChange={() => dispatch(setFillAssistActive(!fillAssistActive))}
            />
          }
          label="Fill Assist"
          style={{ userSelect: 'none' }}
        />
      </FormGroup>
      {fillAssistElement && <FillAssistPopover anchorEl={fillAssistElement} />}
      {fillAssistActive && (
        <>
          <FillAssistState
            state={
              WFCBusy || autoFillRunning
                ? 'running'
                : autoFillErrored
                ? 'error'
                : 'success'
            }
          />
          <div
            style={{ marginTop: 'auto', marginBottom: 'auto', marginLeft: 8 }}
          >
            <Button
              variant="contained"
              onClick={!autoFillRunning ? handleClickRun : handleClickStop}
              disabled={(WFCBusy || autoFillErrored) && !autoFillRunning}
              color={autoFillRunning ? 'error' : 'primary'}
              endIcon={autoFillRunning ? <StopIcon /> : <PlayArrowIcon />}
            >
              {autoFillRunning ? 'Stop' : 'Auto-Fill'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
