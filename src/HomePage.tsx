
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
          console.log("HomePage fetch got ", got.length)
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


