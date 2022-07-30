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

function App() {
  return (
    <>
      {devMode() && (
        <Helmet>
          <title>LOCAL - Crosswyrd</title>
          <link rel="icon" href={`${process.env.PUBLIC_URL}/favicon-dev.ico`} />
        </Helmet>
      )}
      <Router>
        <Switch>
          <Route path="/builder">
            <Crosswyrd />
          </Route>
          <Redirect to="/builder" />
        </Switch>
      </Router>
    </>
  );
}
export default App;
