import React from 'react';
import { Helmet } from 'react-helmet';
import {
  BrowserRouter as Router,
  Switch,
  Redirect,
  Route,
} from 'react-router-dom';

import { devMode } from '../../app/util';
import Crosswyrd from './Crosswyrd';
import LandingPage from '../landingPage/LandingPage';
import CrosswordPlayer from '../player/CrosswordPlayer';
import StateProvider from './StateProvider';

import './App.css';

function App() {
  return (
    <>
      {devMode() && (
        <Helmet>
          <link rel="icon" href={`${process.env.PUBLIC_URL}/favicon-dev.ico`} />
        </Helmet>
      )}
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
          <Route path="/">
            <StateProvider stateKey="landing">
              <LandingPage />
            </StateProvider>
          </Route>
          <Redirect to="/" />
        </Switch>
      </Router>
    </>
  );
}
export default App;
