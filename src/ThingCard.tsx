
import React, { FC, ReactElement, useEffect } from 'react'
import Box from '@mui/material/Box';
import MenuIcon from '@mui/icons-material/Menu';

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
import * as tokenCache from './store/tokenCache'
import * as shortnameCache from './store/shortnameCache'
import * as adminhintCache from './store/adminhintCache'
import * as pubkCache from './store/pubkCache'
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

    const [tokeninfo, setTokenInfo] = React.useState(types.EmptyKnotFreeTokenPayload);

    const [adminhint, setAdminhint] = React.useState('');

    const [state, setState] = React.useState(defaultState);

    const [config, setConfig] = React.useState(props.config);

    const index = props.index


    // this is for the right menu
    const [menuUp, setMenuUp] = React.useState(null);

    // this for the left side command select
    const [pickCommand, setPickCommand] = React.useState(false);

    let rparts: string[] = []
    const [commands, setCommands] = React.useState(rparts);

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


    useEffect(() => {

        let longNameIsGood = true
        // if we can't get the admin hint we can't get anything else
        if (config.longName === '' || adminhint === '') {
            longNameIsGood = false
        }

        if ((config.thingPublicKey === '')
            && longNameIsGood) {
            console.log('ordering pubk ', index, config.longName)
            pubkCache.subscribe(config.longName, state.uniqueid, (str: string) => {

                if (str === '' || str.toLowerCase().includes('error')) {
                    // try again in 5 seconds until we get one 
                    const newConfig = {
                        ...config,
                        thingPublicKey: '',
                    }
                    setTimeout(() => { setConfig(newConfig) }, 5000)
                    return
                }
                const newConfig = {
                    ...config,
                    thingPublicKey: str,
                }
                setConfig(newConfig)
            })
        }

        if ((config.shortName === '')
            && longNameIsGood) {

            console.log('ordering short name ', index, config.longName)

            shortnameCache.subscribe(config.longName, state.uniqueid, (str: string) => {

                if (str === '' || str.includes('error')) {
                    // try again in 5 seconds until we get one 
                    const newConfig = {
                        ...config,
                        shortName: '',
                    }
                    setTimeout(() => { setConfig(newConfig) }, 5000)
                    return
                }
                const newConfig = {
                    ...config,
                    shortName: str
                }
                setConfig(newConfig)
            })
        }

        if (help === '' && longNameIsGood) {
            helpCache.subscribe(config.longName, state.uniqueid, (h: string) => {
                let rparts = h.split('\n')
                setCommands(rparts);
                setHelp(h);
            })
        }

        if (tokeninfo.jti === "" && longNameIsGood && config.thingPublicKey !== '' && config.adminPublicKey !== '') {
            tokenCache.subscribe(config.longName, state.uniqueid,config, (h: types.KnotFreeTokenPayload) => {
                // console.log('thingcard tokenCache.subscribe got token info', h)
                setTokenInfo(h);
            })
        }

        if (adminhint === '' && config.longName !== '') {

            adminhintCache.subscribe(config.longName, state.uniqueid, (h: string) => {

                if (h === '') {
                    // try again in 5 seconds until we get one 
                    setTimeout(() => { setAdminhint(h) }, 5000)
                    return
                }
                setAdminhint(h)

                utils.searchForAdminHintMatches(index, config, h)
            })
        }

        // this is for issuing a command. There must be a better way.
        if (state.pendingCommandNonc !== '' && config.longName !== '') {
            console.log("dev card sending ", config.commandString, args)

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
            const newState: State = {
                ...state,
                pendingCommandNonc: ''
            }
            setState(newState)

        }

        configMgr.subscribe(index, state.uniqueid, (newConfig: saved.ThingConfig) => {
            console.log("thing card got new config", newConfig)
            setConfig(newConfig)
        })

        return function cleanup() {
            helpCache.unsubscribe(config.longName, state.uniqueid);
            adminhintCache.unsubscribe(config.longName, state.uniqueid)
            configMgr.unsubscribe(index, state.uniqueid)
            shortnameCache.unsubscribe(config.longName, state.uniqueid)
            pubkCache.unsubscribe(config.longName, state.uniqueid)
            tokenCache.unsubscribe(config.longName, state.uniqueid)
        };
    })


    function argTextChanged(e: React.ChangeEvent<HTMLInputElement>) {
        let str = e.currentTarget.value
        let id: number = parseInt(e.currentTarget.id)
        const arrlen: number = args.length > id ? args.length : id

        let newArgs: string[] = new Array(arrlen);
        for (let i = 0; i < arrlen; i++) {
            newArgs[i] = args[i]
        }
        newArgs[id] = str
        setArgs(newArgs)
    }


    function doCommandAttempt() {

        if (config.commandString.length < 1) {
            // popup the menu
            setPickCommand(true)
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

    const handleHelpMenuPopup = (event: any) => {
        console.log("handleHelpMenuPopup", event)
        setPickCommand(true) // event.currentTarget);
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

        // also issue the command TODO: this has been failing FIXME:
        if ( false && h.argCount === 0) {

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
        setPickCommand(false);
    };

    const handleSelectClose = () => {
        setPickCommand(false);
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

    // console.log("ThingCard has expires ", tokeninfo.exp)
    const expiresDate = new Date(tokeninfo.exp * 1000)
    let expires = 'exp:' + expiresDate.getFullYear() + '-' + (expiresDate.getMonth() + 1) + '-' + expiresDate.getDate() 
    if (tokeninfo.exp <= 1) {
        expires = 'exp: unknown'
    }
    let offline = adminhint.length > 0 ? '' : 'offline'

    let defaultEditThingName = false
    if (config.longName === '') {
        defaultEditThingName = true
    }

    const [editThingName, setEditThingName] = React.useState(defaultEditThingName)

    function focusThingName() {
        console.log('focusThingName')
        setEditThingName(true)
    }

    function blurThingName(e: any) {
        console.log('focusThingName')

        const str: string = e.target.value
        if (str !== config.longName) {
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
    }

    function thingNameChanged(e: React.ChangeEvent<HTMLInputElement>) {
        let str = e.currentTarget.value
        str = str.toLowerCase()
        str = str.replace(/[^a-z0-9-]/g, '')
        e.currentTarget.value = str
    }

    function returnThingName(): JSX.Element {

        if (editThingName) {
            return (
                <span className='commandInputSpan'>
                    <TextField 
                        autoFocus
                        onChange={thingNameChanged}
                        onBlur={blurThingName}
                        // id="outlined-helperText"
                        label={"Thing name:"}
                        defaultValue={config.longName}
                        helperText=""
                        fullWidth
                    // disabled={disabled}
                    />
                </span>
            )
        } else {
            return (
                <span className='commandSpan'>
                    <div className='overlay' >
                        Thing name:
                    </div>
                    <div onClick={focusThingName} className='commandDiv' >
                        {config.longName.length > 0 ? config.longName : 'Step 1: Enter long name'}
                    </div>
                </span>
            )
        }
    }

    const [editAdminKey, setEditAdminKey] = React.useState(false)

    function focusAdminKey() {
        console.log('focusAdminKey')
        setEditAdminKey(true)
    }


    function adminKeyChanged(e: React.ChangeEvent<HTMLInputElement>) {
        let str = e.currentTarget.value
        // console.log("adminKeyChanged", str)
        if (adminhint.length > 0) {
            // calc pub and priv key
            const [pub, priv] = utils.getBase64FromPassphrase(str)

            // search for matches in OUR config
            const hints = adminhint.split(' ')
            for (let i = 0; i < hints.length; i++) {
                const hint = hints[i]
                if (hint === pub.substring(0, 8)) {
                    // match
                    console.log("match")
                    const newConfig: saved.ThingConfig = {
                        ...config,
                        adminPrivateKey: priv,
                        adminPublicKey: pub,
                    }
                    configMgr.publish(index, newConfig)
                    setEditAdminKey(false)
                }
            }
        } else {
            // what?
        }
    }

    function blurAdminKey(e: any) {
        console.log('blurAdminKey')
        setEditAdminKey(false)
    }

    function returnRow2(): JSX.Element {

        var needsEditAdminKey = false
        if (config.adminPublicKey.length < 43) {
            needsEditAdminKey = true
        }
        if (config.longName === '') {
            needsEditAdminKey = true
        }
        let needsFocus = true 
        if  (editThingName) {
            needsFocus = false
        }

        if (needsEditAdminKey) {
            return (
                <span className='commandInputSpan'>
                    <TextField
                        autoFocus = {needsFocus}
                        onChange={adminKeyChanged}
                        onBlur={blurAdminKey}
                        // id="outlined-helperText"
                        label={"Step 2. Admin password:"}
                        defaultValue={""}
                        helperText=""
                        fullWidth
                    // disabled={disabled}
                    />
                </span>
            )

        } else {
            return (
                <>
                    <span className='cmdSpan'>
                        <div className='overlay' >
                            Command:
                        </div>
                        <button type="button" onClick={doCommandAttempt} className='cmdButton' >
                            {config.commandString.length > 0 ? config.commandString : 'Step 3: Pick a command'}
                        </button>
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
                </>
            )
        }
    }

    return (
        <Card variant="outlined" className='devCard'>

            <div className='offline' >{offline}</div>
            <div className='expires' >{expires}</div>

            <div className='cardRow1' >

                {returnThingName()}

            </div>
            <div className='cardRow2'>
                {/* <span className='cmdpulldown'  ><ArrowDropDownIcon onClick={handleHelpMenuPopup} style={{ fontSize: "48px" }} /></span> */}

                {returnRow2()}

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
                <MenuItem onClick={handleHelpMenuPopup}>Pick Command</MenuItem>
                <MenuItem onClick={handleMenuDetails}>Details</MenuItem>
                <MenuItem onClick={handleMenuNew}>New</MenuItem>
                <MenuItem onClick={handleMenuDuplicate}>Duplicate</MenuItem>
                <MenuItem onClick={handleMenuDelete}>Delete</MenuItem>
                <MenuItem onClick={handleMenuUp}>Move up</MenuItem>
                <MenuItem onClick={handleMenuDown}>Move down</MenuItem>

            </Menu>

            <Menu
                id="simple-menu"
                // anchorEl={pickCommand}
                keepMounted
                open={pickCommand}
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
                {config.thingPublicKey.length > 0 ? ' pk' : ''}
                {config.shortName.length > 0 ? ' sn' : ''}
                {tokeninfo.jti.length >0 ? ' to' : ''}
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
