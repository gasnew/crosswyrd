import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
} from '@mui/material';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

import { GarrettNote } from './KoFiButton';

// Any viewport with width or height smaller than these will not be able to see
// the whole builder interface at once.
const MIN_VIEWPORT_WIDTH = 970;
const MIN_VIEWPORT_HEIGHT = 694;

const HIGHLIGHT_COLOR = 'rgb(1, 67, 97)';

function Img({
  src,
  alt,
  height,
}: {
  src: string;
  alt: string;
  height?: number;
}) {
  return (
    <img
      className="sheet welcome-dialog-img"
      src={src}
      alt={alt}
      {...(height ? { height: height } : {})}
    />
  );
}

function InlineKbd({ children }) {
  return (
    <span className="inline-kbd-container">
      <kbd className="inline-kbd">{children}</kbd>
    </span>
  );
}

function KeyboardMapping({ keys, description }) {
  return (
    <div className="keyboard-mapping">
      <span className="keyboard-mapping-description">{description}</span>
      <span className="keyboard-mapping-keys">{keys}</span>
    </div>
  );
}

function Heading({ children }) {
  return (
    <Typography
      variant="h5"
      style={{
        color: HIGHLIGHT_COLOR,
        fontSize: 24,
        textShadow: '0.5px 0.5px 0 #ddd, 1px 1px 0 #ddd, 1.5px 1.5px 0 #ddd',
      }}
    >
      {children}
    </Typography>
  );
}

function Keyword({ children }) {
  return (
    <span style={{ fontWeight: 'bold', color: HIGHLIGHT_COLOR }}>
      {children}
    </span>
  );
}

interface Props {
  open: boolean;
  showCheckbox: boolean;
  onClose: () => void;
}

