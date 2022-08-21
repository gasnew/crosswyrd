import { HotkeysProvider } from '@blueprintjs/core';
import React, { useContext } from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import App from './features/app/App';
import StateProvider, { StateContext } from './features/app/StateProvider';
import './firebase';
import './index.css';

function RootComponent() {
  const { store, persistor } = useContext(StateContext);

  if (!store || !persistor) return null;
  return (
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <HotkeysProvider dialogProps={{ isOpen: true }}>
          <App />
        </HotkeysProvider>
      </PersistGate>
    </Provider>
  );
}

ReactDOM.render(
  <StateProvider>
    <RootComponent />
  </StateProvider>,
  document.getElementById('root')
);
