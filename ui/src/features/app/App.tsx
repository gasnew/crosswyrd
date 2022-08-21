import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Redirect,
  Route,
} from 'react-router-dom';

import Crosswyrd from './Crosswyrd';
import CrosswordPlayer from '../player/CrosswordPlayer';
import StateProvider from './StateProvider';

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/builder">
          <StateProvider stateKey="builder">
            <Crosswyrd />
          </StateProvider>
        </Route>
        <Route path="/puzzles/:puzzleId">
          <StateProvider stateKey="player">
            <CrosswordPlayer />
          </StateProvider>
        </Route>
        <Redirect to="/builder" />
      </Switch>
    </Router>
  );
}
export default App;
