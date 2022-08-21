// This is a component that provides the Redux state, including rehydrating it
// on load with redux-persist. A single browser can store states for both
// puzzle builder and player states separately.

import storage from 'localforage';
import _ from 'lodash';
import React, { createContext, useEffect, useState } from 'react';
import { Persistor, persistStore, persistReducer } from 'redux-persist';
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

interface StateContextType {
  store: Store | null;
  persistor: Persistor | null;
}
export const StateContext = createContext<StateContextType>({
  store: null,
  persistor: null,
});

// TODO: Optimize...?
interface Props {
  children: React.ReactNode;
}
export default function StateProvider({ children }: Props) {
  const [store, setStore] = useState<Store | null>(null);
  const [persistor, setPersistor] = useState<Persistor | null>(null);

  // Set the store and persistor given the URL pathname, keeping builder and
  // player state separate.
  useEffect(() => {
    if (store && persistor) return;

    // Key the persisted store off of whether we are using the builder or the
    // player.
    const key = _.includes(window.location.pathname, 'builder')
      ? 'builder'
      : 'player';
    const newStore = initStore(
      combineReducers({
        ...ROOT_REDUCER,
        builder: persistReducer(
          {
            key,
            storage,
            blacklist: ['draggedWord', 'currentTab', 'letterEntryEnabled'],
          },
          builderSliceReducer
        ),
      })
    );

    console.log('SET BASE STATE STUFF');
    setStore(newStore);
    setPersistor(persistStore(newStore, null, console.log));
  }, [persistor, store]);

  return (
    <StateContext.Provider value={{ store, persistor }}>
      {children}
    </StateContext.Provider>
  );
}
