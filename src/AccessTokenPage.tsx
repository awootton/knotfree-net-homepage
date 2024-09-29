
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
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

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
import { Tooltip } from 'react-tooltip'


type State = {

    theToken: string
    // hasToken: boolean
    //  adding: boolean
    isPasteOwnedTokenDialog: boolean

    userPublicKey: string // this is the users public key for the token
    isPasteUserPublicKey: boolean
}

var defaultState: State = {

    theToken: '',
    //   hasToken: false,
    //  adding: false,
    isPasteOwnedTokenDialog: false,
    userPublicKey: '',
    isPasteUserPublicKey: false,

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

    let c = allMgr.GetGlobalConfig()
    var foundUserPubk = c.usersPublicKey
    if (foundUserPubk !== "") {
        startstate.userPublicKey = foundUserPubk
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
        potDialogTempValue = state.theToken
        const newState: State = {
            ...state,
            isPasteOwnedTokenDialog: true
        }
        setState(newState)
    }

    var potDialogTempValue = ""
    function handleDialogClose() {
        console.log("dialog handleDialogClose")
        if (potDialogTempValue !== "") {
            const newState: State = {
                ...state,
                isPasteOwnedTokenDialog: false,
                theToken: potDialogTempValue
            }
            setState(newState)
        } else {
            const newState: State = {
                ...state,
                isPasteOwnedTokenDialog: false,
            }
            setState(newState)
        }
    }

    function addPassphrase() {
        console.log("addPassphrase")
        passphraseDialogTempValue = ""
        const newState: State = {
            ...state,
            isPasteUserPublicKey: true
        }
        setState(newState)
    }

    var passphraseDialogTempValue = ""
    function handlePassphraseClose() {
        console.log("dialog handlePassphraseClose")

        const newState: State = {
            ...state,
            isPasteUserPublicKey: false,
        }
        setState(newState)
    }

    function handlePassphraseok() {
        console.log("dialog handlePassphraseok")
        if (passphraseDialogTempValue !== "") {

            // caclulate the public key from the passphrase
            const keypair = utils.getBoxKeyPairFromPassphrase(passphraseDialogTempValue)
            const [pubk, priv] = utils.KeypairToBase64(keypair)
            console.log("pubk", pubk)
            console.log("priv", priv)
            // put it in the things config
            let config = allMgr.GetGlobalConfig()
            config.usersPublicKey = pubk
            config.usersPrivateKey = priv
            allMgr.publish(config, true)

            const newState: State = {
                ...state,
                userPublicKey: pubk,
                isPasteUserPublicKey: false,
            }
            setState(newState)
        } else {
            const newState: State = {
                ...state,
                isPasteUserPublicKey: false,
            }
            setState(newState)
        }
    }



    const getTokMessage = (): ReactElement => {
        if (state.theToken !== "") {

            return (
                <>
                    A token is used when configuring 'things' so that they can access the knotfree server.
                    A token with a users public key is needed to permanently own a name, aka 'topic':<br></br>
                    This is the current token:
                    <CopyToClipboard text={state.theToken}
                        onCopy={() => console.log("theToken copied to clipboard")}
                        data-tooltip-id="copy-token-tooltip"
                        data-tooltip-content="Copy token to clipboard."
                    >
                        {/* <Button className='myButtons' variant="outlined"  >
                                Copy to clipboard.
                            </Button> */}
                        <ContentCopyIcon className='smallerIcon' />
                    </CopyToClipboard>
                    <Tooltip id="copy-token-tooltip" />

                    <br></br>
                    <code>
                        {/* <Paper>{state.theToken}</Paper> */}
                        <pre>{state.theToken}</pre>
                    </code>

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
    // TODO: use MyInputDialog instead. This is crap.
    const PasteOwnedTokenDialog = (params: PotParams): ReactElement => {

        function tokenChanged(e: React.ChangeEvent<HTMLInputElement>) {
            console.log("ownedTokenChanged", e.currentTarget.value)
            const tok = e.currentTarget.value
            potDialogTempValue = tok
        }

        return (

            < div style={{ width: "75%", height: "75%", padding: 24 }} >
                <div style={{ width: "75%", height: "75%", padding: 12 }} >

                    <TextField
                        onChange={tokenChanged}
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

    type PassphraseParams = {
        phrase: string
        onConfirm: () => void
    }

    const EnterPassphraseDialog = (params: PassphraseParams): ReactElement => {

        function valueChanged(e: React.ChangeEvent<HTMLInputElement>) {
            console.log("passphrase changed", e.currentTarget.value)
            const tmp = e.currentTarget.value
            passphraseDialogTempValue = tmp
        }

        return (

            < div style={{ width: "75%", height: "75%", padding: 24 }} >
                <div style={{ width: "75%", height: "75%", padding: 12 }} >

                    <TextField
                        onChange={valueChanged}
                        // id="outlined-helperText"
                        label="Add passphrase here"
                        defaultValue={params.phrase}
                        helperText="Type a passphrase here. Be sure to also save it somewhere safe."
                    />
                </div>
                <Button color="secondary" variant="contained" onClick={params.onConfirm}>
                    OK
                </Button>
            </div >
        )
    }

    let checkedArray: boolean[] = []

    function getThingsElementList(): ReactElement[] {

        // console.log("getThingList")
        const list = things
        const ret: ReactElement[] = []
        for (let i = 0; i < list.length; i++) {
            const thing = list[i]
            const expDate = new Date(thing.payload.exp * 1000)
            var label = thing.config.longName + " expires: " + expDate.getFullYear() + "-" + (expDate.getMonth() + 1) + "-" + expDate.getDate()
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

    // const useageText = utils.KnotFreeTokenStatsToText(stats)
    //  = helpers.LinesToParagraphs(useageText)

    function setTokens() {
        for (let i = 0; i < thingsElementList.length; i++) {
            // const element = thingsElementList[i]
            const checked = checkedArray[i]
            //console.log("checkbox element", element, checked)
            // const index = i;
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
        // let [payload, error] = utils.GetPayloadFromToken(state.theToken)
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

    const copyPubkButton = (): ReactElement => {
        return (
            <>
                <CopyToClipboard text={state.userPublicKey}
                    onCopy={() => { }}
                    data-tooltip-id="copy-pubk-tooltip"
                    data-tooltip-content="Copy public key to clipboard."

                >
                    {/* <button>&#xE87C;</button> */}
                    <ContentCopyIcon className="smallerIcon" />

                </CopyToClipboard>
                <Tooltip id="copy-pubk-tooltip" place="bottom" />

            </>
        )
    }

    const getOwnerPass = (): ReactElement => {
        if (state.userPublicKey !== undefined && state.userPublicKey !== "") {

            return (
                <span>
                    Owner passphrase is set. {copyPubkButton()} <br></br>
                    This is your owners public key: {state.userPublicKey}<br></br>
                    <Button variant="outlined" className='myButtons' onClick={addPassphrase}
                    >Change</Button><br></br>
                </span>
            )

        } else {

            return (
                <div>
                    Recommended. Setting a user public key is needed to permanently own a name, aka 'topic', aka domain name.<br></br>
                    <Button variant="outlined" className='myButtons' onClick={addPassphrase} >Type a passphrase</Button><br></br>
                    <br></br>
                </div>
            )
        }
    }

    return (
        <span className="tokenMainDiv">
            <Dialog
                open={state.isPasteOwnedTokenDialog}
                onClose={handleDialogClose}
            >
                <PasteOwnedTokenDialog token={state.theToken} />
            </Dialog>

            <Dialog
                open={state.isPasteUserPublicKey}
                onClose={handlePassphraseClose}
            >
                <EnterPassphraseDialog phrase="" onConfirm={handlePassphraseok} />
            </Dialog>

            {getOwnerPass()}
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
