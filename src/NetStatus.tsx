

import React, { FC, ReactElement, useEffect } from 'react'

import * as registry from './ChangeRegistry'

type State = {
    text: string
}

const defaultState: State = {
    text: '...',
}

type Props = {
}

export let GlobalNetStatus = "offline"

export const NetStatus: FC<Props> = (props: Props): ReactElement => {

    const [state, setState] = React.useState(defaultState);

    // Remember: every time this redraws there's a new one and the old one is no good.
    function localSetText(name:string, arg: any) {
        const str = arg as string
        // console.log("NetStatus status update",str)
        const newState: State = {
            ...state,
            text: str
        }
        GlobalNetStatus = str
        setState(newState)
    }

    useEffect(() => {
       registry.SetSubscripton("NetStatusString", localSetText )
    })

    return (

        <span className='NetStatus'>{state.text}</span>

    )

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
