

let myMap = new Map<string, (name: string, arg: any) => void>();

// SetSubscripton is typically called by useEffect to register its lastest function to change the state
// some of these are going to have names that are 24 byte nonc's for watching for returns of mqtt calls.
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
    if (cb === undefined) {
        console.log("missing callback for publish to ", name)
    } else {
        callback = cb
    }
    if ( value.message !== undefined){ // Holy hackery batman FIXME: // this is for preserving NetStatusStr
        myMap.delete(name)// leak less
    }
   
    setTimeout(() => {
        callback(name, value)
    }, 1);
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
