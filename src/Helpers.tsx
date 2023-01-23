

// import React, { FC, ReactElement, useEffect } from 'react'
import { ReactElement } from 'react'

// LinesToParagraphs will turn a string with line breaks into a list of <p>
export function LinesToParagraphs( text: string): ReactElement[] {
    const parts = text.split("\n")
    return  ArrayToParagraphs(parts)
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
