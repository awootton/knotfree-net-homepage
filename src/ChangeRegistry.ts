

let myMap = new Map<string, (name: string, arg: any) => void>();

// SetSubscripton is typically called by useEffect to register its lastest function to change the state
// some of these are going to have names that are 24 byte nonce's for watching for returns of mqtt calls.
export function SetSubscripton(name: string, cb: (name: string, arg: any) => void) {

    myMap.delete(name)
    myMap.set(name, cb)
}

// let's try to not leak them 
export function RemoveSubscripton(name: string) {

    myMap.delete(name)
}

// RemoveAllSubscripton could be called by a render of App because they'll all change after that.
export function RemoveAllSubscriptons() {

    myMap.clear()
}

// PublishChange will send the value to the callback but not in this thread. 
export function PublishChange(name: string, value: any) {

    if ( name === '' ){
        return
    }
    // console.log("registry PublishChange",name,value)

    const cb = myMap.get(name)
    let callback = (name: string, arg: any) => { }
    if (cb == undefined) {
        console.log("missing callback for publish to ", name)
    } else {
        callback = cb
    }
    setTimeout(() => {
        callback(name, value)
    }, 1);
}