

import React, { FC, ReactElement, useEffect } from 'react'



type State = {
    text: string
}

const defaultState: State = {
    text: ' Not connected.',
}

type Props = {
}

var latestCallback = (text: string) => {
    console.log("NetStatus override me ")
}

//var incomingText: string = ""
export function SetNetStatus(text: string) {
    console.log("setting text ", text)
    // incomingText = text
    setTimeout(() => { latestCallback(text) }, 10)
}


// const interval = setInterval(()=>{
//     if ( incomingText != ""){

//     }
//     incomingText = ""
//   },10000)

export const NetStatus: FC<Props> = (props: Props): ReactElement => {

    const [state, setState] = React.useState(defaultState);

    // Remember: every time this redraws there's a new one and the old one is no good.
    function localSetText(text: string) {
        const newState: State = {
            ...state,
            text: text
        }
        setState(newState)
    }

    useEffect(() => {
        latestCallback = localSetText
    })

    return (

        <span className='NetStatus'>{state.text}</span>

    )

}
