import {
  combineReducers,
  configureStore,
  getDefaultMiddleware,
} from '@reduxjs/toolkit';

import builderSliceReducer from '../features/builder/builderSlice';

const reducer = combineReducers({
  builder: builderSliceReducer,
});

export const store = configureStore({
  reducer,
  middleware: getDefaultMiddleware({
    // NOTE(gnewman): This check is silly anyway. Really, we want a check for
    // immutability, not serializability (e.g., putting a function into redux
    // state triggers this warning). Let's disable it here and just
    // pretty-please promise not to try to mutate objects we get from redux.
    serializableCheck: false,
  }),
});

export type RootState = ReturnType<typeof store.getState>;
