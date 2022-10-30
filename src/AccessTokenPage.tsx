
import { Button, Paper } from '@mui/material'
import React, { FC, ReactElement, useEffect } from 'react'

import './homepage.css'

import * as util from './AccessTokenPageUtil'

import { CopyToClipboard } from 'react-copy-to-clipboard'

import Dialog from '@material-ui/core/Dialog';
import TextField from '@mui/material/TextField';

import { serverName } from './App'

import * as saved from './SavedStuff'


type State = {

    theToken: string
    // hasToken: boolean
    //  adding: boolean
    isPasteOwnedToken: boolean
}

var defaultState: State = {

    theToken: '',
    //   hasToken: false,
    //  adding: false,
    isPasteOwnedToken: false
}


type Props = {
}

export const AccessTokenPage: FC<Props> = (props: Props): ReactElement => {

    var startstate = {
        ...defaultState
    }

    var foundtoken = saved.getToken()
    if (foundtoken !== "") {
        startstate.theToken = foundtoken
        console.log("AccessTokenPage starting No token", foundtoken)
    } else {
        console.log("AccessTokenPage starting No token")
    }

    const [state, setState] = React.useState(startstate);

    useEffect(() => {
    })

    function getTokenFromServer() {
        console.log("getting token from server")

        console.log("serverName", serverName)
        util.getFreeToken(serverName, (ok: boolean, tok: string) => {
            console.log("got a token", tok, ok)
            const newState: State = {
                ...state,
                theToken: tok
            }
            saved.setToken(tok)
            setState(newState)
        })
    }
    function clearLocalToken() {
        console.log("clear token")
        const newState: State = {
            ...state,
            theToken: ""
        }
        saved.setToken("")
        setState(newState)
    }

    function addExistingToken() {
        console.log("addExistingToken")
        const newState: State = {
            ...state,
            isPasteOwnedToken: true
        }
        setState(newState)
    }

    var potDialogTempValue = ""
    function handleDialogClose() {
        console.log("dialog handleDialogClose")
        const newState: State = {
            ...state,
            isPasteOwnedToken: false,
            theToken: potDialogTempValue
        }
        setState(newState)
    }


    const getTokMessage = (): ReactElement => {
        if (state.theToken !== "") {

            return (
                <>
                    Your token:<br></br>
                    <code>
                        {/* <Paper>{state.theToken}</Paper> */}
                        <pre>{state.theToken}</pre>
                    </code>
                    <div  >
                        <CopyToClipboard text={state.theToken}
                            onCopy={() => console.log("theToken copied to clipboard")} >
                            <Button variant="outlined"  >Copy to clipboard.</Button>
                        </CopyToClipboard>
                    </div>
                    <Button variant="outlined" onClick={clearLocalToken} >Clear</Button> <br></br>
                    <Button variant="outlined" onClick={addExistingToken} >Add existing token</Button><br></br>
                </>
            )

        } else {

            return (
                <>
                    Looks like you don't have a token yet.<br></br>
                    <Button variant="outlined" onClick={getTokenFromServer} >Get new access token</Button><br></br>
                    <Button variant="outlined" onClick={addExistingToken} >Add existing token</Button><br></br>
                </>
            )
        }
    }

    // {/* <Box>
    //     Paste another token here and we will use that one.
    //     Note that everything is stored locally. <br></br>
    //     <pre>
    //     <code>
    //             <input defaultValue={"paste token here"}>
    //             </input>
    //     </code>
    //     </pre>
    // </Box> */} 


    type PotParams = {
        token: string
    }
    const PasteOwnedTokenDialog = (params: PotParams): ReactElement => {

        function ownedTokenChanged(e: React.ChangeEvent<HTMLInputElement>) {
            console.log("ownedTokenChanged", e.currentTarget.value)
            const tok = e.currentTarget.value
            potDialogTempValue = tok
        }


        return (

            < div style={{ width: "75%", height: "75%", padding: 24 }} >
                <div style={{ width: "75%", height: "75%", padding: 12 }} >

                    <TextField
                        onChange={ownedTokenChanged}
                        id="outlined-helperText"
                        label="Paste token here"
                        defaultValue={params.token}
                        helperText="Paste another token here and we will use that one.
          Note that everything is stored locally. tbd"
                    />

                </div>
            </div >
        )
    }

    // style={{ width: 600, height: 800, padding: 24 }} // doesn't even work
    // why can't I style with css?

    return (
        <span>
            <Dialog
                open={state.isPasteOwnedToken}
                onClose={handleDialogClose}
            >
                <PasteOwnedTokenDialog token={state.theToken} />
            </Dialog>

            {getTokMessage()}
        </span>
    )
}


