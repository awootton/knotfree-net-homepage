

export type ThingConfig = {

    adminPublicKey: string // in base64 format 
    adminPrivateKey: string // in base64 format 

    thingPublicKey: string // in base64 format

    longName: string // the Thing name
    shortName: string // for local net

    commandString: string // eg 'get time'
    cmdArgCount: number// usually 0
    cmdDescription: string
    stars: number
}

export const EmptyThingConfig: ThingConfig = {
    adminPublicKey: '', // in base64 format 
    adminPrivateKey: '', // in base64 format 

    thingPublicKey: '', // in base64 format

    longName: '', // the Thing name
    shortName: '', // for local net

    commandString: '', // eg 'get time'
    cmdArgCount: 0,// usually 0
    cmdDescription: '',
    stars: 0
}

export const TestThingsConfig: ThingsConfig = {
    things: []
}


// export type GlobalConfig = {

//     adminPublicKey: string // in base64 format
//     adminPrivateKey: string // in base64 format
// }

export type ThingsConfig = {

   // globalConfig: GlobalConfig

    things: ThingConfig[]
}

// ValidateThingsConfig will throw if the object is not really a  ThingsConfig
// it's meant to follow JSON.parse in a try-catch
// TODO: automate somehow. Test.
export function ValidateThingsConfig(config: ThingsConfig) {
    // if (config.globalConfig === undefined) {
    //     throw new Error("missing globalConfig")
    // }
    // if (config.globalConfig.adminPublicKey === undefined) {
    //     throw new Error("missing globalConfig.adminPublicKey")
    // }
    // if (config.globalConfig.adminPrivateKey === undefined) {
    //     throw new Error("missing globalConfig.adminPrivateKey")
    // }
    if (config.things === undefined) {
        throw new Error("missing Things")
    }
    for (let i = 0; i < config.things.length; i++) {
        const dev: ThingConfig = config.things[i]
        if (dev.adminPublicKey === undefined) {
            throw new Error("missing adminPublicKey")
        }
        if (dev.adminPrivateKey === undefined) {
            throw new Error("missing adminPrivateKey")
        }
        if (dev.thingPublicKey === undefined) {
            throw new Error("missing ThingPublicKey")
        }
        if (dev.longName === undefined) {
            throw new Error("missing name")
        }
        if (dev.shortName === undefined) {
            throw new Error("missing shortname")
        }
        if (dev.cmdArgCount === undefined) {
            throw new Error("missing cmdArgCount")
        }
        if (dev.cmdDescription === undefined) {
            throw new Error("missing cmdDescription")
        }
    }
}

var ThingStr = ""
export function saveThingsConfig(config: ThingsConfig) {

    ThingStr = JSON.stringify(config)
    // console.log(setThingsConfig,ThingStr)
    if (!publicComputer) {
        localStorage.setItem('ThingsConfig', ThingStr)
    }

}
export function retreiveThingsConfig(): ThingsConfig {

    if (!publicComputer) {
        var str = localStorage.getItem('ThingsConfig')
        if (str === null) {
            ThingStr = JSON.stringify(TestThingsConfig)
        } else {
            ThingStr = str
        }
    }
    try {
        const got: ThingsConfig = JSON.parse(ThingStr)
        // console.log("getThingsConfig ", got)
        ValidateThingsConfig(got)
        return got
    } catch (e) {
        console.log("getThingsConfig parse error ", e)
        localStorage.setItem('ThingsConfig', JSON.stringify(TestThingsConfig))
        return TestThingsConfig
    }
}

var publicComputer = false

export function setPublic(is: boolean) { // if is public computer so don't save

    publicComputer = is
    if (!is) {
        localStorage.removeItem('public')
        localStorage.removeItem('localAccessToken')
    } else {
        localStorage.setItem('offline', 'yes')
    }
}

export function getPublic(): boolean {
    return publicComputer
}

var token = ""
export function setToken(tok: string) {

    token = tok
    if (!publicComputer) {
        localStorage.setItem('localAccessToken', token)
    }

}
export function getToken(): string {

    if (!publicComputer) {
        var t = localStorage.getItem('localAccessToken')
        if (t === null) {
            token = ""
        } else {
            token = t
        }
    }
    return token
}

var mqttServer = ""
export function setMqttServer(serve: string) {

    mqttServer = serve
    if (!publicComputer) {
        localStorage.setItem('mqttServer', mqttServer)
    }
}
export function getMqttServer(): string {

    if (!publicComputer) {
        var t = localStorage.getItem('mqttServer')
        if (t === null) {
            mqttServer = ""
        } else {
            mqttServer = t
        }
    }
    return mqttServer
}




var tabState = 0

export function setTabState(state: number) { // if is public computer so don't save

    tabState = state
    if (!publicComputer) {
        localStorage.setItem('tabState', "" + tabState)
    }
}

export function getTabState(): number {
    if (!publicComputer) {
        var t = localStorage.getItem('tabState')
        if (t === null) {
            tabState = 0
        } else {
            tabState = + t
        }
    }
    return tabState
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
