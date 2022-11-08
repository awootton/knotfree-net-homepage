

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

