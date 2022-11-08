import React, { FC, ReactElement, useEffect } from 'react'
import preval from 'preval.macro'

type Props = {

}

export const MoreStuff: FC<Props> = (props: Props): ReactElement => {


    return (
        <>
            more tbd.
            <p>
                Build Date: {preval`module.exports = new Date().toLocaleString();`}.
            </p>
        </>
    )

}