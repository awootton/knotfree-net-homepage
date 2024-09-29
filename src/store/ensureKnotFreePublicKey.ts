
import * as types from '../Types'
import * as app from '../App'


export function EnsureKnotFreePublicKey(callback: (err: string) => any) {
    if (types.knotfreeApiPublicKey === "") {
        let url = app.prefix + app.serverName + "api1/getPublicKey"
        console.log('namesListCache getPublicKey url', url)
        fetch(url, { method: "GET" })
            .then(response => response.text())
            .then(data => {
                console.log('ensureKnotFreePublicKey:' + data)
                types.SetKnotfreeApiPublicKey(data)
                callback("")
            })
            .catch(error => {
                console.error(error)
                callback("EnsureKnotFreePublicKey error " + error)
            });
    } else {
        callback("")
    }
}