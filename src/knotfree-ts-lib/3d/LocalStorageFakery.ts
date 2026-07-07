

export const sss = "hello world"

// they lie. They said it was in here. Fuckers. 
// If you are running Node.js v25 or newer, the Web Storage API is built directly into the runtime. You do not need to install any packages.
// I am running v26.0.0 so wtf. What's the secret? 

// THIS FAILS:  localStorage.setItem('user_token', 'xyz123');


// Is this the same API? It doesn't persist but is it the same API?
// yes, note that it doesn't persist. I already lost half a day to crappy libs for this. 
export class MyLocalStorage {

    private storage: Map<string, string>;

    constructor() {
        this.storage = new Map<string, string>();
    }

    getItem(key: string): string | null {
        return this.storage.has(key) ? this.storage.get(key) || null : null;
    }

    setItem(key: string, value: string): void {
        this.storage.set(key, value);
    }

    removeItem(key: string): void {
        this.storage.delete(key);
    }

    clear(): void {
        this.storage.clear();
    }

    key(index: number): string | null {
        const keys = Array.from(this.storage.keys());
        return index >= 0 && index < keys.length ? keys[index] : null;
    }

    get length(): number {
        return this.storage.size;
    }
}

export const ourLocalStorage = (typeof window !== "undefined" && window !== null) ? window.localStorage : new MyLocalStorage()
 
// to define some LocalStorage in nodejs but don't mess up the browser's localStorage.
// do I need to do somethig like this? and include this file?

// import * as NodeLocalStorage from 'node-localstorage'


// // this is pretty cool. Thanks CP. Will it work? 
// export const ourLocalStorage = (typeof window !== "undefined" && window !== null) ? window.localStorage : new NodeLocalStorage.LocalStorage('./scratch')

