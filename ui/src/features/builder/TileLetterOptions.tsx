import _ from 'lodash';

import { LetterType } from './builderSlice';

interface Props {
  options: LetterType[];
}

export default function TileLetterOptions({ options }: Props) {
  return (
    <div className="tile-letter-options">
      {_.map(_.chunk(options, 3), (row, rowIndex) => (
        <div key={rowIndex} className="tile-letter-options-row">
          {_.map(row, (letter, columnIndex) => (
            <div key={columnIndex} className="tile-letter-options-letter">
              {_.toUpper(letter)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
