import React from 'react';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

import { GarrettNote } from './KoFiButton';

// Any viewport with width or height smaller than these will not be able to see
// the whole builder interface at once.
const MIN_VIEWPORT_WIDTH = 970;
const MIN_VIEWPORT_HEIGHT = 694;

function Img({ src, alt }: { src: string; alt: string }) {
  return <img className="sheet welcome-dialog-img" src={src} alt={alt} />;
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

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function WelcomeDialog({ open, onClose }: Props) {
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
        <p>
          Crosswyrd makes constructing and sharing crosswords as simple as
          possible.
        </p>
        <Typography variant="h5">Controls</Typography>
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
        <Typography variant="h5">Filling the Board</Typography>
        <Img src="/gifs/fill.gif" alt="Filling the Board" />
        <p>
          You'll start with selecting a grid pattern. The classic way to
          construct a crossword is to start with a blank grid, but you can pick
          from an array of preset patterns as well for a quick start. If it's
          your first time constructing a puzzle, starting with a 5x5 grid is a
          good way to get your feet wet. As you place and remove black tiles
          with <InlineKbd>.</InlineKbd>, you'll notice that the board maintains
          rotational symmetry. This is a common pattern for dense crossword
          puzzles like this, and the New York Times requires symmetry for their
          crossword submissions.
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
          Once you have a theme in mind, you can enter some ideas into the Word
          Bank then click and drag them onto the board to see how they fit. You
          can also fill in words directly on the board by typing them
          letter-by-letter, or pick from the suggested words in the Fill tab in
          the sidebar. Try it out, and see which approaches work best for you!
        </p>
        <p>
          Crosswyrd comes with a built-in Fill Assist, which suggests words that
          fit in the part of the board you have selected and tells you when the
          board is not solvable. It does this by partially solving the puzzle
          any time you make a change to it. The darker blue the tile, the more
          constrained it is, so it is recommended that you generally prioritize
          filling darker blue tiles first. When you have filled the board with
          your own words to your satisfaction, you can click Auto-Fill to
          automatically fill the remaining tiles with new words.
        </p>
        <Typography variant="h5">Writing Clues</Typography>
        <p>
          In the Clues tab, you can enter clues for each of the answers on the
          board. There is a lot of literature available online about how to
          write good crossword puzzle clues, but it is much more of an art than
          a science. While this can often be the most time-consuming part of
          constructing a puzzle, it is worthwhile to the user to have
          high-quality clues to work off of.
        </p>
        <Typography variant="h5">Publishing Your Puzzle</Typography>
        <p>
          You've filled all empty tiles and written the clues. Now it's time to
          share the puzzle for others to enjoy! Click Publish in the drawer on
          the left side of the screen to upload the puzzle and get a shareable
          link. Send this link out to your friends or community so they can try
          their hand at solving your creation.
        </p>
        <GarrettNote />
      </DialogContent>
      <DialogActions>Do not show again</DialogActions>
    </Dialog>
  );
}
