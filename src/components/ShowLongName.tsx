
import React, { FC, ReactElement, useEffect } from 'react'
import * as saved from '../SavedStuff'

export interface Props {

  
    config: saved.ThingConfig
   
}

export const ShowLongName: FC<Props> = (props: Props): ReactElement => {

    return (
        <div>
            <h1>either finish or delete TODO: atw </h1>
        </div>
    )
}
