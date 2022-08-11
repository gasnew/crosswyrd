import { HotkeysProvider } from '@blueprintjs/core';
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import App from './features/app/App';
import { store } from './app/store';
import initFirebase from './firebase';
import './index.css';

initFirebase();
ReactDOM.render(
  <Provider store={store}>
    <HotkeysProvider dialogProps={{ isOpen: true }}>
      <App />
    </HotkeysProvider>
  </Provider>,
  document.getElementById('root')
);
