
import { Button } from '@mui/material'  // Card,Paper
import React, { FC, ReactElement, useEffect } from 'react'

// import './homepage.css'
import './AccessTokenPage.css'

import * as util from './AccessTokenPageUtil'

import { CopyToClipboard } from 'react-copy-to-clipboard'

import Dialog from '@material-ui/core/Dialog';
import TextField from '@mui/material/TextField';

import { serverName } from './App'

import * as saved from './SavedStuff'
import * as helpers from './Helpers'
import * as utils from './Utils'
import * as mqtt from './MqttClient'
import * as registry from './ChangeRegistry'
import * as types from './Types'


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
        // console.log("AccessTokenPage starting token", foundtoken)
    } else {
        // console.log("AccessTokenPage starting No token")
    }

    const [state, setState] = React.useState(startstate);

    const [stats,setStats] = React.useState(types.EmptyKnotFreeTokenStats);

    const registryNameTokenStats = 'registryNameTokenStatesYCDmkjgCLM'

    const gotUsageStats = (name: string, arg: any) => {

        console.log('gotUsageStats raw', arg.message.toString() )

        const str = arg.message.toString() // this stinks FIXME: arg needs type
        try {
            const newstats = JSON.parse(str) as types.KnotFreeTokenStats
            // FIXME: validate
            setStats(newstats)
        } catch (e) {
            const newstats = types.EmptyKnotFreeTokenStats
            console.log('ERROR FAILED gotUsageStats',newstats )  
        }
    }

    useEffect(() => {
        registry.SetSubscripton(registryNameTokenStats, gotUsageStats)
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
                            <Button className='myButtons' variant="outlined"  >Copy to clipboard.</Button>
                        </CopyToClipboard>
                    </div>
                    <Button variant="outlined" className='myButtons' onClick={clearLocalToken} >Clear</Button> <br></br>
                    <Button variant="outlined" className='myButtons' onClick={addExistingToken} >Add existing token</Button><br></br>
                </>
            )

        } else {

            return (
                <>
                    Looks like you don't have a token yet.<br></br>
                    <Button variant="outlined" className='myButtons' onClick={getTokenFromServer} >Get new access token</Button><br></br>
                    <Button variant="outlined" className='myButtons' onClick={addExistingToken} >Add existing token</Button><br></br>
                </>
            )
        }
    }

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
                        // id="outlined-helperText"
                        label="Paste token here"
                        defaultValue={params.token}
                        helperText="Paste another token here and we will use that one.
          Note that everything is stored locally."
                    />
                </div>
            </div >
        )
    }

    // style={{ width: 600, height: 800, padding: 24 }} // doesn't even work
    // why can't I style with css?

    function getUsageClicked() {

        let [payload, error] = utils.GetPayloadFromToken(state.theToken)
        if (error.length > 0) {
            return
        }
        // console.log("sendng publish get stats to ", payload.jti)
        mqtt.Publish('get stats', payload.jti, registryNameTokenStats)
    }

    const tokenText = utils.TokenToLimitsText(state.theToken)
    const tokenParagraphs = helpers.LinesToParagraphs(tokenText)

    const useageText = utils.KnotFreeTokenStatsToText(stats)
    const usageParagraphs = helpers.LinesToParagraphs(useageText)

    return (
        <span>
            <Dialog
                open={state.isPasteOwnedToken}
                onClose={handleDialogClose}
            >
                <PasteOwnedTokenDialog token={state.theToken} />
            </Dialog>

            {getTokMessage()}
            <div>
                <div className='overlay' >
                    Token properties
                </div>
                <div className='tokenCard'>
                    {tokenParagraphs}
                </div>
            </div>
            <Button variant="outlined" className='myButtons' onClick={getUsageClicked} >Get current usage numbers</Button>
            <div>
                <div className='overlay' >
                    Current usage numbers.
                </div>
                <div className='tokenCard'>
                    {usageParagraphs}
                </div>
            </div>
 
        </span>
    )
}


// Copyright 2021-2022 Alan Tracey Wootton
// See LICENSE
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
