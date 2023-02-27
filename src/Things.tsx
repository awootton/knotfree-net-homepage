
import React, { FC, ReactElement, useEffect } from 'react'
//import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
// import Toolbar from '@mui/material/Toolbar';
// import Typography from '@mui/material/Typography';
// import Button from '@mui/material/Button';
// import IconButton from '@mui/material/IconButton';
// import MenuIcon from '@mui/icons-material/Menu';

//import ControlPointIcon from '@mui/icons-material/ControlPoint';
//import Card from '@mui/material/Card';
import { ThingCard } from './ThingCard';
import * as thing from './ThingCard';
import * as saved from './SavedStuff';
import * as registry from './ChangeRegistry';
import * as allMgr from './store/allThingsConfigMgr'
import * as utils from './utils';

import './Things.css'

//import TextField from '@mui/material/TextField';


type State = {
    config: saved.ThingsConfig
    uniqueid: string
    refreshCount: number
}

interface Props {
}

export const Things: FC<Props> = (props: Props): ReactElement => {

    const startingState: State = {
        config: allMgr.GetGlobalConfig(),
        refreshCount: 0,
        uniqueid: utils.randomString(24),

    }
    const [state, setState] = React.useState(startingState);

    // console.log("Things render top config",state)


    useEffect(() => {
        // subscribe to changes in ThingsConfig
        // registry.SetSubscripton("ThingsChangeNotification", (name: string, arg: any) => {
        //     let c = saved.getThingsConfig()
        //     const newState:State = {config:c,refreshCount: state.refreshCount + 1}
        //     console.log("Things render new state",newState)
        //     setState(newState)
        // })

        allMgr.subscribe(state.uniqueid, (newConfig: saved.ThingsConfig) => {
            const newState: State = {
                config: newConfig,
                refreshCount: state.refreshCount + 1,
                uniqueid: state.uniqueid
            }
            setState(newState)
        })



        if (state.config.things.length == 0) {
            console.log("Things.tsx: no things, adding one")
            const newState: State = {
                config: {
                    ...state.config,
                    things: [saved.EmptyThingConfig]
                },
                refreshCount: state.refreshCount + 1,
                uniqueid: state.uniqueid
            }
            setState(newState)
        }

        return () => {
            allMgr.unsubscribe(state.uniqueid)
        }
    })

    // function textClicked(e: React.ChangeEvent<HTMLInputElement>) {
    //     const str = e.currentTarget.value
    //     currentPassword = str
    // }
    // let currentPassword = ''

    // function adminKeyBlur(e: any) { // this sucks. Fixme. It's too hard to get the type
    //     let str = e.target.value as string
    //     console.log("new adminkey", str)

    //     let pubk = ''
    //     let privk = ''
    //     if (str.length > 0) {
    //         [pubk, privk] = utils.getBase64FromPassphrase(str)
    //     }

    //     let config = saved.getThingsConfig()
    //     const newState: saved.ThingsConfig = {
    //         ...config
    //     }
    //     // newState.globalConfig.adminPublicKey = pubk
    //     // newState.globalConfig.adminPrivateKey = privk

    //     // e.target.value = newState.globalConfig.adminPublicKey

    //     saved.setThingsConfig(newState)
    //     setState(newState)
    // }

    // let adminKeyshort = state.globalConfig.adminPublicKey


    // // console.log("state.globalConfig.adminPublicKey is" , adminKeyshort)
    // if ( adminKeyshort != '') {
    //     adminKeyshort = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' // 40 exes
    // }

    function getThingsJsx(): ReactElement {

        let componentArray = []
        let c = state.config
        for (let i = 0; i < c.things.length; i++) {
            const thingConfig = c.things[i]

            const someprops: thing.Props = {
                showPubkey: false,
                showAdminKey: false,
                config: thingConfig,
                index: i,
                version: state.refreshCount
            }

            let somejsx = (
                <ThingCard key={thingConfig.longName + "_" + i} {...someprops} />
            )
            componentArray.push(somejsx)
        }
        return (
            <>
                {componentArray}
            </>
        )
    }

    // function onAddClick() {
    //     console.log("onAddClick")
    //     const newConfig: saved.ThingConfig = {
    //         adminPublicKey: "",// in base64 format, if "" inherit from parent
    //         adminPrivateKey: "", // in base64 format, if "" inherit from parent
    //         thingPublicKey: "", // in base64 format

    //         longName: "",
    //         shortName: "",

    //         commandString: "",
    //         cmdArgCount: 0,
    //         cmdDescription: "",
    //         stars:0
    //     }
    //     let c = saved.getThingsConfig()
    //    // c.things.push(newConfig)
    //     c.things.unshift(newConfig)
    //     saved.setThingsConfig(c)
    //     // now notify our parent
    //     registry.PublishChange("ThingsChangeNotification", "nothing")
    // }

    // this needs to be deleted
    // function gotPassword(){
    //     let str = currentPassword
    //     console.log('gotPassword',currentPassword)
    //     if ( str ==='' ){
    //         return
    //     }
    //     if ( str == 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' ) {// 40 exes, didn't change
    //         return
    //     }
    //     let pubk = ''
    //     let privk = ''
    //     if (str.length > 0) {
    //         [pubk, privk] = utils.getBase64FromPassphrase(str)
    //     }

    //     let config = saved.getThingsConfig()
    //     const newState: saved.ThingsConfig = {
    //         ...config
    //     }

    //     // newState.globalConfig.adminPublicKey = pubk
    //     // newState.globalConfig.adminPrivateKey = privk

    //    // e.target.value = newState.globalConfig.adminPublicKey

    //     saved.setThingsConfig(newState)
    //     setState(newState)
    // }

    return (
        <Box className="container"  >

            {/* <div className="title" >

                <span className='adminSpan' >
                    
                        <TextField
                            className='adminText'
                            onChange={textClicked}
                            onBlur={()=> {}} // adminKeyBlur
                            
                            label={adminKeyshort.length > 0 ? 'Admin password is set' : 'Type default admin password here'}
                            defaultValue={adminKeyshort}
                            helperText=""
                            disabled={false}

                            type="password" 
                            name="password"
                            id="password"
                        />
                       <input type="username" name="username" id="username" disabled={true} />
                       <input type="submit" value="set" onClick = {gotPassword}/>
                  
                </span>

                <span className='plus'><ControlPointIcon onClick={onAddClick} style={{ fontSize: "48px" }} /></span>

            </div> */}

            {getThingsJsx()}

        </Box>

    )

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

