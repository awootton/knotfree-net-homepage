
import { Button } from '@mui/material'  // Card,Paper
import React, { FC, ReactElement, useEffect } from 'react'

import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import * as pipeline from './Pipeline';

// import './homepage.css'
import './AccessTokenPage.css'

import * as util from './AccessTokenPageUtil'

import { CopyToClipboard } from 'react-copy-to-clipboard'

import Dialog from '@material-ui/core/Dialog';
import TextField from '@mui/material/TextField';

import * as app from './App'

import * as saved from './SavedStuff'
import * as helpers from './Utils-tsx'
import * as utils from './utils'

import * as registry from './ChangeRegistry'
import * as types from './Types'

import * as allMgr from './store/allThingsConfigMgr'
import * as tokenCache from './store/tokenCache'


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

type ThingPayloadConfig = {
    config: saved.ThingConfig
    payload: types.KnotFreeTokenPayload
}

type Props = {
}

// returns a list of all the configs deduped and with the payload empty
// we have no way to vet which is best but we can at least watch for empties.
export function CollectThingList(): ThingPayloadConfig[] {
    const all = allMgr.GetGlobalConfig()
    let list: ThingPayloadConfig[] = []
    for (let i = 0; i < all.things.length; i++) {
        const thing = all.things[i]
        let found: ThingPayloadConfig = { config: { ...thing }, payload: types.EmptyKnotFreeTokenPayload }
        let didFind = false
        for (let j = 0; j < list.length; j++) {
            if (list[j].config.longName === thing.longName) {
                found = {
                    ...list[j]
                }
                didFind = true
                break
            }
        }
        if (didFind) {
            if (found.config.adminPrivateKey === "") {
                found.config.adminPrivateKey = thing.adminPrivateKey
            }
            if (found.config.adminPublicKey === "") {
                found.config.adminPublicKey = thing.adminPublicKey
            }
            if (found.config.thingPublicKey === "") {
                found.config.thingPublicKey = thing.thingPublicKey
            }

        } else {
            list.push(found)
        }
    }
    return list
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

    const [stats, setStats] = React.useState(types.EmptyKnotFreeTokenStats);

    const [things, setThings] = React.useState(CollectThingList())

    const registryNameTokenStats = 'registryNameTokenStatesYCDmkjgCLM'

    const gotUsageStats = (name: string, arg: any) => {

        console.log('gotUsageStats raw', arg.message.toString())

        const str = arg.message.toString() // this stinks FIXME: arg needs type
        try {
            const newstats = JSON.parse(str) as types.KnotFreeTokenStats
            // FIXME: validate
            setStats(newstats)
        } catch (e) {
            const newstats = types.EmptyKnotFreeTokenStats
            console.log('ERROR FAILED gotUsageStats', newstats)
        }
    }

    useEffect(() => {
        registry.SetSubscripton(registryNameTokenStats, gotUsageStats)

        for (let i = 0; i < things.length; i++) {
            const thing = things[i]
            if (thing.payload.exp === 0) {
                tokenCache.subscribe(thing.config.longName, 'admin_' + thing.config.longName, thing.config, (h: types.KnotFreeTokenPayload) => {
                    console.log("got tokenCache.subscribe", h)
                    const newThings = [...things]
                    newThings[i].payload = h
                    setThings(newThings)
                })
            }
        }
    })

    function getTokenFromServer() {
        console.log("getting token from server")

        console.log("serverName", app.prefix, app.serverName)
        util.getFreeToken(app.prefix, app.serverName, (ok: boolean, tok: string) => {
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
                    A token is used when we are not working in http mode and is also used when configuring 'things' so that they can access the knotfree server:<br></br>
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
                    An access token is used by the things to log onto the network.<br></br>
                    Looks like you don't have a token yet. Press this button.<br></br>
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

    // this is not really useful. We want this for each thing.
    function getUsageClicked() {

        let [payload, error] = utils.GetPayloadFromToken(state.theToken)
        if (error.length > 0) {
            return
        }
        // console.log("sendng publish get stats to ", payload.jti)
        //  mqtt.Publish('get stats', payload.jti, registryNameTokenStats)
        let url = app.prefix + payload.jti + '.' + app.serverName + "get/stats"
        console.log('getStat url', url)

        fetch(url, { method: "GET" })
            .then(response => response.text())
            .then(data => {
                console.log('token stats:' + data)

                var str = '{"When":1667999501,"Stats":[' + data + ']}'
                console.log('token stats:' + str)
                var stats: types.KnotFreeTokenStats = JSON.parse(str) as types.KnotFreeTokenStats

                setStats(stats) // types.KnotFreeTokenStats
            })
            .catch(error => console.error(error));
    }

    let checkedArray: boolean[] = []

    function getThingsElementList(): ReactElement[] {

        // console.log("getThingList")
        const list = things
        const ret: ReactElement[] = []
        for (let i = 0; i < list.length; i++) {
            const thing = list[i]
            const expDate = new Date(thing.payload.exp * 1000)
            var label = thing.config.longName + " expires: " + expDate.getFullYear() + "-" + (expDate.getMonth()+1) + "-" + expDate.getDate()
            if (thing.payload.exp <= 1) {
                label = thing.config.longName + " expires: unknown"
            }
            ret.push(
                <FormControlLabel
                    key={i}
                    label={label}
                    control={<Checkbox checked={checkedArray[i]} onChange={() => {
                        checkedArray[i] = !checkedArray[i]
                    }} />}
                />
            )
        }
        return ret
    }

    const thingsElementList = getThingsElementList()

    const tokenText = utils.TokenToLimitsText(state.theToken)
    const tokenParagraphs = helpers.LinesToParagraphs(tokenText)

    const useageText = utils.KnotFreeTokenStatsToText(stats)
    const usageParagraphs = helpers.LinesToParagraphs(useageText)

    function setTokens() {
        for (let i = 0; i < thingsElementList.length; i++) {
            const element = thingsElementList[i]
            const checked = checkedArray[i]
            //console.log("checkbox element", element, checked)
            const index = i;
            const thing = things[i]
            if (checked) {
                let request: types.PublishArgs = {
                    ...types.EmptyPublishArgs,
                    ...thing.config,
                    longName: thing.config.longName,
                    cb: () => console.log("set token callback"),
                    serverName: app.serverName,
                    commandString: 'set token',
                    args: [state.theToken]
                }
                request.cmdDescription = "set the damn token"
                console.log("updating token for ", thing.config.longName)
                pipeline.Publish(request)
            }
        }
    }

    function makeTokenPropertiesElement(): ReactElement {
        let [payload, error] = utils.GetPayloadFromToken(state.theToken)
        if (error.length > 0) {
            return (<></>)
        }
        return (<>
            <div className='tokenDiv'>
                <div className='overlay' >
                    Properties of token above.
                </div>
                <div className='tokenCard'>
                    {tokenParagraphs}
                </div>
            </div>

            {/* <Button variant="outlined" className='myButtons' onClick={getUsageClicked} >Get current usage numbers</Button>
            <div>
                <div className='overlay' >
                    Current usage numbers.
                </div>
                <div className='tokenCard'>
                    {usageParagraphs}
                </div>
            </div> */}
        </>
        )
    }

    function getSetTokenMessage(): ReactElement {
        // console.log("getSetTokenMessage", state.theToken.length)
        if (state.theToken.length > 0) {
            return (<>
                <Button variant="outlined" className='myButtons' onClick={setTokens} >Set token on all devices below:</Button>

                <FormGroup>
                    {thingsElementList}
                </FormGroup>
            </>)

        } else { return (<></>) }
    }
    return (
        <span>
            <Dialog
                open={state.isPasteOwnedToken}
                onClose={handleDialogClose}
            >
                <PasteOwnedTokenDialog token={state.theToken} />
            </Dialog>

            {getTokMessage()}
            {makeTokenPropertiesElement()}
            {getSetTokenMessage()}

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
