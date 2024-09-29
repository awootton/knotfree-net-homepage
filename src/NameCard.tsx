
import React, { FC, ReactElement, useEffect } from 'react'

import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';


import { Tooltip } from 'react-tooltip'

import './NameCard.css'

import * as utils from './utils'

import * as types from './Types';
import * as app from './App'

import * as allMgr from './store/allThingsConfigMgr'
import { Button } from '@mui/material';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import ConfirmDialog from './dialogs/ConfirmDialog'
import MyInputDialog from './dialogs/MyInputDialog'
import MyDualInputDialog from './dialogs/MyDualInputDialog'

import { EnsureKnotFreePublicKey } from './store/ensureKnotFreePublicKey'


export interface Props {

    names: types.WatchedTopic[],

    index: number,
    //  version: number,
    key: number,

    refresh: () => void
}

type State = {

    uniqueid: string
    open: boolean
    optMap: Map<string, Map<string, string>>
    dirty: boolean
}

type KeyPair = {
    key: string
    subkey: string
}

export const NameCard: FC<Props> = (props: Props): ReactElement => {

    const index = props.index
    const names = props.names
    const topic = names[index]

    let defaultOptMap = new Map<string, Map<string, string>>
    // init the map from the topic
    if (topic.opt) {
        for (const [k, v] of Object.entries(topic.opt)) {
            // console.log("key val", k, v);
            let valmap = types.StringToMap(v)
            defaultOptMap.set(k, valmap)
        }
    }

    const defaultState: State = {
        uniqueid: utils.randomString(24),
        open: false,
        optMap: defaultOptMap,
        dirty: false
    }

    const [state, setState] = React.useState(defaultState);

    const [isDeleteConfirm, setDeleteConfirm] = React.useState(false);

    const [addTypeDialog, setAddTypeDialog] = React.useState(false);

    const [errorMessage, setErrorMessage] = React.useState('');

    const [addKvDialog, setAddKvDialog] = React.useState<KeyPair>({ key: '', subkey: '' })

    const [deleteKeyPairDialog, setDeleteKeyPairDialog] = React.useState<KeyPair>({ key: '', subkey: '' })

    let aName = names[index].namestr
    let nameType = 'plain'
    let nameParts = aName.split('_')
    if (nameParts.length > 1) {
        aName = nameParts[0]
        nameType = "." + nameParts[1]
    }
    const key = names[index].namestr


    // are we fetching in here?
    // yes, we'll need to use the change name api
    useEffect(() => {

        return function cleanup() {
            // helpCache.unsubscribe(config.longName, state.uniqueid);
        };
    })

    function returnRow2(): JSX.Element {
        return (
            <>
                <span className='cmdSpan'>
                    <div className='overlay' >
                        Command:
                    </div>
                </span>

                <span className='resultSpan'>
                    <div className='overlay' >
                        Result:
                    </div>
                </span>
            </>
        )
    }

    function getName() {
        return types.getExternalName(aName, nameType)
    }

    function open() {
        console.log("Open clicked")

        let newState = {
            ...state,
            open: true
        }
        setState(newState)
    }
    function close() {
        console.log("close clicked")

        let newState = {
            ...state,
            open: false
        }
        setState(newState)
    }
    function makeOpenButton(): ReactElement {
        if (state.open) {
            return (
                <span className='centered'>
                    <Button onClick={close} className='centered'>
                        <KeyboardArrowUpIcon className="smallerIcon" />
                    </Button>
                </span>
            )
        } // else
        return (
            <span className='centered'>
                <Button onClick={open} className='centered' >
                    <KeyboardArrowDownIcon className="smallerIcon" />
                </Button>
            </span>
        )
    }

    // TODO: this block of code is repeated in several places. Make a function. in utils?
    function saveChanges() {
        console.log("saveChanges clicked")
        // Add save logic here
        // this is really just save options, not the name itself or anything else
        // setstate state.dirty = false at then end
        // the command is "replace options"
        let aMap = new Map<string, string>()
        for (const [k, valmap] of state.optMap) {
            let val = types.MapToString(valmap)
            aMap.set(k, val)
        }
        // make aMap into json
        let jsonStr = JSON.stringify(Object.fromEntries(aMap)) // this stinks. 
        console.log('saveChanges jsonStr', jsonStr)
        // let's do it
        let c = allMgr.GetGlobalConfig()

        const json64 = utils.toBase64Url(Buffer.from(jsonStr))

        const theInternalName = types.getInternalName(aName, nameType)

        // we have to make a request and sign it with the knotfree public key
        // and our private key
        let command = "replace options " + json64
        const now = Math.floor(new Date().getTime() / 1000)
        let payload = command + "#" + now

        let nonce = utils.randomString(24)

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
            console.log("replace options BoxItItUp failed", e)
            setDeleteConfirm(false)
        }
        let url = app.prefix + app.serverName + "api1/nameService?"
        url += "&cmd=" + command
        url += "&nonce=" + nonce
        url += "&pubk=" + ownerPubk
        url += "&name=" + theInternalName
        url += "&sealed=" + utils.toBase64Url(enc)

        console.log('replace options url', url)

        fetch(url, { method: "GET" })
            .then(response => response.text())
            .then(data => {
                console.log('callDeleteApi returned:' + data)

                let newState = {
                    ...state,
                    dirty: false
                }
                setState(newState)
            })
            .catch(error => {
                console.log('save options error:' + error)
                setErrorMessage('save options error:' + error)
            })
    }


    // Open a dialog to confirm the delete.
    function deleteNameClicked() {
        console.log("deleteName clicked")

        setDeleteConfirm(true)

    }
    function addType() {
        console.log("addType clicked")
        // show a dialog of types to pick
        // props.refresh()
        setAddTypeDialog(true)
    }

    function GetExpiresDate(): ReactElement {
        if (topic.exp) {
            let expDate = new Date(topic.exp * 1000).toISOString()
            return (
                <span>Expires: {expDate} &nbsp; &nbsp;</span>
            )
        } else {
            return <></>
        }
    }

    // function deleteRow( key: string, subKey: string) {
    //     console.log("deleteRow clicked",key, subKey)

    //     // confirm dialog?

    // }



    function getRow(key: string, subKey: string, value: string): ReactElement {

        function localDeleteRow() {
            console.log("localDeleteRow clicked")
            setDeleteKeyPairDialog({ key, subkey: subKey })
        }
        function localEditRow() {
            console.log("localDeleteRow clicked")
            setAddKvDialog({ key:key, subkey: subKey })
        }

        return (
            <TableRow
                key={key + subKey}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
                <TableCell component="th" scope="row">
                    {subKey}
                </TableCell>
                <TableCell align="right">{value}</TableCell>
                <TableCell align="right">
                    <Button onClick={localDeleteRow} data-tooltip-id="delete-row-tooltip" data-tooltip-content="Delete this row." >
                        <DeleteIcon className="smallIcon" />
                    </Button>
                    <Tooltip id="delete-row-tooltip" />
                    <Button onClick={localEditRow} data-tooltip-id="edit-row-tooltip" data-tooltip-content="Edit this row." >
                        <EditIcon className="smallIcon" />
                    </Button>
                    <Tooltip id="edit-row-tooltip" />
                </TableCell>
            </TableRow>
        )
    }

    function makeBasicTable(key: string, valMap: Map<string, string>): ReactElement {

        let rows = []
        for (let [subkey, val] of valMap) {
            let r = getRow(key, subkey, val)
            rows.push(r)
        }
        function addRowClicked() {
            console.log("addRow clicked", key)
            setAddKvDialog({ key, subkey: '' })
        }
        return (
            <>
                <div className='plain-segment'>
                    {key}

                    <Button onClick={addRowClicked} className="rightJustifyButton"
                        data-tooltip-id="add-row-tooltip"
                        data-tooltip-content="Add a new row to this type."
                    >
                        Add
                    </Button>
                    <Tooltip id="add-row-tooltip" />
                </div>
                <div className='segment'>
                    <TableContainer component={Paper}>
                        <Table sx={{ minWidth: 650 }} aria-label="simple table">
                            <TableBody key={key}>
                                {rows}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </div>
            </>)
    }

    function makeOptions(): ReactElement {

        let lines = []

        for (const [k, valmap] of state.optMap) {
            // console.log("key valmap", k, valmap);
            lines.push(
                <div key={k}>
                    {makeBasicTable(k, valmap)}
                </div>
            )
        }
        return (
            <div>
                {lines}
            </div>
        )
    }
    function makeDetails(): ReactElement {
        if (state.open) {
            return (
                <div >
                    <span>
                        <Button onClick={saveChanges} disabled={!state.dirty}
                            data-tooltip-id="save-changes-tooltip"
                            data-tooltip-content="Save changes made to this name.">
                            Save Changes
                        </Button>
                        <Tooltip id="save-changes-tooltip" />

                        <Button onClick={deleteNameClicked}
                            data-tooltip-id="delete-name-tooltip"
                            data-tooltip-content="Delete this name and stop owning it.">
                            Delete
                        </Button>
                        <Tooltip id="delete-name-tooltip" />
                        <Button onClick={addType}
                            data-tooltip-id="add-type-tooltip"
                            data-tooltip-content="Add a 'type' like A or CNAME. (see help)">
                            Add Type
                        </Button>
                        <Tooltip id="add-type-tooltip" />
                    </span>


                    {makeOptions()}
                    {/* <div>
                        <span>
                            {GetExpiresDate()}
                            billing key: {aName.jwtid}
                        </span>
                        <div>
                            owner: {aName.own}
                        </div>
                    </div> */}

                </div>

            )
        }
        return <></>
    }

    return (
        // <Card variant="outlined" className='nameCard' key={index}>
        <div className='nameCard' key={index} >

            {/* <div className='offline' >{offline}</div>
            <div className='expires' >{expires}</div> */}

            <div className='cardRow1' >

                {getName()}

            </div>

            {makeDetails()}

            {makeOpenButton()}


            <ConfirmDialog
                open={isDeleteConfirm}
                onClose={() => setDeleteConfirm(false)}
                onConfirm={doDelete}
                title={"Delete this name? " + getName()}
                body='If you confirm then this name will no longer be owned by you and will be available for anyone to claim.'
            />

            <MyInputDialog
                open={addTypeDialog}
                onClose={() => { setAddTypeDialog(false) }} //
                onConfirm={addAType}
                title="Add a new type"
                body='Type in a new type, like A or AAAA or CNAME or TXT ...'
                label='add  here'
                default=''
            />

            <ConfirmDialog
                open={errorMessage !== ''}
                onClose={() => setErrorMessage('')}
                onConfirm={() => {
                    setErrorMessage('')
                }
                }
                title={"Had an error"}
                body={errorMessage}
            />

            {/* if the key is set then this is just the add row dialog for that key. If the subkey is also set then it's 'edit' */}
            <MyDualInputDialog
                open={addKvDialog.key !== ''}
                onClose={() => { setAddKvDialog({ key: '', subkey: '' }) }} 
                onConfirm={addKvPair}
                title="Add a pair to a type"
                body='Typical pairs would be "@" and "216.128.128.195" for a default IP address of a domain name. '
                label='add key here'
                label2='add value here'
                default={addKvDialog.subkey!==''?addKvDialog.subkey:''}
                default2={addKvDialog.subkey!==''?''+state.optMap.get(addKvDialog.key)?.get(addKvDialog.subkey):''}
            />

            <ConfirmDialog
                open={deleteKeyPairDialog.key !== ''}
                onClose={() => setDeleteKeyPairDialog({ key: '', subkey: '' })}
                onConfirm={() => {
                    console.log('deleteKeyPair', deleteKeyPairDialog)
                    let currentMap = state.optMap
                    let rowMap = currentMap.get(deleteKeyPairDialog.key)
                    if (rowMap !== undefined) {
                        rowMap.delete(deleteKeyPairDialog.subkey)
                    }
                    let newState = {
                        ...state,
                        dirty: true,
                        optMap: currentMap
                    }
                    setState(newState)
                    setDeleteKeyPairDialog({ key: '', subkey: '' })
                }
                }
                title={"Delete this?"}
                body={"Confirm you want to delete the '" + deleteKeyPairDialog.subkey + "' row in '" + deleteKeyPairDialog.key + "'."}
            />



        </div>
    )

    function addKvPair(key: string, val: string) {
        // adding a kv value to a type
        if (key === '') {
            key = '@'
        }
        console.log('addKv', key, val)
        if (val === '') {
            setAddKvDialog({key: '', subkey: ''})
            return
        }

        let currentMap = state.optMap
        let rowMap = currentMap.get(addKvDialog.key)
        if (rowMap === undefined) {
            console.log('addKvPair rowMap is undefined')
        } else {
            rowMap.set(key, val)
        }

        let newState = {
            ...state,
            dirty: true,
            optMap: currentMap
        }
        setState(newState)
        setAddKvDialog({ key: '', subkey: '' })

    }

    function addAType(str: string) {
        console.log('addAType', str)

        // add to the map
        let currentMap = state.optMap
        currentMap.set(str.toUpperCase(), new Map<string, string>())

        let newState = {
            ...state,
            dirty: true,
            optMap: currentMap
        }
        setState(newState)
        setAddTypeDialog(false)
    }

    function callDeleteApi() {

        let c = allMgr.GetGlobalConfig()

        const theInternalName = types.getInternalName(aName, nameType)

        // we have to make a request and sign it with the knotfree public key
        // and our private key
        let command = "delete " + theInternalName
        const now = Math.floor(new Date().getTime() / 1000)
        let payload = command + "#" + now

        let nonce = utils.randomString(24)
        console.log('callDeleteApi new nonce', nonce)

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
            console.log("delete BoxItItUp failed", e)
            setDeleteConfirm(false)
        }
        let url = app.prefix + app.serverName + "api1/nameService?"
        url += "&cmd=" + command
        url += "&nonce=" + nonce
        url += "&pubk=" + ownerPubk
        url += "&name=" + theInternalName
        url += "&sealed=" + utils.toBase64Url(enc)

        console.log('callDeleteApi url', url)

        fetch(url, { method: "GET" })
            .then(response => response.text())
            .then(data => {
                console.log('callDeleteApi returned:' + data)
                setDeleteConfirm(false)
                props.refresh()
            })
            .catch(error => {
                console.log('callDeleteApi error:' + error)
                console.error(error)
                setDeleteConfirm(false)
                props.refresh()
            });
    }

    function doDelete() {
        console.log("doDelete function called for " + getName())
        // props.deleteName(index)

        EnsureKnotFreePublicKey((err: string) => {
            if (err !== "") {
                console.log("doDelete error: " + err)
                setDeleteConfirm(false)
                setErrorMessage(err)
                return
            }
            // else 
            callDeleteApi()
        })
    }
}

export default NameCard

// Copyright 2021-2023 Alan Tracey Wootton
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
