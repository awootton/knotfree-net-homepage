

export type DeviceConfig = {

    adminPublicKey: string // in base64 format, if "" inherit from parent
    adminPrivateKey: string // in base64 format, if "" inherit from parent
    devicePublicKey: string // in base64 format

    name: string,
    shortname: string,
    about: string,

    commandString: string, // eg 'get time'
    cmdArgCount: number,// usually 0
    cmdDescription: string,
}

export type GlobalConfig = {

    adminPublicKey: string // in base64 format
    adminPrivateKey: string // in base64 format
}

export type DevicesConfig = {

    globalConfig: GlobalConfig

    devices: DeviceConfig[]
}

export const TestDevicesConfig: DevicesConfig = {

    globalConfig: {
        adminPublicKey: "",
        adminPrivateKey: "",
    },
    devices: [
        {
            adminPublicKey: "",// in base64 format, if "" inherit from parent
            adminPrivateKey: "", // in base64 format, if "" inherit from parent
            devicePublicKey: "", // in base64 format

            name: "get-unix-time",
            shortname: "get-unix-time",
            about: "v.0.1.0",

            commandString: "get time",
            cmdArgCount: 0,
            cmdDescription: "unix time in seconds",
        },
        {
            adminPublicKey: "",// in base64 format, if "" inherit from parent
            adminPrivateKey: "", // in base64 format, if "" inherit from parent
            devicePublicKey: "", // in base64 format

            name: "backyard-temp-9gmf97inj5e",
            shortname: "backyard thermometer",
            about: "v.0.1.0",

            commandString: "get temp",
            cmdArgCount: 0,
            cmdDescription: "temp in F",
        },
        {
            adminPublicKey: "",// in base64 format, if "" inherit from parent
            adminPrivateKey: "", // in base64 format, if "" inherit from parent
            devicePublicKey: "", // in base64 format

            name: "get-unix-time",
            shortname: "get-unix-time",
            about: "v.0.1.0",

            commandString: "help",
            cmdArgCount: 0,
            cmdDescription: "list the commands",

        },
    ]
}



var deviceStr = ""
export function setDevicesConfig( config: DevicesConfig) {

    deviceStr = JSON.stringify(config)
    // console.log(setDevicesConfig,deviceStr)
    if (!publicComputer) {
        localStorage.setItem('devicesConfig', deviceStr)
    }

}
export function getDevicesConfig(): DevicesConfig {

    if (!publicComputer) {
        var str = localStorage.getItem('devicesConfig')
        if (str === null) {
            deviceStr = JSON.stringify(TestDevicesConfig)
        } else {
            deviceStr = str
        }
    }
    return JSON.parse(deviceStr)
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