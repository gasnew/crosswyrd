import axios from 'axios';
import _ from 'lodash';
import { useEffect, useState } from 'react';

// All stored grids are 15x15
const GRID_SIZE = 15;

export interface GridType {
  tiles: boolean[][];
  date?: string;
}

interface ReturnType {
  grids: GridType[];
}

export default function useGrids(): ReturnType {
  const [grids, setGrids] = useState<GridType[]>([]);

  // Fetch grids on mount
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
          GRID_SIZE
        ),
        date: gridData.date,
      }));

      setGrids(grids);
    };
    fetchGrids();
  }, []);

  return { grids };
}
