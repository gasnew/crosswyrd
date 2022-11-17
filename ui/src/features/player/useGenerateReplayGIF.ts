import GIF from 'gif.js.optimized';
import _ from 'lodash';
import { colors } from '@mui/material';
import React from 'react';
import { useSelector } from 'react-redux';
import { parseGIF, decompressFrames } from 'gifuct-js';

import {
  CrosswordPuzzleType,
  selectTileUpdates,
  TileValueType,
} from '../builder/builderSlice';
import { buildGlobalPalette, GLOBAL_PALETTE } from './gifGlobalPalette';
import { TileUpdateType } from '../builder/useWaveFunctionCollapse';

const GIF_SIZE = 259;
const FRAME_DELAY = 40;
const FRAME_COUNT = 120;
const LINE_WIDTH = 4;
const TILE_BLUE_LIGHT = colors.teal[50];
const TILE_BLUE = colors.teal[300];
const TILE_RED_LIGHT = colors.orange[50];
const TILE_RED = colors.orange[200];
const TILE_ANIMATE_FRAMES = 4;

interface AnimatedTileType {
  value: TileValueType;
  lastUpdatedFrame: number;
}
interface AnimatedPuzzleType {
  tiles: AnimatedTileType[][];
}

// https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}
function rgbToHex(r, g, b) {
  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 0, b: 0 };
}

function dynamicColor(light: string, dark: string, frameDelta: number): string {
  const lightRgb = hexToRgb(light);
  const darkRgb = hexToRgb(dark);
  const mix = Math.min(frameDelta / TILE_ANIMATE_FRAMES, 1);
  return rgbToHex(
    Math.floor(darkRgb.r * mix + lightRgb.r * (1 - mix)),
    Math.floor(darkRgb.g * mix + lightRgb.g * (1 - mix)),
    Math.floor(darkRgb.b * mix + lightRgb.b * (1 - mix))
  );
}

function drawFrame(
  ctx: any,
  puzzleKey: CrosswordPuzzleType,
  animatedPuzzle: AnimatedPuzzleType,
  currentFrame: number
) {
  // Half the line width on either side acts as the GIF border, so we want
  // tiles to be slightly smaller to account for this
  const tileSize = (GIF_SIZE - LINE_WIDTH) / puzzleKey.tiles.length;
  let updatePosition: any = null;
  _.times(puzzleKey.tiles.length, (row) =>
    _.times(puzzleKey.tiles.length, (column) => {
      const tile = animatedPuzzle.tiles[row][column];
      const frameDelta = currentFrame - tile.lastUpdatedFrame;
      const newFillStyle =
        tile.value === 'black'
          ? '#000'
          : tile.value === 'empty'
          ? '#fff'
          : tile.value === puzzleKey.tiles[row][column].value
          ? frameDelta >= TILE_ANIMATE_FRAMES
            ? TILE_BLUE
            : dynamicColor(TILE_BLUE_LIGHT, TILE_BLUE, frameDelta)
          : frameDelta >= TILE_ANIMATE_FRAMES
          ? TILE_RED
          : dynamicColor(TILE_RED_LIGHT, TILE_RED, frameDelta);
      // Optimization so we're not setting it all the time (though this is
      // still the slowest code)
      // TODO: slow
      if (ctx.fillStyle !== newFillStyle) ctx.fillStyle = newFillStyle;
      ctx.fillRect(column * tileSize, row * tileSize, tileSize, tileSize);
      ctx.strokeRect(column * tileSize, row * tileSize, tileSize, tileSize);
      if (currentFrame !== 0 && frameDelta === 0)
        updatePosition = { row, column };
    })
  );

  if (updatePosition) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = LINE_WIDTH + 1;
    ctx.strokeRect(
      updatePosition.column * tileSize,
      updatePosition.row * tileSize,
      tileSize,
      tileSize
    );
    ctx.lineWidth = LINE_WIDTH;
    ctx.strokeStyle = '#000';
  }
}

function cleanTileUpdates(
  puzzleKey: CrosswordPuzzleType,
  tileUpdates: TileUpdateType[]
): TileUpdateType[] {
  // Return tile updates without redundant updates and without any after the
  // puzzle is completed

  // Create the animated puzzle, which will be mutated as we process through
  // tile updates
  const animatedPuzzle: AnimatedPuzzleType = {
    tiles: _.times(puzzleKey.tiles.length, (rowIndex) =>
      _.times(puzzleKey.tiles.length, (columnIndex) => ({
        value:
          puzzleKey.tiles[rowIndex][columnIndex].value === 'black'
            ? 'black'
            : 'empty',
        lastUpdatedFrame: 0,
      }))
    ),
  };

  // Filter out redundant tile updates and all updates after the puzzle has
  // been completed
  let puzzleCompleted = false;
  return _.filter(tileUpdates, ({ row, column, value }) => {
    if (puzzleCompleted) return false;
    const animatedTile = animatedPuzzle.tiles[row][column];
    if (animatedTile.value === value)
      // Don't draw redundant frames
      return false;

    animatedTile.value = value;

    // Mark the animation as done if all tiles are correct
    // TODO: slow
    if (
      _.every(
        _.flatMap(animatedPuzzle.tiles, (row, rowIndex) =>
          _.map(
            row,
            (tile, columnIndex) =>
              tile.value === puzzleKey.tiles[rowIndex][columnIndex].value
          )
        )
      )
    ) {
      puzzleCompleted = true;
    }
    return true;
  });
}

