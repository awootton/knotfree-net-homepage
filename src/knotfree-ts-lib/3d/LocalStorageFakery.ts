

export const sss = "hello world"

// they lie. They said it was in here. Fvckers. 
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

// Note that the node version of localStorage is not persistent, so it will not retain data between runs of your application.
// But, it's simple and it works. 
export const ourLocalStorage = (typeof window !== "undefined" && window !== null) ? window.localStorage : new MyLocalStorage()
 

// Copyright 2026 Alan Tracey Wootton
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
