
import React, { FC, ReactElement, useEffect } from 'react'

import Link from '@mui/material/Link';

import './SetupThing.css'
import * as helpers from './Utils-tsx'

//import * as serial from 'serialport'

// import mDnsSd from 'node-dns-sd'

type State = {
    text: string,
    //ports:string[]
   // localNames: string[]
}

const defaultState: State = {
    text: 'idk',
    // ports:[]
   // localNames: []
}

type Props = {
}

export const SetupThing: FC<Props> = (props: Props): ReactElement => {


    const [state, setState] = React.useState(defaultState);

    const [sampleText, setSampleText] = React.useState("");
    const [sampleText2, setSampleText2] = React.useState("");

    useEffect(() => {

      if (sampleText.length === 0) {

        // "http://thing-O.local./get/local/peers?nonc=ANONCEthing&pubk=AAAAAA" 

        fetch("http://thing-O.local./help" ,{
          mode:'cors' , 
        })
          .then(
            (response) => {

              //response.headers("access-control-expose-headers", "Nonc")

              //console.log("header keys ", response.headers.keys)

              //console.log("sampleText Content-Type",response.headers.get('Content-Type'))
              console.log("sampleText nonc",response.headers.get('nonc'))
              console.log("sampleText pubk",response.headers.get('pubk'))
            
              // response.headers.forEach( (val:string,key:string) => {
              //   console.log("headers key val ", key, val)
              // })
              // for ( const e of response.headers.entries() ){
              //   console.log("headers e ", e)
              // }
              // console.log(response.headers);
              return response.text()
            }
              )
          .then((data) => {
            const got = data as string
            setSampleText(got) // causes redraw
          })
          .catch((error) => {
            console.error('Error SetupThing fetch:', error);
          });
      }

      if (sampleText2.length === 0) {

        // "http://thing-O.local./get/local/peers?nonc=ANONCEthing&pubk=AAAAAA" 

        fetch("http://get-unix-time.knotfree.io/help" ,{
          mode:'no-cors' , 
        })
          .then(
            (response) => {

              console.log("sampleText nonc",response.headers.get('nonc'))
              console.log("sampleText pubk",response.headers.get('pubk'))
              return response.text()
            }
              )
          .then((data) => {
            const got = data as string
            setSampleText2(got) // causes redraw
          })
          .catch((error) => {
            console.error('Error SetupThing fetch:', error);
          });
      }
     
    })
    
    const ThingsUrl = "/Things"
    // console.log("ThingsUrl", ThingsUrl)

    let thingListc= helpers.LinesToParagraphs(sampleText)
    let thingListc2= helpers.LinesToParagraphs(sampleText2)

    return (<>
        Mqtt5nano is an easy to use mqtt 5 client for Arduino with utilities to connect to wifi and to mqtt.
        There are are utilities to make your iot Thing into a command line server that is accessable worldwide
        while also having complete end-to-end security. You can find <Link
            target="_blank"
            rel="noopener"
            underline="hover"
            href={"https://github.com/awootton/mqtt5nano"}> mqtt5nano on github </Link>
        To command Things see the
        <Link
            rel="noopener"
            underline="hover"
            href={ThingsUrl} > Things </Link>
        tab here.
        {thingListc}
        <br></br>
        -----------------------------------------
        <br></br>
        {thingListc2}

    </>
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
