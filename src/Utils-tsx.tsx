

// import React, { FC, ReactElement, useEffect } from 'react'
import { ReactElement } from 'react'


export interface helpLine {
    theCommand: string
    argCount: number
    description: string
    stars: number
    encrypted: boolean
}

// parseCmd will parse a line in the format: [cmd1 cmd2] +1 comment comment * 
export function parseCmd(cmd: string): helpLine {
    let h: helpLine = {
        theCommand: '',
        argCount: 0,
        description: '',
        stars: 0,
        encrypted: true
    }

    if (cmd.indexOf('🔓') > 0) {
        h.encrypted = false
    }

    const i1 = cmd.indexOf('[')
    const i2 = cmd.indexOf(']')
    if (i1 < 0 || i1 < 0) {
        return h // ['', 0, '']
    }
    let theCommand = cmd.slice(i1 + 1, i2)
    theCommand = theCommand.trim()
    console.log("parseCmd cmd", theCommand)
    h.theCommand = theCommand

    let theRest = cmd.slice(i2 + 1)
    theRest = theRest.trim()
    console.log("parseCmd theRest", theRest)
    while (theRest.endsWith('*')) {
        theRest = theRest.slice(0, theRest.length - 1)
        h.stars++
    }
    if (theRest.startsWith('+')) {
        let c = theRest.charCodeAt(1)
        c = c - "0".charCodeAt(0)
        h.argCount = c
        theRest = theRest.slice(2)
    }
    h.description = theRest.trim()

    return h
}

// LinesToParagraphs will turn a string with line breaks into a list of <p>
export function LinesToParagraphs(text: string): ReactElement[] {
    const parts = text.split("\n")
    return ArrayToParagraphs(parts)
}

// ArrayToParagraphs will turn an array of strings into a list of <p>
export function ArrayToParagraphs(parts: string[]): ReactElement[] {
    var paragraphs: ReactElement[] = []
    for (var i = 0; i < parts.length; i++) {
        const part = parts[i]
        const jsx = (
            <p key={i} >{part}</p>
        )
        paragraphs.push(jsx)
    }
    return paragraphs
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
