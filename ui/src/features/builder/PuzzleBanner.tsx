import _ from 'lodash';
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
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  selectFillAssistActive,
  selectWordCount,
  setFillAssistActive,
} from './builderSlice';
import { AUTO_FILL_ASSIST_SUGGESTION_TOGGLE_THRESHOLD } from './constants';

function FillAssistPopover({ anchorEl }: { anchorEl: HTMLElement }) {
  const [open, setOpen] = useState(false);

  const active = useSelector(selectFillAssistActive);
  const wordCount = useSelector(selectWordCount);

  const prevWordCount = useRef<number | null>(wordCount);
  useEffect(() => {
    if (wordCount === null) return;
    if (
      !active &&
      wordCount >= AUTO_FILL_ASSIST_SUGGESTION_TOGGLE_THRESHOLD &&
      prevWordCount.current !== null &&
      prevWordCount.current < AUTO_FILL_ASSIST_SUGGESTION_TOGGLE_THRESHOLD
    ) {
      setOpen(true);
      setTimeout(() => setOpen(false), 5000);
    }

    prevWordCount.current = wordCount;
  }, [active, wordCount]);

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
      disableAutoFocus
      disableEnforceFocus
    >
      <Typography sx={{ p: 1 }} style={{ maxWidth: 340, textAlign: 'center' }}>
        <span>
          There are {AUTO_FILL_ASSIST_SUGGESTION_TOGGLE_THRESHOLD} or more words
          in the puzzle:{' '}
          <span style={{ fontWeight: 'bold' }}>Fill&nbsp;Assist</span>
          &nbsp;is&nbsp;recommended!
        </span>
      </Typography>
    </Popover>
  );
}

type FillAssistStateType = 'running' | 'success' | 'error';
export function FillAssistState({
  state,
  noTooltip,
}: {
  state: FillAssistStateType;
  noTooltip?: boolean;
}) {
  const [checkmarkVisible, setCheckmarkVisible] = useState(false);
  const [spinnerVisible, setSpinnerVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);

  // Stop rendering the checkmark after a little time if it isn't supposed to
  // be rendered
  useEffect(() => {
    if (state === 'success') {
      setCheckmarkVisible(true);
      return;
    }
    const timeoutId = setTimeout(() => setCheckmarkVisible(false), 1000);
    return () => clearTimeout(timeoutId);
  }, [state]);

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

  const component = (
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
      {checkmarkVisible && (
        <DoneIcon
          className={
            'fill-state-icon ' +
            (state === 'success' ? 'rotate-in' : 'rotate-out')
          }
          color="primary"
        />
      )}
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

  return noTooltip ? (
    component
  ) : (
    <Tooltip
      title={`Fill assist state: ${_.capitalize(state)}`}
      placement="top"
      arrow
      disableInteractive
      enterDelay={500}
    >
      {component}
    </Tooltip>
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
      <Tooltip
        title="Undo"
        placement="top"
        arrow
        disableInteractive
        enterDelay={500}
      >
        <span>
          <IconButton disabled={undoDisabled} onClick={undo} component="span">
            <UndoIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip
        title="Redo"
        placement="top"
        arrow
        disableInteractive
        enterDelay={500}
      >
        <span>
          <IconButton disabled={redoDisabled} onClick={redo} component="span">
            <RedoIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip
        title="Clear all letters"
        placement="top"
        arrow
        disableInteractive
        enterDelay={500}
      >
        <div style={{ marginTop: 'auto', marginBottom: 'auto' }}>
          <Button disabled={WFCBusy || autoFillRunning} onClick={clearLetters}>
            Clear
          </Button>
        </div>
      </Tooltip>
      <Tooltip
        title="Select the next best (most constrained) answer to fill"
        placement="top"
        arrow
        disableInteractive
        enterDelay={500}
      >
        <div style={{ marginTop: 'auto', marginBottom: 'auto' }}>
          <Button
            disabled={WFCBusy || autoFillRunning}
            onClick={selectBestNext}
          >
            Next
          </Button>
        </div>
      </Tooltip>
      <Divider
        orientation="vertical"
        variant="middle"
        flexItem
        style={{ marginLeft: 8, marginRight: 8 }}
      />
      <Tooltip
        title={
          <span>
            Fill Assist is{' '}
            <span style={{ fontWeight: 'bold' }}>
              {fillAssistActive ? 'on' : 'off'}
            </span>
            . When on, Fill Assist will partially solve the board to show you
            how constrained each tile is. Darker blue means more constrained.
            The Fill and Word Bank tabs use this information to suggest words or
            locations that may work well on the board. It is recommended to turn
            on Fill Assist once all black tiles have been placed on the board
            (i.e., the board is constrained enough that partially solving the
            board is possible).
          </span>
        }
        placement="top"
        arrow
        disableInteractive
        enterDelay={500}
      >
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
                onChange={() =>
                  dispatch(setFillAssistActive(!fillAssistActive))
                }
              />
            }
            label="Fill Assist"
            style={{ userSelect: 'none' }}
          />
        </FormGroup>
      </Tooltip>
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
          <Tooltip
            title="Automatically fill the rest of the board"
            placement="top"
            arrow
            disableInteractive
            enterDelay={500}
          >
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
          </Tooltip>
        </>
      )}
    </div>
  );
}
