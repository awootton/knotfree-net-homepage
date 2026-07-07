import * as React from "react"
import { render } from "react-dom"
import { createStore, applyMiddleware, Store } from "redux"
import { configureStore } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import thunk from "redux-thunk"

import * as types from "./types"

import * as red from "./helpSlice"


// export const store: Store<types.HelpState, types.HelpAction> & {
//   dispatch: types.DispatchType
// } = configureStore( { reducer: reducers.helpReducer } ) // , applyMiddleware(thunk))

export const store = configureStore({
    reducer:
    {
      help: red.helpReducer,
    }
  })


// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch

