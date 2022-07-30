import _ from 'lodash';
import { Card, CardContent } from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { selectDraggedWord } from './builderSlice';

interface PositionType {
  x: number;
  y: number;
}

export default function DraggedWord() {
  const [position, setPosition] = useState<PositionType>({ x: 0, y: 0 });
  const [hidden, setHidden] = useState(false);

  const draggedWord = useSelector(selectDraggedWord);

  const onMouseMove = useCallback(
    (event) =>
      draggedWord && setPosition({ x: event.clientX, y: event.clientY }),
    [draggedWord]
  );
  const onMouseLeave = useCallback(() => setHidden(true), []);
  const onMouseEnter = useCallback(() => setHidden(false), []);
  const onClick = useCallback((event) => {
    setPosition({ x: event.clientX, y: event.clientY });
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseenter', onMouseEnter);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseenter', onMouseEnter);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('click', onClick);
    };
  }, [onMouseMove, onMouseEnter, onMouseLeave, onClick, draggedWord]);

  if (!draggedWord || hidden) return null;
  return (
    <div className="dragged-word" style={{ left: position.x, top: position.y }}>
      <Card variant="outlined">
        <CardContent style={{ padding: 5 }}>
          {_.toUpper(draggedWord)}
        </CardContent>
      </Card>
    </div>
  );
}
