

import React, { FC, ReactElement, useEffect } from 'react'
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

import ControlPointIcon from '@mui/icons-material/ControlPoint';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';

import CircularProgress from '@mui/material/CircularProgress';


import './DeviceCard.css'

import * as saved from './SavedStuff'
import * as utils from './Utils'
import * as registry from './ChangeRegistry'
import { useListbox, useTabsList } from '@mui/base';
import * as  mqtt from './MqttClient';
import * as  helpers from './Helpers';

type State = {
    config: saved.DeviceConfig
    pendingCommandNonce: string,// a correlation id for an mqtt publish
    returnValue: string,
    pendingHelpNonce: string,
}

export interface Props {

    showPubkey: boolean
    showAdminKey: boolean
    globalConfig: saved.GlobalConfig
    config: saved.DeviceConfig
    index: number
}

export const DeviceCard: FC<Props> = (props: Props): ReactElement => {

    const defaultState: State = {
        config: props.config,
        pendingCommandNonce: '',
        returnValue: '-none-',
        pendingHelpNonce: '',
    }

    const [state, setState] = React.useState(defaultState);

    // this is for the right menu
    const [menuUp, setMenuUp] = React.useState(null);
    // this for the left side command select
    const [selectUp, setSelectUp] = React.useState(null);

    let reply = "[get time] unix time in seconds\n"
    //reply += "[get count] how many served since reboot\n"
    //reply += "[get fail] how many requests were bad since reboot\n"
    reply += "[about] info on this device\n"
    reply += "[help] lists all commands\n"

    let rparts: string[] = [] // reply.split('\n')

    const [commands, setCommands] = React.useState(rparts);

    const gotReturnValue = (name: string, arg: any) => {

        let options: utils.LooseObject = arg

        var message: string = options.message.toString('utf8')

        console.log("DeviceCard got message", message)
        registry.RemoveSubscripton(name)
        const newState: State = {
            ...state,
            returnValue: message,
            pendingCommandNonce: ''
        }
        setState(newState)
    }

    const gotHelpValue = (name: string, arg: any) => {

        let options: utils.LooseObject = arg

        var message: string = options.message.toString('utf8')

        console.log("DeviceCard got gotHelpValue", message)
        registry.RemoveSubscripton(name)
        const newState: State = {
            ...state,
            pendingHelpNonce: ''
        }
        setState(newState)
        let rparts = message.split('\n')
        setCommands(rparts);
    }


    useEffect(() => {
        if (state.pendingCommandNonce !== '') {
            console.log("useEffect has  pendingCommandNonce ", state.pendingCommandNonce)
            registry.SetSubscripton(state.pendingCommandNonce, gotReturnValue)
            // check to not do this twice? A: later in the retry logic
            mqtt.Publish(state.config.commandString, state.config.name, state.pendingCommandNonce)
        }

        if (state.pendingHelpNonce !== '') {
            console.log("useEffect has  pendingHelpNonce ", state.pendingHelpNonce)
            registry.SetSubscripton(state.pendingHelpNonce, gotHelpValue)
            // check to not do this twice? A: later in the retry logic
            mqtt.Publish('help', state.config.name, state.pendingHelpNonce)
        }
    })

    function textClicked(e: React.ChangeEvent<HTMLInputElement>) {
        const str = e.currentTarget.value
        console.log("textClicked", str)
    }

    function changeDeviceName(e: any) { // on the blur unfocus
        const str: string = e.target.value
        console.log("new device name", str)
        let newName: string = str
        let c = saved.getDevicesConfig()
        c.devices[props.index].name = newName
        saved.setDevicesConfig(c)
        const newState: State = {
            ...state,
            config: {
                ...state.config,
                name: newName,
            },
        }
        setState(newState)
        setCommands([])
    }


    function txtStandin(label: string, value: string, disabled = false) {

        console.log(" txtStandin value ", value)
        return (
            <TextField
                onChange={textClicked}
                id="outlined-helperText"
                label={label}
                defaultValue={value}
                helperText=""
                disabled={disabled}
            />
        )
    }

    function dummyButton() {

        console.log("dummyButton")

    }

    function doCommandAttempt() {

        let nonce = utils.randomString(24)
        console.log("doCommandAttempt nonce", nonce)
        let newState: State = {
            ...state,
            pendingCommandNonce: nonce,
            returnValue: "-pending-"
        }
        setState(newState)
    }

    const handleMenuClick = (event: any) => {
        console.log("handleMenuClick", event)
        setMenuUp(event.currentTarget);
        // setOpenNewPost(true);
        //  handleClose()
    };
    const handleMenuSelect = (event: any) => {
        console.log("handleMenuSelect", event)
        console.log("handleMenuSelect tab", event.attributes.tabindex)

        setMenuUp(null);
        // setMenuUp(event.currentTarget);
        // setOpenNewPost(true);
        //  handleClose()
    };

    const handleMenuDuplicate = (event: any) => {

        setMenuUp(null);

        const newConfig: saved.DeviceConfig = {
            ...state.config
        }
        let c = saved.getDevicesConfig()
        c.devices.push(newConfig)
        saved.setDevicesConfig(c)
        // now notify our parent
        registry.PublishChange("DevicesChangeNotification", "nothing")
    };

    const handleMenuDelete = (event: any) => {

        setMenuUp(null);

        let c = saved.getDevicesConfig()
        c.devices.splice(props.index, 1)
        saved.setDevicesConfig(c)

        // now notify our parent
        registry.PublishChange("DevicesChangeNotification", "nothing")

    };

    const handleClose = () => {
        setMenuUp(null);
    };

    const handleSelectClick = (event: any) => {
        console.log("handleSelectClick", event)
        setSelectUp(event.currentTarget);
        // setOpenNewPost(true);
        //  handleClose()
        if (commands.length === 0 && state.pendingHelpNonce === '') {
            let nonce = utils.randomString(24)
            console.log("do load help nonce", nonce)
            let newState: State = {
                ...state,
                pendingHelpNonce: nonce,
            }
            setState(newState)
        }
    };

    function parseCmd(cmd: string): [string, number, string] {
        const i1 = cmd.indexOf('[')
        const i2 = cmd.indexOf(']')
        if (i1 < 0 || i1 < 0) {
            return ['', 0, '']
        }
        let theCommand = cmd.slice(i1 + 1, i2)
        theCommand = theCommand.trim()
        console.log("parseCmd cmd", theCommand)
        let theRest = cmd.slice(i2 + 1)
        theRest = theRest.trim()
        console.log("parseCmd theRest", theRest)
        return [theCommand, 0, theRest]
    }
    const handleSelectSelect = (event: any) => {
        console.log("handleSelectSelect", event)
        console.log("handleSelectSelect id", event.target.id)
        let i = +event.target.id
        let cmd = commands[i]
        const [theCommand, argCount, description] = parseCmd(cmd)
        if (theCommand === '') {
            return;//bad selection
        }

        let c = saved.getDevicesConfig()
        c.devices[props.index].commandString = theCommand
        c.devices[props.index].cmdArgCount = argCount
        c.devices[props.index].cmdDescription = description
        saved.setDevicesConfig(c)

        const newState: State = {
            ...state,
            config: {
                ...state.config,
                commandString: theCommand,
                cmdArgCount: argCount,
                cmdDescription: description
            },
        }

        setState(newState)
        setSelectUp(null);
    };

    const handleSelectClose = () => {
        setSelectUp(null);
    };

    const theReturnValue = state.returnValue

    // var parts = theReturnValue.split('\n')
    // var paragraphs: ReactElement[] = []
    // for (var i = 0; i < parts.length; i++) {
    //     const part = parts[i]
    //     const jsx = (
    //         <p key={i} >{part}</p>
    //     )
    //     paragraphs.push(jsx)
    // }
    // console.log(" DeviceCard returnValue now ", theReturnValue)
    // console.log(" DeviceCard commands now ", commands)

    var menuitems: ReactElement[] = []
    if (commands.length == 0) {
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

    return (

        <Card variant="outlined" className='devCard'>
            <div >
                <span  >
                    <TextField className='cardRow1'
                        onChange={textClicked}
                        onBlur={changeDeviceName}
                        id="outlined-helperText"
                        label={"Device name"}
                        defaultValue={state.config.name}
                        helperText=""
                    // disabled={disabled}
                    />
                </span>
                {props.showPubkey ? (<span className='devKey'>{txtStandin('Device key', 'iuFO975k...')}</span>) : null}
                {props.showAdminKey ? (<span className='adminKey'>{txtStandin('Admin key', 'oGeJoMdC...')}</span>) : null}
            </div>
            <div className='cardRow2'>
                <span className='cmdpulldown'  ><ArrowDropDownIcon onClick={handleSelectClick} style={{ fontSize: "48px" }} /></span>

                <span className='cmdSpan'>

                    <div className='overlay' >
                        Command
                    </div>

                    {/* <span className='cmd' >{txtStandin('The command','get time',true)}</span> */}
                    <button type="button" onClick={doCommandAttempt} className='cmdButton' >{state.config.commandString}</button>

                </span>

                {/* <span className='arg'>{txtStandin('arg[0]','wootmerida')}</span> */}
                <span className='resultSpan'>
                    <div className='overlay' >
                        Result
                    </div>
                    <div className='resultDiv' >
                        {helpers.LinesToParagraphs(theReturnValue)}
                    </div>
                </span>
                <span className='menu'><MenuIcon onClick={handleMenuClick} style={{ fontSize: "36px" }} /></span>

                <Menu
                    id="simple-menu"
                    anchorEl={menuUp}
                    keepMounted
                    open={Boolean(menuUp)}
                    onClose={handleClose}
                >

                    <MenuItem onClick={handleMenuDelete}>Delete</MenuItem>
                    <MenuItem onClick={handleMenuDuplicate}>Duplicate</MenuItem>

                </Menu>

                <Menu
                    id="simple-menu"
                    anchorEl={selectUp}
                    keepMounted
                    open={Boolean(selectUp)}
                    onClose={handleSelectClose}
                >
                    {menuitems}
                    {/* <MenuItem id = {"0"} onClick={handleSelectSelect}>[get time] unix time in seconds</MenuItem>
                    <MenuItem id =  {"1"} onClick={handleSelectSelect}>[get count]  how many served since reboot</MenuItem>
                    <MenuItem id =  {"2"} onClick={handleSelectSelect}>[get fail]  how requests were bad since reboot</MenuItem>
                    <MenuItem id =  {"3"} onClick={handleSelectSelect}>[get fail]  how requests were bad since reboot</MenuItem> */}
                </Menu>


            </div>
        </Card>

    )

}
