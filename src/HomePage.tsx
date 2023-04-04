
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
    allMgr.publish(newConfig, true)
    registry.PublishChange("VerticalTabs", 3)
  }

  const isEmpty = allMgr.GetGlobalConfig().things.length === 0

  return (
    <div>
      <div className='centered'>
        <img src={logo} className="App-logo" alt="logo" />
      </div>
       
     
      <div className='selButtons'>
        <br></br>
        <h3>Knotfree is a tool for creating Internet Of Things applications.</h3><br></br><br></br>

        <iframe src='https://youtu.be/TToFWtls-3E'
          allow='autoplay; encrypted-media'
          title='Scrolling display example'
        />
        <br></br>
        <a href="https://wootton.substack.com/p/assembling-the-scrolling-thing" rel="nofollow noopener ugc">
          Check out the MAX7219 scrolling display example project.</a><br></br><br></br>
        
        <a href="https://wootton.substack.com/p/assembling-the-temperature-thing" rel="nofollow noopener ugc">
          There is a DHT11 thermometer example.</a><br></br><br></br>

        The main idea is to create a thing, which is a device that can be controlled by a user. Like a thermometer, doorbell, light or an electronic device of your creation and to then control it from your phone.<br></br><br></br>
        The dashboard is a place to see and control your things. It is the 'Things' tab (press the ☰ in the upper left if the tabs don't show).<br></br>
        <br></br>
        {isEmpty &&
          <div className="indented">
            Since it seems you are new here we can help you get started:<br></br>
            <button className='homepage' onClick={addAThing}>Click here to have a 'thing' set up for you.</button><br></br><br></br>
            Use the menu button,☰, on the upper right and use Pick Command to select different commands and press the button to see what they do.<br></br>
            It would be less boring if it was your own thing 😊. <br></br><br></br>
          </div>
        }

        If you are here to get a token for a thing that you are initializing, <button className='homepage' onClick={() => { registry.PublishChange("VerticalTabs", 1) }
        }>you can get one here.</button><br></br>
        <br></br>

        <a target="_blank" href="https://wootton.substack.com/" rel="nofollow noopener ugc" >Example projects here.</a> <br></br><br></br>

        <a target="_blank" href="https://github.com/awootton/knotfreeiot/wiki" rel="nofollow noopener ugc" >See docs and learn more.</a> <br></br><br></br>

        <a target="_blank" href="https://github.com/awootton/knotfreeiot/discussions/4" rel="nofollow noopener ugc" >Please visit the forum.</a> <br></br><br></br>
        
        <a target="_blank" href="https://github.com/awootton/" rel="nofollow noopener ugc" >Source code.</a> <br></br><br></br>

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
