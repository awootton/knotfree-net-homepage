






export interface MessageBaseClass {
    type: string,       // for routing by type
    sessionId: string   //  for routing reply messages
}

export interface InitMessage extends MessageBaseClass {

    payload: {
        props: any,
        drawingSurface: any,    // offscreencanvas,
        width: number,          //canvas.clientWidth,
        height: number,         //canvas.clientHeight,
        pixelRatio: number,     //window.devicePixelRatio,
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
