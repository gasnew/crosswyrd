import _ from 'lodash';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { selectPuzzle, toggleTileBlack } from './builderSlice';
import useWaveFunctionCollapse from './useWaveFunctionCollapse';

import './CrosswordBuilder.css';

export default function CrosswordBuilder() {
  const puzzle = useSelector(selectPuzzle);
  const { wave, observeAtLocation } = useWaveFunctionCollapse();

  const dispatch = useDispatch();

  const mkHandleClickTile = (row, column) => {
    return (event) => {
      if (event.ctrlKey)
        dispatch(
          toggleTileBlack({
            row,
            column,
          })
        );
    };
  };
  return (
    <div className="tiles-container">
      {_.map(puzzle.tiles, (row, rowIndex) => (
        <div key={rowIndex} className="puzzle-row">
          {_.map(row, (tile, columnIndex) => (
            <div
              key={columnIndex}
              className={
                'tile' + (tile.value === 'black' ? ' tile--black' : '')
              }
              onClick={mkHandleClickTile(rowIndex, columnIndex)}
            >
              {!_.includes(['empty', 'black'], tile.value) && tile.value}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
