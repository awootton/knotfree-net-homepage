
import React, { FC, ReactElement, useEffect } from 'react'
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';

import ControlPointIcon from '@mui/icons-material/ControlPoint';
import Card from '@mui/material/Card';
import { DeviceCard } from './DeviceCard';
import * as device from './DeviceCard';
import * as saved from './SavedStuff';
import * as registry from './ChangeRegistry';
import * as utils from './Utils';

import './Devices.css'

import TextField from '@mui/material/TextField';


type State = {
    config: saved.DevicesConfig
}

interface Props {
    // deviceConfig : saved.DevicesConfig
}

export const Devices: FC<Props> = (props: Props): ReactElement => {

    let c = saved.getDevicesConfig()

    // console.log("Devices config",c)

    const [state, setState] = React.useState(c);

    useEffect(() => {
        // subscribe to changes in DevicesConfig
        registry.SetSubscripton("DevicesChangeNotification", (name: string, arg: any) => {
            let c = saved.getDevicesConfig()
            setState(c)
        })
    })

    function textClicked(e: React.ChangeEvent<HTMLInputElement>) {
        console.log("ownedTokenChanged", e.currentTarget.value)
        const str = e.currentTarget.value
        //console.log("ownedTokenChanged", str)
    }

    function adminKeyBlur(e: any) { // this sucks. Fixme. It's too hard to get the type
        let str = e.target.value as string
        console.log("new adminkey", str)

        let pubk = ''
        let privk = ''
        if (str.length > 0) {
            [pubk, privk] = utils.getBase64FromPassphrase(str)
        }

        let config = saved.getDevicesConfig()
        const newState : saved.DevicesConfig = {
            ...config
        }
        newState.globalConfig.adminPublicKey = pubk
        newState.globalConfig.adminPrivateKey = privk

        e.target.value = newState.globalConfig.adminPublicKey

        saved.setDevicesConfig(newState)
        setState(newState)
    }

    let adminKeyshort = state.globalConfig.adminPublicKey
    // if ( adminKeyshort.length > 99 ){
    //     adminKeyshort = adminKeyshort.substring(0,8)  + "..."
    // }

    function getDevicesJsx(): ReactElement {

        let componentArray = []
        for (let i = 0; i < state.devices.length; i++) {
            const dev = state.devices[i]
            const someprops: device.Props = {

                showPubkey: false,
                showAdminKey: false,
                globalConfig: state.globalConfig,
                config: dev,
                index: i
            }

            let somejsx = (
                <DeviceCard key={dev.name + "_" + i} {...someprops} />
            )
            componentArray.push(somejsx)
        }
        return (
            <>
                {componentArray}
            </>
        )
    }

    function onAddClick() {
        console.log("onAddClick")
        const newConfig: saved.DeviceConfig = {
            adminPublicKey: "",// in base64 format, if "" inherit from parent
            adminPrivateKey: "", // in base64 format, if "" inherit from parent
            devicePublicKey: "", // in base64 format

            name: "add device name here",
            shortname: "",
            about: "0",

            commandString: "",
            cmdArgCount: 0,
            cmdDescription: "",
        }
        let c = saved.getDevicesConfig()
        c.devices.push(newConfig)
        saved.setDevicesConfig(c)
        // now notify our parent
        registry.PublishChange("DevicesChangeNotification", "nothing")
    }

    return (
        <Box className="container"  >

            <div className="title" >

                <span className='adminSpan' >
                    {/* {txtStandin('Type admin password here.',adminKeyshort )} */}
                    <TextField
                        className='adminText'
                        onChange={textClicked}
                        onBlur={adminKeyBlur}
                        id="outlined-helperText"
                        label={adminKeyshort.length > 0 ? 'The public key from the admin password:' : 'Type admin password here'}
                        defaultValue={adminKeyshort}
                        helperText=""
                        disabled={false}
                    /></span>
                <span className='plus'><ControlPointIcon onClick={onAddClick} style={{ fontSize: "48px" }} /></span>

            </div>

            {getDevicesJsx()}

        </Box>

    )

}
