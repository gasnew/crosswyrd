import _ from 'lodash';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  incorporateWaveIntoPuzzle,
  selectPuzzle,
  toggleTileBlack,
} from './builderSlice';
import useWaveFunctionCollapse from './useWaveFunctionCollapse';

import './CrosswordBuilder.css';

export default function CrosswordBuilder() {
  const puzzle = useSelector(selectPuzzle);
  const { wave, observeAtLocation } = useWaveFunctionCollapse(puzzle);

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
      else {
        if (!wave) return;
        const newValue = _.sample(wave.elements[row][column].options);
        if (!newValue) return;
        observeAtLocation(row, column, newValue);
      }
    };
  };

  // Incorporate wave into puzzle
  useEffect(() => {
    if (!wave) return;
    dispatch(incorporateWaveIntoPuzzle(wave));
  }, [dispatch, wave]);

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
              {!_.includes(['empty', 'black'], tile.value)
                ? tile.value
                : tile.options.length}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
