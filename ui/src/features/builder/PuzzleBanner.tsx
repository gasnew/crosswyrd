import CloseIcon from '@mui/icons-material/Close';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import DoneIcon from '@mui/icons-material/Done';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import { Button, CircularProgress, Divider, IconButton } from '@mui/material';
import { useEffect, useState } from 'react';

type FillAssistStateType = 'running' | 'success' | 'error';
function FillAssistState({ state }: { state: FillAssistStateType }) {
  const [spinnerVisible, setSpinnerVisible] = useState(false);

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
      <CloseIcon
        className={
          'fill-state-icon ' + (state === 'error' ? 'rotate-in' : 'rotate-out')
        }
        color="error"
      />
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
  clearLetters,
  clearSelection,
  selectBestNext,
}: Props) {
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
      <IconButton onClick={redo}>
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
      >
        <FormControlLabel
          control={<Switch defaultChecked size="small" />}
          label="Fill Assist"
          style={{ userSelect: 'none' }}
        />
      </FormGroup>
      <FillAssistState
        state={
          WFCBusy || autoFillRunning
            ? 'running'
            : autoFillErrored
            ? 'error'
            : 'success'
        }
      />
      <div style={{ marginTop: 'auto', marginBottom: 'auto', marginLeft: 8 }}>
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
    </div>
  );
}
