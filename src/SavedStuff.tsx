


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