export default function WelcomeDialog({ open, showCheckbox, onClose }: Props) {
  const [boxChecked, setBoxChecked] = useState(false);

  const handleBoxClick = useCallback(() => {
    setBoxChecked(!boxChecked);
  }, [boxChecked]);

  const skipDialogStorageString = useMemo(() => `skipWelcomeDialog`, []);

  // Set localStorage to keep track of checkbox choice
  useEffect(() => {
    if (boxChecked && !open)
      window.localStorage.setItem(skipDialogStorageString, 'true');
  }, [boxChecked, open, skipDialogStorageString]);

  // Close the dialog immediately if the user has clicked "Do not show again".
  useEffect(() => {
    if (
      showCheckbox &&
      open &&
      window.localStorage.getItem(skipDialogStorageString) === 'true'
    )
      onClose();
  }, [showCheckbox, open, skipDialogStorageString, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ style: { backgroundColor: '#fafbfb' } }}
      scroll="paper"
    >
      <DialogTitle>Welcome to Crosswyrd!</DialogTitle>
      <DialogContent
        dividers
        className="sheet"
        style={{
          margin: 12,
          marginBottom: showCheckbox ? 0 : 12,
          display: 'flex',
          flexDirection: 'column',
          textAlign: 'justify',
        }}
      >
        {(window.innerWidth <= MIN_VIEWPORT_WIDTH ||
          window.innerHeight <= MIN_VIEWPORT_HEIGHT) && (
          <Alert severity="warning" style={{ marginBottom: 12 }}>
            Crosswyrd Builder may work better on a device with a larger screen
          </Alert>
        )}
        <Alert className="welcome-dialog-intro" icon={false} severity="info">
          <span style={{ fontWeight: 'bold' }}>Crosswyrd</span> makes
          constructing and sharing crosswords as simple as possible.
        </Alert>
        <Heading>Controls</Heading>
        <div className="sheet keyboard-mapping-container">
          <KeyboardMapping
            keys={<kbd>.</kbd>}
            description="Place/Remove black tile"
          />
          <KeyboardMapping
            keys={
              <>
                <kbd>A</kbd> - <kbd>Z</kbd>
              </>
            }
            description="Place letter tile"
          />
          <KeyboardMapping
            keys={<kbd>Backspace</kbd>}
            description="Remove tile"
          />
          <KeyboardMapping keys={<kbd>Space</kbd>} description="Next tile" />
          <KeyboardMapping
            keys={
              <>
                <kbd>↑</kbd>
                <kbd>↓</kbd>
                <kbd>←</kbd>
                <kbd>→</kbd>
              </>
            }
            description="Move selection"
          />
          <KeyboardMapping keys={<kbd>Tab</kbd>} description="Next answer" />
          <KeyboardMapping
            keys={
              <>
                <kbd>Shift</kbd>+<kbd>Tab</kbd>
              </>
            }
            description="Previous answer"
          />
          <KeyboardMapping
            keys={<kbd>Enter</kbd>}
            description="Next best answer to fill"
          />
        </div>
        <Heading>Filling the Board</Heading>
        <Img src="/gifs/fill.gif" alt="Filling the Board" />
        <p>
          You'll start with selecting a grid pattern. The classic way to
          construct a crossword is to start with a blank grid and place long
          theme words while constraining the board with black tiles. But you can
          pick from an array of preset patterns instead for a quick start. If
          it's your first time constructing a puzzle, starting with a 5x5 grid
          is a good way to get your feet wet. As you place and remove black
          tiles with <InlineKbd>.</InlineKbd>, you'll notice that the black
          tiles maintain rotational symmetry. This is a common pattern for dense
          crossword puzzles like this. For example, the New York Times require
          symmetry for their crossword submissions.
        </p>
        <p>
          The best puzzles have a theme that the player uncovers while solving (
          <a
            href="https://www.nytimes.com/2018/04/11/crosswords/constructing-themes.html"
            target="_blank"
            rel="noreferrer"
          >
            The New York Times themselves have a nice article on this
          </a>
          ), which is usually expressed in the puzzle's handful of longer words.
          Once you have a theme in mind, you can enter some ideas into the bank
          in the <Keyword>Word Bank</Keyword> tab then click and drag them onto
          the board to see how they fit. You can also fill in words directly on
          the board by typing them letter-by-letter, or pick from the suggested
          words in the <Keyword>Fill</Keyword> tab in the sidebar. Try it out,
          and see which approaches work best for you!
        </p>
        <p>
          Crosswyrd comes with a built-in <Keyword>Fill Assist</Keyword>, which
          suggests words that fit in the part of the board you have selected. It
          does this by partially solving the puzzle any time you make a change
          to it. The darker blue the tile, the more constrained it is, so it is
          recommended that you generally prioritize filling darker blue tiles
          first. If the board is not solvable from a certain point, try undoing
          your recent change(s) or clearing any red tiles. When you have filled
          the board with your own words to your satisfaction, you can click the{' '}
          <Keyword>Auto-Fill</Keyword> button to automatically fill the
          remaining tiles with new words.
        </p>
        <Heading>Writing Clues</Heading>
        <Img src="/gifs/cluesv2.gif" alt="Writing Clues" height={350} />
        <p>
          In the <Keyword>Clues</Keyword> tab, you can enter clues for each of
          the answers on the board. There is a lot of literature available
          online about how to write good crossword puzzle clues, but it is much
          more of an art than a science. While this can often be the most
          time-consuming part of constructing a puzzle, it is worth taking the
          time to write high-quality clues. Crosswyrd provides clue suggestions
          from historical New York Times puzzles for inspiration.
        </p>
        <Heading>Publishing Your Puzzle</Heading>
        <Img src="/gifs/publish.gif" alt="Publishing Your Puzzle" />
        <p>
          You've filled all empty tiles and written the clues. Now it's time to
          share the puzzle for others to enjoy! Click <Keyword>Publish</Keyword>{' '}
          in the drawer on the left side of the screen to upload the puzzle and
          get a shareable link. Send this link out to your friends or community
          so they can try their hand at solving your creation.
        </p>
        <GarrettNote />
      </DialogContent>
      {showCheckbox && (
        <DialogActions>
          <div className="welcome-dialog-actions">
            <div className="welcome-dialog-do-not-show">
              <FormControlLabel
                control={
                  <Checkbox checked={boxChecked} onChange={handleBoxClick} />
                }
                label="Do not show again"
              />
            </div>
            <Button
              variant="contained"
              color="primary"
              endIcon={<KeyboardArrowRightIcon />}
              onClick={onClose}
            >
              Let's go!
            </Button>
          </div>
        </DialogActions>
      )}
    </Dialog>
  );
}
