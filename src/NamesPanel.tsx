import React, { FC, ReactElement, useEffect } from 'react'

import useFetch from "react-fetch-hook";


import * as types from './Types'
import * as saved from './SavedStuff'

import * as utils from './utils'

import { NameCard } from './NameCard'

import * as name from './NameCard';

import TextField from '@mui/material/TextField';

import './NamesPanel.css'
import * as allMgr from './store/allThingsConfigMgr'

import * as namesListCache from './store/namesListCache'

// import * as namesStatusCache from './store/nameStatusCache'

import { Button } from '@mui/material';
import { EnsureKnotFreePublicKey } from './store/ensureKnotFreePublicKey'
import ConfirmDialog from './dialogs/ConfirmDialog'
import * as app from './App'
import { Tooltip } from 'react-tooltip'


type State = {
    names: types.WatchedTopic[],
    // namesOrdered: boolean
    refreshCount: number,
    uniqueid: string

    theTokenPayload: types.KnotFreeTokenPayload,

    aName: string,
    status: types.NameStatusType // of name being typed in
    // statusOrdered: boolean
    nameType: string
}

export interface Props {
}



export const NamesPanel: FC<Props> = (props: Props): ReactElement => {

    const defaultState: State = {
        names: [],
        refreshCount: 0,
        // namesOrdered: false,
        uniqueid: utils.randomString(24),
        theTokenPayload: types.EmptyKnotFreeTokenPayload,
        aName: '',
        status: {
            Exists: false,
            Online: false
        },
        // statusOrdered: false,
        nameType: 'plain'
    }

    var foundtoken = saved.getToken()
    if (foundtoken === undefined) {
        console.log('NamesPanel no token')
    } else {
        let [payload, error] = utils.GetPayloadFromToken(foundtoken)
        if (error !== '') {
            console.log('NamesPanel error', error)
        } else {
            defaultState.theTokenPayload = payload
        }
    }

    const [namesOrdered, setNamesOrdered] = React.useState(false)
    // const [statusOrdered, setStatusOrdered] = React.useState(false)

    const [state, setState] = React.useState(defaultState);

    const [isSaveConfirm, setSaveConfirm] = React.useState(false);

    const [errorMessage, setErrorMessage] = React.useState('');

    // function gotStatusCallback(status: types.NameStatusType, err: string) {

    //     console.log('NamesPanel got status', status, err)
    //     if (err !== '') {
    //         // try again in 5 seconds until we get one 
    //         const newState = {
    //             ...state,
    //             // refreshCount: state.refreshCount + 1,
    //             names: [],
    //         }
    //         setTimeout(() => { setState(newState) }, 5000)
    //     }
    //     const newState = {
    //         ...state,
    //         status: status,
    //     }
    //     setState(newState)
    // }

    // useEffect(() => {

    //     console.log('statusOrdered useEffect')
    //     const iname = types.getInternalName(state.aName, state.nameType)

    //     // if (state.aName.length > 7 && !statusOrdered) {
    //     //     console.log('NamesPanel get status', types.getInternalName(state.aName, state.nameType))
    //     //     namesStatusCache.subscribe(iname, state.uniqueid, gotStatusCallback)
    //     //     setStatusOrdered(true)
    //     // } else {
    //     //     namesStatusCache.replaceCallback(iname, state.uniqueid, gotStatusCallback)
    //     // }

    //     return () => {
    //         console.log('statusOrdered unsubscribe')
    //         // it's unsubscribe before the answer gets back! 
    //         // I don't get it 
    //         // namesStatusCache.unsubscribe(types.getInternalName(state.aName, state.nameType), state.uniqueid)
    //     }
    // }, [statusOrdered, state])

    useEffect(() => {

        // TODO: move this to it's own comkpoenent like with the status

        let ownerPubk = allMgr.GetGlobalConfig().usersPublicKey
        let ownerPubkGood = ownerPubk !== '' && ownerPubk !== 'error'

        if (ownerPubkGood && !namesOrdered) {

            console.log('NamesPanel ownerPubk ordering names', ownerPubk)

            namesListCache.subscribe(ownerPubk, state.uniqueid, (names: types.WatchedTopic[], err: string) => {

                if (err !== '') {
                    // try again in 5 seconds until we get one 
                    const newState = {
                        ...state,
                        refreshCount: state.refreshCount + 1,
                        names: [],
                    }
                    setTimeout(() => {
                        setErrorMessage("timer ordering new name list ")
                        setState(newState)
                        setNamesOrdered(false)
                    }, 15000)
                    setErrorMessage("Retrying get of name list in 15 sec. " + err)
                } else {

                    const newState = {
                        ...state,
                        // refreshCount: state.refreshCount + 1,
                        names: names,
                    }
                    setState(newState)
                    setErrorMessage("")
                }
            })
            setNamesOrdered(true)
        }

        return () => {
            // this seems broken namesListCache.unsubscribe(ownerPubk, state.uniqueid)
        }
    }, [namesOrdered, state])


    function nameChanged(e: React.ChangeEvent<HTMLInputElement>) {
        let str = e.currentTarget.value
        str = str.toLowerCase()
        str = str.replace(/[^a-z0-9-_]/g, '')
        e.currentTarget.value = str

        console.log('name is now ', str)

        if (str !== state.aName) {
            // setStatusOrdered(false)
            let newState = {
                ...state,
                aName: str,
            }
            setState(newState)
        }
    }

    function doReloadAll() {
        setNamesOrdered(false)
        const newState = {
            ...state,
            refreshCount: state.refreshCount + 1,
            names: [],
        }
        setState(newState)
    }


    function radioChanged(e: React.ChangeEvent<HTMLInputElement>) {
        // setStatusOrdered(false)
        const newState = {
            ...state,
            nameType: e.target.value,
        }
        setState(newState)
    }

    function makeRadioButtons(): ReactElement {

        let componentArray = []

        for (let i = 0; i < types.nameTypes.length; i++) {
            const nameType = types.nameTypes[i]
            componentArray.push(
                <label key={i}>
                    <input type="radio" name="nameType" value={nameType} onChange={radioChanged} checked={nameType === state.nameType} />
                    {nameType}
                </label>
            )
        }

        return (
            <span className='radio'>
                {componentArray}
            </span>
        )
    }

    function getNameCards(): ReactElement {

        let componentArray = []

        let names = state.names

        for (let i = 0; i < names.length; i++) {

            const someprops: name.Props = {
                names: names,
                index: i,
                key: i,
                //    version: state.refreshCount,
                refresh: doReloadAll
            }

            let somejsx = (
                <NameCard {...someprops} />
            )
            componentArray.push(somejsx)
        }
        return (
            <>
                {componentArray}
            </>
        )
    }

    let token = saved.getToken()

    // function getNameOnline(): ReactElement {
    //     if (state.status.Exists) {
    //         return (
    //             <>
    //                 {state.status.Online ? ' and is online.' : ' and is offline.'}
    //             </>
    //         )
    //     } else {
    //         return (
    //             <>.</>
    //         )
    //     }
    // }

    function getNameStatus(): ReactElement {
        if (state.aName === '') {
            return <></>
        }
        if (state.aName.length < 8) {
            return <>Too short</>
        }
        return (
            <>
                <NameStatus aName={state.aName} nameType={state.nameType} refreshCount={state.refreshCount} />
            </>
        )
        // return (
        //     <>
        //         <p>
        //             "{types.getExternalName(state.aName, state.nameType)}"
        //             {state.status.Exists ? ' exists, is not available' : ' is available'}

        //             {getNameOnline()}
        //         </p>
        //     </>
        // )
    }

    function doSave() {
        setSaveConfirm(true)
    }

    function isDisabled(): boolean {
        // if there is no token then also disable. TODO: fix this
        if (state.aName.length > 7 && !state.status.Exists) {
            return false
        } else {
            return true
        }
    }

    function dummy() {
        console.log('dummy')
    }

    return (
        <>
            <div className='segment'>
                <span className='commandInputSpan'>
                    <p>Type proposed name here</p>

                    {makeRadioButtons()}

                    <TextField
                        autoFocus
                        onChange={nameChanged}
                        onBlur={dummy}
                        // id="outlined-helperText"
                        label={"Internet name:"}
                        defaultValue={''}
                        helperText=""
                        fullWidth
                    // disabled={disabled}
                    />
                    {getNameStatus()}
                </span>
                <button type="button" onClick={doSave} className='cmdButton' disabled={isDisabled()}  >
                    Save
                </button>
            </div>

            <div className='segment'>
                <div>
                    {/* owner pubk {allMgr.GetGlobalConfig().usersPublicKey} */}
                    These are your names. {state.names.length} of {state.theTokenPayload.su} possible.
                    <br />
                    {getNameCards()}
                    <br />
                </div>
            </div>

            <Button type="button" onClick={doReloadAll} className='cmdButtonNarrow'
                data-tooltip-id="reload-tooltip"
                data-tooltip-content="Reload the list. Discard changes."   >
                Reload
            </Button>
            <Tooltip id="reload-tooltip" place="right" />

            <ConfirmDialog
                open={isSaveConfirm}
                onClose={() => setSaveConfirm(false)}
                onConfirm={doAddName}
                title={"Save this name? " + types.getExternalName(state.aName, state.nameType)}
                body='Confirm to own this name.'
            />

            <ConfirmDialog
                open={errorMessage !== ''}
                onClose={() => setErrorMessage('')}
                onConfirm={() => {
                    setErrorMessage('')
                    setNamesOrdered(false) // stop loading.
                }
                }
                title={"Had an error"}
                body={errorMessage}
            />
        </>
    )

    function callAddNameApi() {

        let c = allMgr.GetGlobalConfig()

        const aName = types.getInternalName(state.aName, state.nameType)

        // we have to make a request and sign it with the knotfree public key
        // and our private key
        let command = "reserve " + aName + " " + token
        const now = Math.floor(new Date().getTime() / 1000)
        let payload = command + "#" + now

        let nonce = utils.randomString(24)
        console.log('reserve new nonce', nonce)

        const ownerPubk = c.usersPublicKey
        const message = payload
        const bmessage = Buffer.from(message)
        const theirPubk = utils.fromBase64Url(types.knotfreeApiPublicKey)
        const ourAdminPrivk = utils.fromBase64Url(c.usersPrivateKey)
        const nbuffer = Buffer.from(nonce)
        var enc = Buffer.from("BoxItItUp failed")
        try {
            enc = utils.BoxItItUp(bmessage, nbuffer, theirPubk, ourAdminPrivk)
        } catch (e) {
            console.log("BoxItItUp failed", e)
            setErrorMessage("had BoxItItUp failed" + e)
            setSaveConfirm(false)
        }
        let url = app.prefix + app.serverName + "api1/nameService?"
        url += "&cmd=" + command
        url += "&nonce=" + nonce
        url += "&pubk=" + ownerPubk
        url += "&name=" + aName
        url += "&sealed=" + utils.toBase64Url(enc)

        console.log('callAddNameApi url', url)

        fetch(url, { method: "GET" })
            .then(response => response.text())
            .then(data => {
                console.log('callAddNameApi returned:' + data)
                setSaveConfirm(false)
                if (data !== 'ok') {
                    setErrorMessage(data)
                } else {
                    doReloadAll()
                }
            })
            .catch(error => {
                console.log('callAddNameApi error:' + error)
                console.error(error)
                setSaveConfirm(false)
                setErrorMessage("" + error)
            });
    }

    function doAddName() {
        console.log("doAddName function called for " + types.getExternalName(state.aName, state.nameType))
        // props.deleteName(index)

        EnsureKnotFreePublicKey((err: string) => {

            if (err !== "") {
                console.log("doDelete error: " + err)
                setSaveConfirm(false)
                setErrorMessage(err)
                return
            }
            callAddNameApi()

        })
    }
}

