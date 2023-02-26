import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from './store'
import * as types from './types'

const initialState: types.HelpState = {
    helps: [
        {
            longName: "aaa",
            help:
                "Quisque cursus, metus vitae pharetra Nam libero tempore, cum soluta nobis est eligendi",
        },
        {
            longName: "aaa",
            help:
                "Harum quidem rerum facilis est et expedita distinctio quas molestias excepturi sint",
        },
    ],
}

// TODO: figure out how to use this and hook it up instead of fetching help in every component.

export const helpSlice = createSlice({
  name: 'help',
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    // increment: (state) => {
    //  // state.value += 1
    // },
    // decrement: (state) => {
    //  // state.value -= 1
    // },
    // // Use the PayloadAction type to declare the contents of `action.payload`
    // incrementByAmount: (state, action: PayloadAction<types.Help>) => {
    //   //state.value += action.payload
    //   state.helps.push(action.payload)
    // },

    add: (state, action: PayloadAction<types.Help>) => {
        // var newState = {...state}
        // newState.helps.push(action.payload)
        // return newState
        // they say this is safe
        state.helps.push(action.payload)
      },

  },
})

// increment, decrement, incrementByAmount,

export const { add } = helpSlice.actions

// Other code such as selectors can use the imported `RootState` type
export const selectHelps = (state: RootState) => state.help.helps

export const helpReducer = helpSlice.reducer