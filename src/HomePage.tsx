
import React, { FC, ReactElement, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './homepage.css'

import logo from './KnotFreeKnot128cropped.png';

import knotfree_home_md_url from './knotfree-home-md.txt';

type Props = {
}

export const HomePage: FC<Props> = (props: Props): ReactElement => {

  const [theMarkdown, settheMarkdown] = React.useState("");

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

  return (
    <span>
      <img src={logo} className="App-logo" alt="logo" /> 
      <ReactMarkdown children={theMarkdown}
        remarkPlugins={[remarkGfm]}
      />
    </span>
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
