// This is a component that provides the Redux state, including rehydrating it
// on load with redux-persist. A single browser can store states for both
// puzzle builder and player states separately.

import storage from 'localforage';
import React, { useLayoutEffect, useMemo, useState } from 'react';
import { Persistor, persistStore, persistReducer } from 'redux-persist';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider } from 'react-redux';
import { useHistory } from 'react-router-dom';
import {
  combineReducers,
  configureStore,
  getDefaultMiddleware,
  Reducer,
  Store,
  EnhancedStore,
} from '@reduxjs/toolkit';

import builderSliceReducer from '../builder/builderSlice';

function initStore<S>(reducer: Reducer<S>): EnhancedStore<S> {
  return configureStore({
    reducer,
    middleware: getDefaultMiddleware({
      // NOTE(gnewman): This check is silly anyway. Really, we want a check for
      // immutability, not serializability (e.g., putting a function into redux
      // state triggers this warning). Let's disable it here and just
      // pretty-please promise not to try to mutate objects we get from redux.
      serializableCheck: false,
    }),
  });
}

const ROOT_REDUCER = combineReducers({
  builder: builderSliceReducer,
});
// TODO Get this type without instantiating tempStore
const tempStore = initStore(ROOT_REDUCER);
export type RootState = ReturnType<typeof tempStore.getState>;

// TODO: Optimize...?
interface Props {
  children: React.ReactNode;
  stateKey: 'builder' | 'player';
}
export default function StateProvider({ children, stateKey }: Props) {
  // Prevent rendering child components until/unless the redux state has been
  // rehydrated
  const [render, setRender] = useState(false);
  const history = useHistory();

  const store = useMemo<Store>(
    () =>
      initStore(
        combineReducers({
          ...ROOT_REDUCER,
          builder: persistReducer(
            {
              key: stateKey,
              storage,
              blacklist: ['draggedWord', 'currentTab', 'letterEntryEnabled'],
            },
            builderSliceReducer
          ),
        })
      ),
    [stateKey]
  );
  const persistor = useMemo<Persistor>(
    () =>
      persistStore(store, null, () =>
        // Enable rendering after the rehydration has occurred--we don't want
        // child components to accidentally overwrite our redux state.
        setRender(true)
      ),
    [store]
  );

  // Prevent rendering if the history was just popped or pushed. This gives us
  // time to rehydrate the redux state for the new route before mounting our
  // component tree.
  useLayoutEffect(() => {
    return history.listen(() => {
      if (history.action === 'POP' || history.action === 'PUSH')
        setRender(false);
    });
  }, [history]);

  if (!render) return null;
  return (
    <Provider store={store}>
      <PersistGate persistor={persistor}>{children}</PersistGate>
    </Provider>
  );
}
