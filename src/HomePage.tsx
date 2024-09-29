
import React, { FC, ReactElement, useEffect } from 'react'
import './homepage.css'

import logo from './KnotFreeKnot128cropped.png'

import knotfree_home_md_url from './knotfree-home-md.txt'
import * as allMgr from './store/allThingsConfigMgr'
import * as saved from './SavedStuff'
import * as registry from './ChangeRegistry'
import { MarkdownDiv } from "./dialogs/MarkdownDiv"
import * as app  from './App'


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

  // TDOD: move this to the help markdown.
  return (
    <div className="likeTypography">
      <div className='centered'>
        <img src={logo} className="App-logo" alt="logo" />
      </div>

      {/* <div className='selButtons'>
        <br></br>
        <h3>Knotfree is a tool for creating Internet Of Things applications.</h3><br></br><br></br>
      </div> */}
      
      <MarkdownDiv
        urlprefix={app.helpPrefix}
        path={"homepageBody.md"}
      />

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
