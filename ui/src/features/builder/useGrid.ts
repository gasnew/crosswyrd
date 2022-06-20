import axios from 'axios';
import _ from 'lodash';
import { useCallback, useEffect, useState } from 'react';

import { PUZZLE_SIZE } from './constants';

export interface GridType {
  tiles: boolean[][];
  date: string;
}

export default function useGrid(): {
  grid: GridType | null;
  newGrid: () => void;
} {
  const [grids, setGrids] = useState<GridType[]>([]);
  const [grid, setGrid] = useState<GridType | null>(null);

  // Fetch grid on mount
  useEffect(() => {
    const fetchGrids = async () => {
      const response = await axios.get('grid_list.json');
      const gridsData = response.data as {
        grid: ('0' | '.')[];
        date: string;
      }[];
      const grids = _.map(gridsData, (gridData) => ({
        tiles: _.chunk(
          _.map(gridData.grid, (tile) => tile === '.'),
          PUZZLE_SIZE
        ),
        date: gridData.date,
      }));

      setGrids(grids);
      setGrid(_.sample(grids) || null);
    };
    fetchGrids();
  }, []);

  const newGrid = useCallback(() => {
    if (grids.length === 0) return;
    setGrid(_.sample(grids) || grid);
  }, [grids, grid]);

  return { grid, newGrid };
}
