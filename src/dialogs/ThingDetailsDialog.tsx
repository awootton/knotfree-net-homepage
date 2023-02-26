
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
    Typography,
} from '@mui/material';

import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

import { Close } from '@mui/icons-material/';

import TextField from '@mui/material/TextField';

import * as saved from '../SavedStuff';
import * as pipeline from '../Pipeline';
import * as app from '../App';
import * as utilsTsx from '../Utils-tsx';
import * as utils from '../Utils';
import * as types from '../Types';
import * as helpCache from '../store/helpCache'
import * as adminhintCache from '../store/adminhintCache'
import * as registry from '../ChangeRegistry'


import '../ThingCard.css'

type Props = {
    open: boolean
    onClose: () => any
    title: string
    config: saved.ThingConfig
    onConfirm: () => any
    index: number // index of the thing in the list
    //  label: string // the label of the text field
    //  default: string // default text in the input
}

type State = {
    //  config: saved.ThingConfig
    pendingCommandNonc: string,// a correlation id for an mqtt publish
    returnValue: string,
    // pendingHelpNonc: string,
    uniqueid: string
}


export const ThingDetailsDialog: FC<Props> = (props: Props): ReactElement => {

    
    //const [config, setConfig] = React.useState(props.config)
    const [config, setConfig] = React.useState(saved.getThingsConfig().things[props.index])

    const [startedPubkFetch, setStartedPubkFetch] = React.useState(false)

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

            setConfig({ ...config, thingPublicKey: message })
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

            setConfig({ ...config, shortName: message })
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


    // function fetchAdminkey() {

    //     const receiveAdminHint = (reply: types.PublishReply) => {

    //         if (utilsTsx.searchForAdminKeys(reply.message.toString().trim(), config, props.index)) {
    //             setConfig({ ...config })
    //             return
    //         }
    //         // else someone will have to type it in.
    //     }

    //     let request: types.PublishArgs = {
    //         ...types.EmptyPublishArgs,
    //         ...config,
    //         cb: receiveAdminHint,
    //         serverName: app.serverName,
    //         commandString: 'get admin hint'
    //     }
    //     console.log("ThingDetailsDialog useEffect publish", request)
    //     pipeline.Publish(request)
    // }

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

        // if (startedAdminHintFetch == false && config.longName !== '' && config.adminPublicKey === '') {
        //     setStartedAdminHintFetch(true)
        //     fetchAdminkey()
        // }
        if (startedPubkFetch == false && config.longName !== '' &&
            (config.thingPublicKey === '' || config.thingPublicKey.toLowerCase().includes('error'))) {
            setStartedPubkFetch(true)
            fetchPubk()
        }
        if (config.longName !== '' &&
            (config.shortName === '' || config.shortName.toLowerCase().includes('error'))) {
            fetchShortName()
        }
        if (state.pendingCommandNonc !== '' && config.longName !== '') {
            // console.log("dev card sending ", state.pendingCommandNonc)
            console.log("dev card sending ", config.commandString)

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

        // if (state.pendingHelpNonc !== '' && config.longName !== '') {
        //     let request: types.PublishArgs = {
        //         ...types.EmptyPublishArgs,
        //         ...config,
        //         cb: gotHelpValue,
        //         serverName: app.serverName,
        //         commandString: 'help'
        //     }
        //     pipeline.Publish(request)
        // }

        if (help === '' && config.longName !== '') {
            helpCache.getHelp(config.longName, state.uniqueid, (h: string) => {
                let rparts = h.split('\n')
                setCommands(rparts);
                setHelp(h);
            })
        }

        if (adminhint === '' && config.longName !== '') {
            let newConfig = { ...config }
            adminhintCache.getAdminhint(config.longName, state.uniqueid, (h: string) => {
                //  search for matching admin key 
                if (utilsTsx.searchForAdminKeys(h, newConfig, props.index)) {
                    //console.log('receiveAdminHintInfo found admin key')
                    let globalConfig = saved.getThingsConfig()
                    globalConfig.things[props.index] = newConfig
                    saved.setThingsConfig(globalConfig)
                    setConfig({ ...newConfig })
                }
                setAdminhint(h);
            })
        }

        return function cleanup() {
            helpCache.remove(config.longName, state.uniqueid);
            adminhintCache.remove(config.longName, state.uniqueid);
        };
    })

    // long name
    // admin password
    // thing password
    // 
    // command + description 
    // args
    // result

    function adminPass(): ReactElement {

        return (
            <>
                <TextField
                    onChange={changeAdminPass}
                    // id="outlined-helperText"
                    label={"Admin password"}
                    defaultValue={config.adminPublicKey.length > 0 ? "********" : "Type admin password here."}
                    helperText=""
                    fullWidth
                />
            </>
        )
    }

    function changeLongName(e: React.ChangeEvent<HTMLInputElement>) {
        const str = e.currentTarget.value
        console.log("changeLongName setConfig", { ...config, longName: str })
        setConfig({ ...config, longName: str })
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
        console.log("handleSetAdminPassClick", localAdminPass)
        // export function getBase64FromPassphrase(phrase: string): [string, string] {
        const [pub, priv] = utils.getBase64FromPassphrase(localAdminPass)

        console.log("handleSetAdminPassClick pub", pub)

        const newConfig = { ...config }
        newConfig.adminPublicKey = pub
        newConfig.adminPrivateKey = priv
        if ( adminhint !== '' ) {
            const allConfig = saved.getThingsConfig()
            let admins = adminhint.split(" ")
            // search all the things for a matching admin key
            var haveMatch = false 
            for (let i = 0; i < admins.length; i++) {
                const admin = admins[i]
                for (let j = 0; j < allConfig.things.length; j++) {
                    if ( j == props.index ) 
                        continue
                    if ( allConfig.things[j].longName === config.longName) {
                        haveMatch = true
                        allConfig.things[j].adminPublicKey = pub
                        allConfig.things[j].adminPrivateKey = priv
                    }
                }
            }
            if ( haveMatch ) {
                allConfig.things[props.index] = newConfig
                saved.setThingsConfig(allConfig)
                // refresh everything
                registry.PublishChange("ThingsChangeNotification", "on duplicate")
            }
        }  else {
            console.log("no admin hint")
            const allConfig = saved.getThingsConfig()
            allConfig.things[props.index] = newConfig
            saved.setThingsConfig(allConfig)
            setConfig(newConfig)
        }         

    }

    const handleSelectClick = (event: any) => {
        console.log("handleSelectClick", event)
        setSelectUp(event.currentTarget);
        // setOpenNewPost(true);
        // handleClose()
        // if (commands.length === 0 && state.pendingHelpNonc === '') {
        //     let nonc = utils.randomString(24)
        //     console.log("do load help nonc", nonc) // fixme: use a cache
        //     let newState: State = {
        //         ...state,
        //         pendingHelpNonc: nonc,
        //     }
        //     setState(newState)
    }


    var menuitems: ReactElement[] = []
    // handleSelectSelect handles a click on the help popup menu
    const handleSelectSelect = (event: any) => {

        console.log("handleSelectSelect", event)
        console.log("handleSelectSelect id", event.target.id)
        let i = +event.target.id
        let cmd = commands[i]

        let h: utilsTsx.helpLine = utilsTsx.parseCmd(cmd)
        if (h.theCommand === '') {
            return;//bad selection
        }

        let c = saved.getThingsConfig()
        c.things[props.index].commandString = h.theCommand
        c.things[props.index].cmdArgCount = h.argCount
        c.things[props.index].cmdDescription = h.description
        c.things[props.index].stars = h.stars
        saved.setThingsConfig(c)

        setConfig(c.things[props.index])

        // also issue the command
        setArgs([])
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
                <MenuItem key={istr} id={istr} onClick={handleSelectSelect}>{part}</MenuItem>
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
                {/* <Typography>{'props . body'}</Typography> */}
                <div className='detailsDiv'>
                    <span>
                        <TextField
                            onChange={changeLongName}
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
                    defaultValue={config.thingPublicKey.length > 0 ? "********" : "Add thing password here."}
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

                    {/* <span className='cmdSpan2'>Push this to choose command: </span>
                    <span className='cmdpulldown'  > <ArrowDropDownIcon onClick={handleSelectClick} style={{ fontSize: "96px" }} /></span> */}

                    <button type="button" onClick={handleSelectClick} className='cmdButton' >Choose command</button>

                </div>
                <div className='spacingDiv'>&#160;</div>

                <div className='detailsDiv'>
                    <span className='cmdSpan'>
                        <div className='overlay3' >
                            Command:
                        </div>
                        {/* <span className='cmd' >{txtStandin('The command','get time',true)}</span> */}
                        <button type="button" onClick={doCommandAttempt} className='cmdButton' >{config.commandString}</button>
                        <div className='bottomoverlay2' >
                            {config.cmdDescription}
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

            {help !== '' ? 'hh ' : ' '}
            {adminhint}
            {config.adminPublicKey !== '' ? ' kk' : ''}
            {config.shortName !== '' ? ' ss' : ''}
            {config.thingPublicKey !== '' ? ' pubk' : ''}

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
