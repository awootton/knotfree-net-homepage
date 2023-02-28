
import React, { FC, ReactElement, useEffect } from 'react'
import Box from '@mui/material/Box';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';

import CircularProgress from '@mui/material/CircularProgress';

import './ThingCard.css'

import * as saved from './SavedStuff'
import * as utils from './utils'

import * as  utilsTsx from './Utils-tsx';

import * as types from './Types';
import * as pipeline from './Pipeline';
import * as app from './App'

import * as detailsDialog from './dialogs/ThingDetailsDialog'
import * as helpCache from './store/helpCache'
import * as adminhintCache from './store/adminhintCache'
import * as configMgr from './store/thingConfigMgr'
import * as allMgr from './store/allThingsConfigMgr'


type State = {
    pendingCommandNonc: string,// a correlation id for an mqtt publish. unused?
    returnValue: string,
    uniqueid: string
}

export interface Props {

    showPubkey: boolean
    showAdminKey: boolean
    config: saved.ThingConfig
    index: number,
    version: number,
}

export const ThingCard: FC<Props> = (props: Props): ReactElement => {

    const defaultState: State = {
        pendingCommandNonc: '',
        returnValue: '-none-',
        uniqueid: utils.randomString(24),
    }

    const [help, setHelp] = React.useState('');

    const [adminhint, setAdminhint] = React.useState('');

    const [state, setState] = React.useState(defaultState);

    const [config, setConfig] = React.useState(props.config);

    const index = props.index


    // this is for the right menu
    const [menuUp, setMenuUp] = React.useState(null);
    // this for the left side command select
    const [selectUp, setSelectUp] = React.useState(null);

    let rparts: string[] = []
    const [commands, setCommands] = React.useState(rparts);

    // need about, pubk, and admin hints
    // basura const [adminHint, setAdminHint] = React.useState('');

    let emptyArgs: string[] = []
    const [args, setArgs] = React.useState(emptyArgs);

    const [isDetails, setIsDetails] = React.useState(false);

    const gotReturnValue = (reply: types.PublishReply) => {

        var message: string = reply.message

        const newState: State = {
            ...state,
            returnValue: message,
            pendingCommandNonc: ''
        }
        setState(newState)
    }

    const receivePubkInfo = (reply: types.PublishReply) => {

        var message: string = reply.message.toString()
        message = message.trim()

        const newConfig: saved.ThingConfig = {
            ...config,
            thingPublicKey: message
        }
        configMgr.publish(index, newConfig)
    }
    const receiveShortName = (reply: types.PublishReply) => {

        var message: string = reply.message.toString()
        message = message.trim()

        if (message === config.shortName) {
            return
        }
        const newConfig: saved.ThingConfig = {
            ...config,
            shortName: message,
        }
        configMgr.publish(index, newConfig)
    }

    useEffect(() => {

        let longNameIsGood = true
        // if we can't get the admin hint we can't get anything else
        if (config.longName === '' || adminhint === '') {
            longNameIsGood = false
        }

        // todo: this is a hack.
        if ((config.thingPublicKey === '' || config.thingPublicKey.toLowerCase().includes('error'))
            && longNameIsGood) {
            // order it up
            console.log('ordering pubk ', index)
            let request: types.PublishArgs = {
                ...types.EmptyPublishArgs,
                ...config,
                cb: receivePubkInfo,
                serverName: app.serverName,
                commandString: 'get pubk',
            }
            pipeline.Publish(request)
        }

        // FIXME: this is a hack. 
        if ((config.shortName === '' || config.shortName.includes('error'))
            && longNameIsGood) {

            console.log('ordering short name ', index)

            let request: types.PublishArgs = {
                ...types.EmptyPublishArgs,
                ...config,
                cb: receiveShortName,
                serverName: app.serverName,
                commandString: 'get short name'
            }

            pipeline.Publish(request)
        }

        if (help === '' && longNameIsGood) {
            helpCache.getHelp(config.longName, state.uniqueid, (h: string) => {
                let rparts = h.split('\n')
                setCommands(rparts);
                setHelp(h);
            })
        }

        if (adminhint === '' && config.longName !== '') {

            adminhintCache.getAdminhint(config.longName, state.uniqueid, (h: string) => {

                if (h === '') {
                    // try again in 5 seconds until we get one 
                    setTimeout(() => { setAdminhint(h) }, 5000)
                    return
                }
                setAdminhint(h)
            })
        }

        if (state.pendingCommandNonc !== '' && config.longName !== '') {
            // console.log("dev card sending ", state.pendingCommandNonc)
            console.log("dev card sending ", config.commandString)

            let ourArgs: string[] = [
                ...args
            ]
            if (config.cmdArgCount === 0) {
                ourArgs = []
            } else {
                // we have to quote them 
                for (let i = 0; i < ourArgs.length; i++) {
                    ourArgs[i] = '"' + ourArgs[i] + '"'
                }
            }

            let request: types.PublishArgs = {
                ...types.EmptyPublishArgs,
                ...config,
                cb: gotReturnValue,
                serverName: app.serverName,
                args: ourArgs,
            }
            pipeline.Publish(request)
        }

        configMgr.subscribe(index, state.uniqueid, (newConfig: saved.ThingConfig) => {
            console.log("thing card got new config", newConfig)
            setConfig(newConfig)
        })

        return function cleanup() {
            helpCache.remove(config.longName, state.uniqueid);
            adminhintCache.remove(config.longName, state.uniqueid);
            configMgr.unsubscribe(index, state.uniqueid)
        };
    })

    function textClicked(e: React.ChangeEvent<HTMLInputElement>) {
        let str = e.currentTarget.value
        str = str.toLowerCase()
        e.currentTarget.value = str
    }

    function argTextChanged(e: React.ChangeEvent<HTMLInputElement>) {
        let str = e.currentTarget.value
        str = str.toLowerCase()
        let id: number = parseInt(e.currentTarget.id)
        const arrlen: number = args.length > id ? args.length : id

        let newArgs: string[] = new Array(arrlen);
        for (let i = 0; i < arrlen; i++) {
            newArgs[i] = args[i]
        }
        newArgs[id] = str
        setArgs(newArgs)
    }

    // changeThingName changes the longName and when that happens everything else changes. setLongName
    function changeThingName(e: any) { // on the blur unfocus
        const str: string = e.target.value
        console.log("new Thing name", str)
        let newName: string = str
        const newConfig: saved.ThingConfig = {
            ...saved.EmptyThingConfig,
            longName: newName,
        }
        configMgr.publish(index, newConfig)
        setHelp('')
        setCommands([])
    }

    function doCommandAttempt() {

        if (config.commandString.length < 1) {
            return
        }

        let nonc = utils.randomString(24)
        // console.log("doCommandAttempt nonc", nonc)
        let newState: State = {
            ...state,
            pendingCommandNonc: nonc,
            returnValue: "-pending-"
        }
        setState(newState)
    }

    const handleMenuClick = (event: any) => {
        console.log("handleMenuClick", event)
        setMenuUp(event.currentTarget);
    };

    const handleMenuDuplicate = (event: any) => {

        setMenuUp(null);

        const newConfig: saved.ThingConfig = {
            ...config
        }
        let c = allMgr.GetGlobalConfig()
        c.things.splice(index + 1, 0, newConfig);
        allMgr.publish(c, true)
    };

    const handleMenuNew = (event: any) => {

        setMenuUp(null);

        const newConfig: saved.ThingConfig = {
            ...saved.EmptyThingConfig
        }
        let c = allMgr.GetGlobalConfig()
        c.things.splice(index + 1, 0, newConfig);
        allMgr.publish(c, true)
    };


    const handleMenuDelete = (event: any) => {

        setMenuUp(null);

        let c = allMgr.GetGlobalConfig()
        c.things.splice(index, 1)
        allMgr.publish(c, true)

    };

    const handleMenuDetails = (event: any) => {

        setMenuUp(null)
        setIsDetails(true)
    };


    const handleMenuUp = (event: any) => {

        setMenuUp(null)

        let c = allMgr.GetGlobalConfig()
        if (index > 0) {
            let me = c.things.splice(index, 1);
            c.things.splice(index - 1, 0, me[0]);
        }
        allMgr.publish(c, true)
    };

    const handleMenuDown = (event: any) => {

        setMenuUp(null);
        let c = allMgr.GetGlobalConfig()
        if (index + 1 < c.things.length) {
            let me = c.things.splice(index, 1);
            c.things.splice(index + 1, 0, me[0]);
        }
        allMgr.publish(c, true)
    };


    const handleClose = () => {
        setMenuUp(null);
    };

    const handleSelectClick = (event: any) => {
        console.log("handleSelectClick", event)
        setSelectUp(event.currentTarget);
    };

    const handleSelectMenu = (event: any) => {
        console.log("handleSelectMenu", event)
        console.log("handleSelectMenu id", event.target.id)
        let i = +event.target.id
        let cmd = commands[i]

        let h: utilsTsx.helpLine = utilsTsx.parseCmd(cmd)
        if (h.theCommand === '') {
            return;//bad selection
        }
        const newConfig: saved.ThingConfig = {
            ...config,
            commandString: h.theCommand,
            cmdArgCount: h.argCount,
            cmdDescription: h.description,
            stars: h.stars,
        }
        configMgr.publish(index, newConfig)

        // also issue the command
        if (h.argCount == 0) {

            let nonc = utils.randomString(24)

            const newState: State = {
                ...state,
                pendingCommandNonc: nonc, // also issue the command
                returnValue: "-pending-"
            }

            setState(newState)
        } else {
            const newState: State = {
                ...state,
                returnValue: ""
            }

            setState(newState)
        }
        setSelectUp(null);
    };

    const handleSelectClose = () => {
        setSelectUp(null);
    };

    const theReturnValue = state.returnValue

    var menuitems: ReactElement[] = []
    if (commands.length === 0) {
        const jsx = (
            <Box key={0} sx={{ display: 'flex' }}>
                <CircularProgress />
            </Box>
        )
        menuitems.push(jsx)
    } else {
        for (var i = 0; i < commands.length; i++) {
            const part = commands[i]
            const istr = '' + i
            const jsx = (
                <MenuItem key={istr} id={istr} onClick={handleSelectMenu}>{part}</MenuItem>
            )
            menuitems.push(jsx)
        }
    }

    function makeArgs() {
        var args: ReactElement[] = []
        for (i = 0; i < config.cmdArgCount; i++) {
            const ele = (
                <div className='cardRow2'>
                    <span className='arg'>
                        <TextField
                            key={i}
                            id={'' + i}
                            className='cmdArg'
                            onChange={argTextChanged}
                            onBlur={() => { }} // adminKeyBlur argTextChanged Clicked
                            label='Add text here'
                            defaultValue={''}
                            helperText=""
                            disabled={false}
                        />
                    </span>
                </div>
            )
            args.push(ele)
        }
        return args
    }

    let trimmedDescription = config.cmdDescription
    if (trimmedDescription.length > 18) {
        trimmedDescription = trimmedDescription.substring(0, 18) + '...'
    }

    return (
        <Card variant="outlined" className='devCard'>
            <div className='cardRow1' >


                <span className='commandSpan'>
                    <div className='overlay' >
                        Thing name:
                    </div>
                    <div className='commandDiv' >
                        {config.longName}
                    </div>
                </span>

                {/* <span className='commandInputSpan'>
                    <TextField
                        onChange={textClicked}
                        onBlur={changeThingName}
                        // id="outlined-helperText"
                        label={"Thing name"}
                        defaultValue={config.longName}
                        helperText=""
                        fullWidth
                    // disabled={disabled}
                    />
                </span> */}



                {/* <span className='moreDevInfoWrapper'>
                    <div className='moreDevInfoSpan'>
                        {getThingInfo()}
                    </div> 
                </span> */}
                {/* {props.showPubkey ? (<span className='devKey'>{txtStandin('Thing key', 'iuFO975k...')}</span>) : null}
                {props.showAdminKey ? (<span className='adminKey'>{txtStandin('Admin key', 'oGeJoMdC...')}</span>) : null} */}
            </div>
            <div className='cardRow2'>
                {/* <span className='cmdpulldown'  ><ArrowDropDownIcon onClick={handleSelectClick} style={{ fontSize: "48px" }} /></span> */}

                <span className='cmdSpan'>
                    <div className='overlay' >
                        Command:
                    </div>
                    <button type="button" onClick={doCommandAttempt} className='cmdButton' >{config.commandString}</button>
                    <div className='bottomoverlay' >
                        {trimmedDescription}
                    </div>

                </span>

                <span className='resultSpan'>
                    <div className='overlay' >
                        Result:
                    </div>
                    <div className='resultDiv' >
                        {utilsTsx.LinesToParagraphs(theReturnValue)}
                    </div>
                </span>

            </div>

            {makeArgs()}

            <span className='menu'><MenuIcon onClick={handleMenuClick} /></span>

            <Menu
                id="simple-menu"
                anchorEl={menuUp}
                keepMounted
                open={Boolean(menuUp)}
                onClose={handleClose}
            >

                <MenuItem onClick={handleMenuDetails}>Details</MenuItem>
                <MenuItem onClick={handleSelectClick}>Pick Command</MenuItem>
                <MenuItem onClick={handleMenuNew}>New</MenuItem>
                <MenuItem onClick={handleMenuDuplicate}>Duplicate</MenuItem>
                <MenuItem onClick={handleMenuDelete}>Delete</MenuItem>
                <MenuItem onClick={handleMenuUp}>Move up</MenuItem>
                <MenuItem onClick={handleMenuDown}>Move down</MenuItem>

            </Menu>

            <Menu
                id="simple-menu"
                anchorEl={selectUp}
                keepMounted
                open={Boolean(selectUp)}
                onClose={handleSelectClose}
            >
                {menuitems}

            </Menu>

            <detailsDialog.ThingDetailsDialog

                open={isDetails}
                onClose={ThingDetailsDialogConfirm}
                onConfirm={ThingDetailsDialogConfirm}
                title={'Details for thing: ' + config.longName}
                config={config}
                index={index}
            />
            <div className='tinyText'>
                {help.length > 0 ? 'he ' : ' '}
                {adminhint.length > 0 ? 'ah ' : ' '}
                {config.adminPublicKey.length > 0 ? ' ak' : ''}
                {config.shortName.length > 0 ? ' sn' : ''}
                {config.thingPublicKey.length > 0 ? ' pk' : ''}
                {" " + props.version}
            </div>
        </Card>

    )

    // we'll just assume that the ThingDetailsDialog changed the state so refresh everything.
    function ThingDetailsDialogConfirm() {
        console.log('ThingDetailsDialogConfirm')
        setArgs([])
        setIsDetails(false)
    }
}

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
