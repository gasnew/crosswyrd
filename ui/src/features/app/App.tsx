import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Redirect,
  Route,
} from 'react-router-dom';

import Crosswyrd from './Crosswyrd';
import CrosswordPlayer from '../player/CrosswordPlayer';

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/builder">
          <Crosswyrd />
        </Route>
        <Route path="/puzzles/:puzzleId">
          <CrosswordPlayer />
        </Route>
        <Redirect to="/builder" />
      </Switch>
    </Router>
  );
}
export default App;
