
import * as oct from './UrlOctTree'

// TODO: build a map backed up by local storage, and use that for the cache in the tree traversal.
// The problem with that is that every time we come back the whole stupid cache will have 
// timed out so what's the point? 
// TODO: better. Just build one of these with a TTL of 5 min.

// TODO: we may need one that can drop really old items. S
// Stay away from locsl storage for now. 

export interface CacheIntf {
    get(key: string): oct.TreeStatus | undefined;
    set(key: string, value: oct.TreeStatus, options?: { ttl?: number, start?: number }): void;
    delete(key: string): void;
    clear(): void;
    keys(): IterableIterator<string>;
}

// this one grows without bounds. Sounds like a goal. Grow. Be popular. Have early stage Twitter problems.
// TTL is infinite.
export const myMapCacheIntf: CacheIntf = {
    get(key: string): oct.TreeStatus | undefined {
        return oct.gCubeCache.get(key)
    },
    set(key: string, value: oct.TreeStatus, options?: { ttl?: number, start?: number }): void {
        // console.log("myMapCacheIntf caching ", key, )
        oct.gCubeCache.set(key, value)
    },
    delete(key: string): void {
        oct.gCubeCache.delete(key)
    },
    clear(): void {
        oct.gCubeCache.clear()
    },
    keys(): IterableIterator<string> {
        return oct.gCubeCache.keys()
    }
}


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
