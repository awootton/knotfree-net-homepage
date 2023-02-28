
import React, { FC, ReactElement, useEffect } from 'react'

// material ui
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    IconButton,
} from '@mui/material';

import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';

import { Close } from '@mui/icons-material/';

import TextField from '@mui/material/TextField';

import * as saved from '../SavedStuff';
import * as pipeline from '../Pipeline';
import * as app from '../App';
import * as utilsTsx from '../Utils-tsx';
import * as utils from '../utils';
import * as types from '../Types';
import * as helpCache from '../store/helpCache'
import * as adminhintCache from '../store/adminhintCache'

import * as configMgr from '../store/thingConfigMgr'
import * as allMgr from '../store/allThingsConfigMgr'


import '../ThingCard.css'

type Props = {
    open: boolean
    onClose: () => any
    title: string
    config: saved.ThingConfig
    onConfirm: () => any
    index: number // index of the thing in the list
}

type State = {
    //  config: saved.ThingConfig
    pendingCommandNonc: string,// a correlation id for an mqtt publish. fixme
    returnValue: string,
    uniqueid: string
}


export const ThingDetailsDialog: FC<Props> = (props: Props): ReactElement => {


    // nobody calls setConfig but the cb in useEffect. RULz
    const [config, setConfig] = React.useState(props.config)

    // const [startedPubkFetch, setStartedPubkFetch] = React.useState(false)

    // this for the left side command select
    const [selectUp, setSelectUp] = React.useState(null);

    let rparts: string[] = []
    const [commands, setCommands] = React.useState(rparts);

    const [help, setHelp] = React.useState('')
    const [adminhint, setAdminhint] = React.useState('')

    const defaultState: State = {
        pendingCommandNonc: '',
        returnValue: '-none-',
        //  pendingHelpNonc: '',
        uniqueid: utils.randomString(24),
    }
    const [state, setState] = React.useState(defaultState); // rename this and consolodate with ThingCard

    let emptyArgs: string[] = []
    const [args, setArgs] = React.useState(emptyArgs);


    function fetchPubk() {

        const receivePubk = (reply: types.PublishReply) => {
            var message: string = reply.message.toString()
            message = message.trim()
            const newConfig = {
                ...config,
                thingPublicKey: message
            }
            configMgr.publish(props.index,newConfig)
        }

        if (config.longName === '') {
            return
        }

        let request: types.PublishArgs = {
            ...types.EmptyPublishArgs,
            ...config,
            cb: receivePubk,
            serverName: app.serverName,
            commandString: 'get pubk'
        }
        pipeline.Publish(request)
    }

    function fetchShortName() {

        const receiveShortName = (reply: types.PublishReply) => {

            var message: string = reply.message.toString()
            message = message.trim()
            configMgr.publish(props.index,
                {
                    ...config,
                    shortName: message
                })
        }

        if (config.longName === '') {
            return
        }

        let request: types.PublishArgs = {
            ...types.EmptyPublishArgs,
            ...config,
            cb: receiveShortName,
            serverName: app.serverName,
            commandString: 'get short name'
        }
        pipeline.Publish(request)
    }

    const gotReturnValue = (reply: types.PublishReply) => {

        // let options: types.LooseObject = arg

        var message: string = reply.message

        //console.log("ThingCard got message", message)
        // registry.RemoveSubscripton(name)
        const newState: State = {
            ...state,
            returnValue: message,
            pendingCommandNonc: ''
        }
        setState(newState)
    }

    // const gotHelpValue = (reply: types.PublishReply) => {

    //     // let options: types.LooseObject = arg

    //     var message: string = reply.message
    //     message = message.trim()

    //     console.log("ThingCard got gotHelpValue", message)
    //     // registry.RemoveSubscripton(name)
    //     const newState: State = {
    //         ...state,
    //         pendingHelpNonc: ''
    //     }
    //     setState(newState)
    //     let rparts = message.split('\n')
    //     setCommands(rparts);
    // }


    useEffect(() => {

        let longNameIsGood = true
        // if we can't get the admin hint we can't get anything else
        if (config.longName === '' || adminhint === '') {
            longNameIsGood = false
        }

        if (longNameIsGood &&
            (config.thingPublicKey === '' || config.thingPublicKey.toLowerCase().includes('error'))) {
            fetchPubk()
        }
        if ( longNameIsGood &&
            (config.shortName === '' || config.shortName.toLowerCase().includes('error'))) {
            fetchShortName()
        }
        if (state.pendingCommandNonc !== '' && config.longName !== '') {
           
            console.log("thing details card sending ", config.commandString)

            let request: types.PublishArgs = {
                ...types.EmptyPublishArgs,
                ...config,
                cb: gotReturnValue,
                serverName: app.serverName,
                commandString: config.commandString,
                args: args,
            }
            pipeline.Publish(request)
        }

        if (help === '' && config.longName !== '') {
            helpCache.getHelp(config.longName, state.uniqueid, (h: string) => {
                let rparts = h.split('\n')
                setCommands(rparts);
                setHelp(h);
            })
        }

        if (adminhint === '' && config.longName !== '') {
            adminhintCache.getAdminhint(config.longName, state.uniqueid, (h: string) => {
                // it would be nice to tell all the other things to update their adminhint
                
                if (h === '') {
                    // try again in 5 seconds until we get one 
                    setTimeout(() => { setAdminhint(h) }, 5000)
                    return
                }
                setAdminhint(h);
            })
        }

        configMgr.subscribe(props.index, state.uniqueid, (newConfig: saved.ThingConfig) => {
            setConfig(newConfig)
        })

        return function cleanup() {
            helpCache.remove(config.longName, state.uniqueid);
            adminhintCache.remove(config.longName, state.uniqueid);
            configMgr.unsubscribe(props.index, state.uniqueid)
        };
    })


    function adminPass(): ReactElement {

        return (
            <>
                <TextField
                    onChange={changeAdminPass}
                    // id="outlined-helperText"
                    label={"Admin password"}
                    defaultValue={config.adminPublicKey.length > 0 ? "********" : ""}
                    helperText=""
                    fullWidth
                />
            </>
        )
    }

    function changeLongName(e: React.ChangeEvent<HTMLInputElement>) {
    }

    // changeThingName changes the longName and when that happens everything else changes. setLongName
    function changeThingName(e: any) { // on the blur/unfocus
        const str: string = e.target.value
        console.log("new Thing name", str)
        let newName: string = str

        const newConfig: saved.ThingConfig = {
            ...saved.EmptyThingConfig,
            longName: newName,
        }

        configMgr.publish(props.index, newConfig)

        setHelp('')
        setCommands([])
    }


    function confirmMe() {
        props.onConfirm()// config)
    }

    let localAdminPass = ''

    function changeAdminPass(e: React.ChangeEvent<HTMLInputElement>) {
        const str = e.currentTarget.value
        console.log("changeAdminPass ", str)
        localAdminPass = str
    }


    function handleSetAdminPassClick() {

        // calc the admin public and private keys

        const [pub, priv] = utils.getBase64FromPassphrase(localAdminPass)

        console.log("handleSetAdminPassClick pub", pub)

        const allConfig = allMgr.GetGlobalConfig()

        // search all the things for a matching long name
        // update them all 
        for (let j = 0; j < allConfig.things.length; j++) {
            if (allConfig.things[j].longName === config.longName) {
                const newConfig = {
                    ...allConfig.things[j],
                    adminPublicKey: pub, 
                    adminPrivateKey: priv
                }

                configMgr.publish(props.index, newConfig)
            }
        }
    }

    const handleSelectClick = (event: any) => {
        console.log("handleSelectClick", event)
        setSelectUp(event.currentTarget);
    }


    var menuitems: ReactElement[] = []
    // handleSelectHelp handles a click on the help popup menu
    const handleSelectHelp = (event: any) => {

        console.log("handleSelectHelp", event)
        console.log("handleSelectHelp id", event.target.id)
        let i = +event.target.id
        let cmd = commands[i]

        let h: utilsTsx.helpLine = utilsTsx.parseCmd(cmd)
        if (h.theCommand === '') {
            return;//bad selection
        }

        const newConfig = { ...config, commandString: h.theCommand, cmdArgCount: h.argCount, cmdDescription: h.description, stars: h.stars }

        configMgr.publish(props.index,newConfig)

        // also issue the command
        setArgs([])
        if (h.argCount == 0) {

            let nonc = utils.randomString(24)
            const newState: State = {
                ...state,
                pendingCommandNonc: nonc, // also issue the command. this is a hack
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
                <MenuItem key={istr} id={istr} onClick={handleSelectHelp}>{part}</MenuItem>
            )
            menuitems.push(jsx)
        }
    }

    function doCommandAttempt() {

        let nonc = utils.randomString(24)
        // console.log("doCommandAttempt nonc", nonc)
        let newState: State = {
            ...state,
            pendingCommandNonc: nonc,
            returnValue: "-pending-"
        }
        setState(newState)
    }

    function argTextChanged(e: React.ChangeEvent<HTMLInputElement>) {
        const str = e.currentTarget.value
        let id: number = parseInt(e.currentTarget.id)
        const arrlen: number = args.length > id ? args.length : id

        let newArgs: string[] = new Array(arrlen);
        for (let i = 0; i < arrlen; i++) {
            newArgs[i] = args[i]
        }
        newArgs[id] = str
        setArgs(newArgs)
    }

    function makeArgs() {
        var args: ReactElement[] = []
        for (i = 0; i < config.cmdArgCount; i++) {
            const ele = (
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
            )
            args.push(ele)
        }
        return args
    }

    return (
        <Dialog open={props.open} maxWidth="sm" fullWidth
            onClose={props.onClose}
        >
            <DialogTitle>{props.title}</DialogTitle>
            <Box position="absolute" top={0} right={0}>
                <IconButton onClick={props.onClose}>
                    <Close />
                </IconButton>
            </Box>
            <DialogContent>

                <div className='detailsDiv'>
                    <span>
                        <TextField
                            onChange={changeLongName}
                            onBlur={changeThingName}
                            // id="outlined-helperText"
                            label={"Long name"}
                            defaultValue={config.longName.length > 0 ? config.longName : "Step One. Add long name here."}
                            helperText=""
                            fullWidth
                        />
                    </span>

                </div>
                <div className='detailsDiv'>
                    {adminPass()}
                    <span>
                        <input type="submit" value="set" onClick={handleSetAdminPassClick} />
                    </span>
                </div>
                {/* <TextField
                    onChange={changeLongName}
                    // id="outlined-helperText"
                    label={"Thing password"}
                    defaultValue={config.thingPublicKey.length > 0 ? "********" : ""}
                    helperText=""
                    fullWidth
                /> */}
                <div className='detailsDiv'>

                    <span className='resultSpan'>
                        <div className='overlay2' >
                            Thing public key:
                        </div>
                        <div className='resultDiv' >
                            {config.thingPublicKey.length > 0 ? config.thingPublicKey : "-pending-"}
                        </div>
                    </span>
                </div>
                <div className='detailsDiv'>
                    <span className='resultSpan'>
                        <div className='overlay2' >
                            Short name:
                        </div>
                        <div className='resultDiv' >
                            {config.shortName.length > 0 ? config.shortName : "-pending-"}
                        </div>
                    </span>
                </div>
                <div className='cardRow2'>

                    <button type="button" onClick={handleSelectClick} className='cmdButton' >Choose command</button>

                </div>
                <div className='spacingDiv'>&#160;</div>

                <div className='detailsDiv'>
                    <span className='cmdSpan'>
                        <div className='overlay3' >
                            Command:
                        </div>

                        <button type="button" onClick={doCommandAttempt} className='cmdButton' >{config.commandString}</button>
                        {/* <div className='bottomoverlay2' >
                            {config.cmdDescription}
                        </div> */}
                    </span>
                </div>
                <div className='spacingDiv'>&#160;</div>
                <div className='detailsDiv'>
                    <span className='cmdSpan'>
                        <div className='overlay3' >
                            Description:
                        </div>

                        <div className='resultDiv' >
                            {config.cmdDescription.trim()}
                        </div>
                    </span>
                </div>

                <div className='cardRow2'>
                    {makeArgs()}
                </div>
                <div className='detailsDiv'>&#160;</div>

                <div className='detailsDiv'>
                    <span className='resultSpan'>
                        <div className='overlay2' >
                            Result
                        </div>
                        <div className='resultDiv' >
                            {utilsTsx.LinesToParagraphs(theReturnValue)}
                        </div>
                    </span>
                </div>


            </DialogContent>
            <DialogActions>
                {/* <Button color="primary" variant="contained" onClick={props.onClose}>
                Cancel
            </Button> */}
                <Button color="secondary" variant="contained" onClick={confirmMe}>
                    Done
                </Button>
            </DialogActions>

            <Menu
                id="simple-menu"
                anchorEl={selectUp}
                keepMounted
                open={Boolean(selectUp)}
                onClose={handleSelectClose}
            >
                {menuitems}

            </Menu>

            <div className='tinyText'>
                {help.length > 0 ? 'he ' : ' '}
                {adminhint.length > 0 ? 'ah ' : ' '}
                {config.adminPublicKey.length > 0 ? ' ak' : ''}
                {config.shortName.length > 0 ? ' sn' : ''}
                {config.thingPublicKey.length > 0 ? ' pk' : ''}
            </div>

        </Dialog>
    );
};

export default ThingDetailsDialog;

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
