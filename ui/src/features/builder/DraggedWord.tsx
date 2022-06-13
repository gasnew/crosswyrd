import _ from 'lodash';
import { Card, CardContent } from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { selectDraggedWord, setDraggedWord } from './builderSlice';

interface PositionType {
  x: number;
  y: number;
}

export default function DraggedWord() {
  const [position, setPosition] = useState<PositionType>({ x: 0, y: 0 });
  const [hidden, setHidden] = useState(false);

  const draggedWord = useSelector(selectDraggedWord);

  const dispatch = useDispatch();

  const onMouseMove = useCallback(
    (event) => setPosition({ x: event.clientX, y: event.clientY }),
    []
  );
  const onMouseLeave = useCallback(() => setHidden(true), []);
  const onMouseEnter = useCallback(() => setHidden(false), []);
  const onClick = useCallback(() => {
    if (draggedWord) dispatch(setDraggedWord(null));
  }, [dispatch, draggedWord]);

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
  }, [onMouseMove, onMouseEnter, onMouseLeave, onClick]);

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