function easeInOutQuart(x: number): number {
  return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
}
function easeInOutSine(x: number): number {
  return -(Math.cos(Math.PI * x) - 1) / 2;
}
function easedChunks<T>(
  items: T[],
  quantity: number,
  easeFn: (number) => number
): T[][] {
  return _.times(quantity, (index) => {
    const itemsIndex = Math.floor(easeFn(index / quantity) * items.length);
    const prevItemsIndex =
      index === 0
        ? 0
        : Math.floor(easeFn((index - 1) / quantity) * items.length);

    return index < quantity - 1
      ? // A slice of items since the last index
        items.slice(prevItemsIndex, itemsIndex)
      : // The final slice (make sure to include the last item)
        items.slice(prevItemsIndex, items.length);
  });
}

export default function useGenerateReplayGIF(
  puzzleCompleted: boolean,
  puzzleKey: CrosswordPuzzleType
) {
  const [gifUrl, setGifUrl] = React.useState<string | null>(null);
  const tileUpdates = useSelector(selectTileUpdates);

  // Render replay GIF
  const renderAttempted = React.useRef(false);
  React.useEffect(() => {
    if (gifUrl || !puzzleCompleted || renderAttempted.current) return;
    renderAttempted.current = true;

    // Initialize canvas object
    const canvas = document.createElement('canvas');
    canvas.width = GIF_SIZE;
    canvas.height = GIF_SIZE;
    // Setting willReadFrequently to true makes ingesting the canvas into
    // gif.js much faster, but it also causes TypeScript to get confused, so we
    // force the type here to be correct.
    const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d', {
      willReadFrequently: true,
    }) as CanvasRenderingContext2D | null;
    if (!ctx) return;

    // Init canvas context things
    ctx.translate(LINE_WIDTH / 2, LINE_WIDTH / 2);
    ctx.lineWidth = LINE_WIDTH;
    ctx.strokeStyle = '#000';

    // Initialize GIF object
    const gif = new GIF({
      workers: 2,
      quality: 10,
      // TODO uncomment
      globalPalette: _.flatten(GLOBAL_PALETTE),
    });

    // Create the animated puzzle, which will be mutated as we process through
    // frames
    const animatedPuzzle: AnimatedPuzzleType = {
      tiles: _.times(puzzleKey.tiles.length, (rowIndex) =>
        _.times(puzzleKey.tiles.length, (columnIndex) => ({
          value:
            puzzleKey.tiles[rowIndex][columnIndex].value === 'black'
              ? 'black'
              : 'empty',
          lastUpdatedFrame: 0,
        }))
      ),
    };

    // Add an initial frame
    let currentFrame = 0;
    drawFrame(ctx, puzzleKey, animatedPuzzle, 0);
    gif.addFrame(canvas, { delay: 200, copy: true });
    currentFrame += 1;

    // Add a frame for each tile update
    const chunkedTileUpdates = easedChunks(
      cleanTileUpdates(puzzleKey, tileUpdates),
      FRAME_COUNT,
      easeInOutSine
    );
    _.forEach(chunkedTileUpdates, (tileUpdates, index) => {
      // Update animatedPuzzle for each tile update in this chunk
      _.forEach(tileUpdates, ({ row, column, value }) => {
        const animatedTile = animatedPuzzle.tiles[row][column];
        // Ingest tile update into animated puzzle
        animatedTile.value = value;
        animatedTile.lastUpdatedFrame = currentFrame;
      });

      // Make all tiles flash if we're at the end
      if (index === chunkedTileUpdates.length - 1)
        _.forEach(_.flatten(animatedPuzzle.tiles), (tile) => {
          tile.lastUpdatedFrame = Math.max(
            tile.lastUpdatedFrame,
            currentFrame - 1
          );
        });

      // Draw and add the frame
      _.times(2, () => {
        drawFrame(ctx, puzzleKey, animatedPuzzle, currentFrame);
        gif.addFrame(canvas, { delay: FRAME_DELAY, copy: true });
        currentFrame += 1;
      });
    });

    // Draw some extra frames at the end to resolve animations
    _.times(TILE_ANIMATE_FRAMES, () => {
      drawFrame(ctx, puzzleKey, animatedPuzzle, currentFrame);
      gif.addFrame(canvas, { delay: FRAME_DELAY, copy: true });
      currentFrame += 1;
    });
    // Draw one final frame and hold
    drawFrame(ctx, puzzleKey, animatedPuzzle, currentFrame);
    gif.addFrame(canvas, { delay: 3000, copy: true });
    currentFrame += 1;

    gif.on('finished', function (blob) {
      //setGifUrl(URL.createObjectURL(blob));

      const url = URL.createObjectURL(blob);
      var promisedGif = fetch(url)
        .then((resp) => resp.arrayBuffer())
        .then((buff) => {
          var gif = parseGIF(buff);
          var frames = decompressFrames(gif, true);
          return gif;
        });
      window.open(url);
    });

    gif.render();
  }, [gifUrl, puzzleCompleted, tileUpdates, puzzleKey]);
}