export interface NameStatusProps {
    aName: string,
    nameType: string,
    refreshCount: number // force a refresh?
}
export interface NameStatusState {
    status: types.NameStatusType
}
export const NameStatus: FC<NameStatusProps> = (props: NameStatusProps): ReactElement => {

    const name = types.getInternalName(props.aName, props.nameType)
    const url = app.prefix + app.serverName + "api1/getNameStatus?name=" + name + "&refresh=" + props.refreshCount

    console.log('NameStatus url', url)

    const { data: statusResult, isLoading, error } = useFetch(url);

    console.log('NameStatus statusResult', statusResult)

    let status: types.NameStatusType

    function getNameOnline(): ReactElement {
        if (status.Exists) {
            return (
                <>
                    {status.Online ? ' and is online.' : ' and is offline.'}
                </>
            )
        } else {
            return (
                <>.</>
            )
        }
    }

    if (isLoading) {
        return (
            <>
                <p>loading...</p>
            </>
        )
    }
    if (error !== undefined) {
        const str = '' + error
        return (
            <>
                <p>error {str}</p>
            </>
        )
    }
    status = statusResult as types.NameStatusType
    console.log('NameStatus status', status)
    return (
        <>
            <p>
                "{types.getExternalName(props.aName, props.nameType)}"
                {status.Exists ? ' exists, is not available' : ' is available'}
                {getNameOnline()}

            </p>
        </>
    )
}



// Copyright 2024 Alan Tracey Wootton
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
