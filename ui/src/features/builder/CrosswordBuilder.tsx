import _ from 'lodash';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  incorporateWaveIntoPuzzle,
  LetterType,
  selectPuzzle,
  toggleTileBlack,
} from './builderSlice';
import { LETTER_WEIGHTS } from './constants';
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
        const newValue = _.sample(
          _.flatMap(LETTER_WEIGHTS, (weight, letter) =>
            _.includes(wave.elements[row][column].options, letter)
              ? _.times(weight, () => letter)
              : []
          )
        ) as LetterType | undefined;
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
              style={{
                ...(tile.value === 'empty'
                  ? {
                      backgroundColor:
                        tile.options.length > 0
                          ? `rgba(45, 114, 210, ${1 - tile.options.length / 26}`
                          : 'red',
                    }
                  : {}),
              }}
              onClick={mkHandleClickTile(rowIndex, columnIndex)}
            >
              <div className="tile-contents">
                {!_.includes(['empty', 'black'], tile.value) &&
                  _.upperCase(tile.value)}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
