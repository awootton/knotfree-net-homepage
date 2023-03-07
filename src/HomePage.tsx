
import React, { FC, ReactElement, useEffect } from 'react'
import './homepage.css'

import logo from './KnotFreeKnot128cropped.png'

import knotfree_home_md_url from './knotfree-home-md.txt'
import * as allMgr from './store/allThingsConfigMgr'
import * as saved from './SavedStuff'
import * as registry from './ChangeRegistry'

type Props = {
}

export const HomePage: FC<Props> = (props: Props): ReactElement => {

  const [theMarkdown, settheMarkdown] = React.useState("")

  useEffect(() => {
    if (theMarkdown.length === 0) {
      fetch(knotfree_home_md_url)
        .then((response) => response.text())
        .then((data) => {
          const got = data as string
          settheMarkdown(got) // causes redraw
        })
    }
  })

  function addAThing() {
    const newThing = saved.TestThingConfig
    const newConfig = allMgr.GetGlobalConfig()
    newConfig.things.push(newThing)
    allMgr.publish(newConfig,true)
    registry.PublishChange("VerticalTabs",3)
  }

  const isEmpty = allMgr.GetGlobalConfig().things.length === 0

  return (
    <div>
      <div className='centered'>
      <img src={logo} className="App-logo" alt="logo" /> 
      </div>
      {/* <ReactMarkdown children={theMarkdown}
        remarkPlugins={[remarkGfm]}
      /> */}
      <div className='selButtons'>
      <br></br>
      Knotfree is a tool for creating Internet Of Things applications.<br></br><br></br>
      The main idea is to create a thing, which is a device that can be controlled by a user. Like a thermometer, doorbell, light or an electronic device of your creation.<br></br><br></br>
      The dashboard is a place to see and control your things. It is the 'Things' tab (press the ☰ in the upper left).<br></br>
      <br></br>
      {isEmpty &&
        <div className="indented">
          Since it seems you are new here we can help you get started:<br></br>
          <button className='homepage' onClick={addAThing}>Click here to have a 'thing' set up for you.</button><br></br><br></br>
         Use the menu button,☰ on the upper right and use Pick Command to select different commands and press the button to see what they do.<br></br>
         It would be less boring if it was your own thing 😊. <br></br><br></br>
        </div>
      }
    
      If you are here to get a token for a thing that you are initializing, <button className='homepage' onClick={() => {registry.PublishChange("VerticalTabs",1)}
         }>you can get one here.</button><br></br>
      <br></br> 

      <a target="_blank" href="https://github.com/awootton/knotfreeiot/wiki" rel="nofollow noopener ugc" >Learn More.</a> <br></br><br></br> 
      
      </div>

    </div>
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
