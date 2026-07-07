import { Buffer } from 'buffer'

import React, { FC, ReactElement, useEffect } from 'react';

import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
// import CssBaseline from '@mui/material/CssBaseline';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';

import { Tooltip } from 'react-tooltip'



import { HomePage } from './HomePage'
import { AccessTokenPage } from './AccessTokenPage'
import { NetStatus } from './NetStatus'
import { Things } from './Things'
import * as saved from './SavedStuff'

// import * as mqtt from "./MqttClient"
import * as more from "./MoreStuff"
import * as utils from './knotfree-ts-lib/utils'

import Toolbar from '@mui/material/Toolbar';
import * as registry from './ChangeRegistry'
import { MarkdownDialog } from "./dialogs/MarkdownDialog"

import { NamesPanel } from './NamesPanel'

(window as any).global = window;
// @ts-ignore
window.Buffer = window.Buffer || Buffer

// TODO: this is a mess that accumilated over time. Clean it up.
export let serverName = window.location.hostname
export var httpTarget = 'knotfree.io' // todo: use this and lose serverName
export let prefix = "https://"
export let isDev = false
export let forceLocalMode = false

// these are where the things tab goes 
export let subdomainHttpTarget = 'knotfree.net/'
export let subdomainPrefix = 'http://'

console.log("window.location.port", window.location.port)

// if (window.location.port === "3000") {
//   // is local dev mode 
//   serverName = "knotfree.com:8085"
//   httpTarget = 'knotfree.com:8085'
//   isDev = true
//   prefix = "http://"
//   subdomainHttpTarget = 'knotfree.com:8085/'
//   // for debug against prod only:
//   // serverName = "knotfree.net"
//   // prefix = "https://"

//   // serverName = "knotfree.io"
//   // prefix = "http://"
//   // forceLocalMode = true
// }
serverName = serverName + '/'
// "knotfree.net" or localhost:3000/  knotfree.com is the same as localhost in my /etc/hosts file

export var useMqtt = false
export var useHttp = true // else if not mqtt use http

console.log("Top of App Top of App Top of App Top of App Top of App Top of App v0.1.5 serverName:", prefix, serverName)

// if (!mqtt.StartMqtHappened && useMqtt) {

//   setTimeout(() => {
//     console.log("Initial start of Mqtt Initial start of Mqtt Initial start of Mqtt Initial start of Mqtt ")
//     mqtt.StartMqt()
//   }, 10)

// }

// TODO: this is a mess that accumilated over time. Clean it up.
if (serverName.includes('knotfree.io')) {
  httpTarget = 'knotfree.io'
  prefix = "http://"
  subdomainHttpTarget = 'knotfree.io/'
  subdomainPrefix = "http://"
  useHttp = false
} else if (serverName.includes('knotfree.org')) {
  httpTarget = 'knotfree.org'
  prefix = "http://"
  useHttp = false
} else if (serverName.includes('local')) {
  httpTarget = 'knotfree.com:8085' // is localhost in /etc/hosts
  subdomainHttpTarget = 'knotfree.com:8085/'
  subdomainPrefix = "http://"
} else {// is knotfree.net
  httpTarget = 'knotfree.net'
  subdomainHttpTarget = 'knotfree.net/'
  subdomainPrefix = "https://"
}

if (window.location.port === "3000" || window.location.port === "3001"  || window.location.port === "3002" ) {
  // is local dev mode 
  subdomainHttpTarget = 'knotfree.com:8085/'
  subdomainPrefix = "http://"

  serverName = "knotfree.com:8085"
  isDev = true
  prefix = "http://"
  httpTarget = 'knotfree.com:8085'
}


if (serverName.split(".").length === 4) {// is dotted quad
  httpTarget = serverName
  prefix = "http://"
  useHttp = false
}

if ( ! serverName.endsWith('/')) {
  serverName = serverName + '/'
}

console.log("App serverName:", serverName)
console.log("App httpTarget:", httpTarget)
console.log("App prefix:", prefix)
console.log("App subdomainHttpTarget:", subdomainHttpTarget)
console.log("App subdomainPrefix:", subdomainPrefix)

// eg https://raw.githubusercontent.com/awootton/knotfree-help-content/main/expiring.md
// eg https://raw.githubusercontent.com/ is added by the server
export let helpPrefix = prefix + serverName + "api1/rawgithubusercontentproxy/awootton/knotfree-help-content/main/"
if (isDev) {
  helpPrefix = "http://localhost:4321/"
}

// we can also show the wiki? 
// eg https://raw.githubusercontent.com/wiki/awootton/knotfreeiot/Mqtt5nano-device-commands..md
export let wikiPrefix = prefix + serverName + "api1/rawgithubusercontentproxy/wiki/awootton/knotfreeiot/"


utils.StartHeartbeatTimer();

function App(): ReactElement {

  return (
    // <div className="App">
    // </div>
    (<>
      <VerticalTabs />
    </>)
  );
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    (<div
      className="panelTop"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
    >
      {value === index && (
        // <Box sx={{ p: 3 }}>
        // <Typography component={'span'} variant={'body2'} >{children}</Typography>
        (<div className='likeTypography'>
          {children}
        </div>)
        // </Box>
      )}
    </div>)
  );
}

function a11yProps(index: number) {
  return {
    id: `vertical-tab-${index}`,
    'aria-controls': `vertical-tabpanel-${index}`,
  };
}

const drawerWidth = 150;

export function VerticalTabs() {

  // console.log("starting with path", window.location.pathname) is '/'

  var starting = saved.getTabState()

  // do we need this. no, it's evil ? because I didn't fix it
  // note the numbers though.
  if (window.location.pathname === '/token') {
    starting = 1
  }
  if (window.location.pathname === '/things') {
    starting = 2
  }
  if (window.location.pathname === '/names') {
    starting = 3
  }
  if (window.location.pathname === '/misc') { // aka more
    starting = 4
  }

  const [value, setValue] = React.useState(starting);
  const [uniqueId, setUniqueId] = React.useState(utils.randomString(24));

  useEffect(() => {
    registry.SetSubscripton("VerticalTabs", (name: string, arg: any) => {
      const newOrdinal = +arg
      setValue(newOrdinal)
    })
  }
  )

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    saved.setTabState(newValue)
    setValue(newValue);
  };

  const tabs = (): ReactElement => {
    let ordinalValue = value
    return (
      <>
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={ordinalValue}
          onChange={handleChange}
          aria-label="Vertical tabs"
          sx={{ borderRight: 1, borderColor: 'divider' }}
        >
          <Tab label="Knotfree" {...a11yProps(0)}
            data-tooltip-id="tabs-tooltip-home"
          />
          <Tab label="Access Token" {...a11yProps(1)}
            data-tooltip-id="tabs-tooltip-token"
          />
          <Tab label="Things" {...a11yProps(2)}
            data-tooltip-id="tabs-tooltip-things"
          />
          <Tab label="Names" {...a11yProps(3)}
            data-tooltip-id="tabs-tooltip-names"
          />
          <Tab label="Misc" {...a11yProps(4)}
            data-tooltip-id="tabs-tooltip-misc"
          />
        </Tabs>
        <Tooltip id="tabs-tooltip-home" place="bottom">
          <div className="tab-tooltip-content">
            The Knotfree homepage with help and information.
          </div>
        </Tooltip>
        <Tooltip id="tabs-tooltip-token" place="bottom">
          <div className="tab-tooltip-content">
            One time security and access token setup.
          </div>
        </Tooltip>
        <Tooltip id="tabs-tooltip-things" place="bottom">
          <div className="tab-tooltip-content">
            A page to interact with IOT devices and services.
          </div>
        </Tooltip>
        <Tooltip id="tabs-tooltip-names" place="bottom">
          <div className="tab-tooltip-content">
            Obtain and configure internet names.
          </div>
        </Tooltip>
        <Tooltip id="tabs-tooltip-misc" place="bottom">
          <div className="tab-tooltip-content">
            Goofy stuff.
          </div>
        </Tooltip>
      </>
    )
  }

  //  export const AccessTokenPage: FC<Props> = (props: Props): ReactElement => {

  var MyToolbarText: FC<{}> = (): ReactElement => {

    var text = "none"
    if (value === 0) {
      text = "Knotfree"
    }
    if (value === 1) {
      text = "Token"
    }

    if (value === 2) {
      text = "Things"
    }

    if (value === 3) {
      text = "Names"
    }

    if (value === 4) {
      text = "Misc"
    }
    // this is the text on the top bar
    return (
      <>
        <span className='barleft'
        >
          {text}
        </span>
      </>
    )
  }

  const panels = (
    <>
      <TabPanel value={value} index={0} >

        <HomePage />

      </TabPanel>
      <TabPanel value={value} index={1}>

        <AccessTokenPage />

      </TabPanel>

      <TabPanel value={value} index={2}>

        <Things 
          uniqueid={uniqueId}
          refresh={() => { 
            setUniqueId(utils.randomString(24))
          }}
        />

      </TabPanel>

      <TabPanel value={value} index={3}>

        <NamesPanel />

      </TabPanel>

      <TabPanel value={value} index={4}>

        <more.MoreStuff />  {/*  aka misc */}

      </TabPanel>
    </>
  )

  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  function getHelpUrl(): [string, string, string] {

    // eg http://localhost:8085/api1/rawgithubusercontentproxy/awootton/knotfree-net-homepage/main/README.md

    let path = ""
    let title = ""
    let prefix = helpPrefix
    if (value === 0) { // about knotfree
      path = "homepage.md"
      title = "Homepage help"
    }
    if (value === 1) { // Access Token
      path = "tokens.md "
      title = "Access Token help"
    }

    if (value === 2) { // Things
      path = "things.md"
      title = "Things console help"

      path = "How-to-use-the-'Things'-tab-in-the-knotfree-web-app..md"
      prefix = wikiPrefix
    }

    if (value === 3) { // Names
      // path = "names.md"
      title = "Names console help"
      path = "Using-the-Names-tab-at-knotfree.md"
      prefix = wikiPrefix
    }

    if (value === 4) { // misc
      path = "misc.md"
      title = "Miscellaneous explanations"
    }
    return [title, path, prefix]
  }

  const [isHelp, setIsHelp] = React.useState(false)

  function helpClicked() {

    registry.PublishChange("MarkdownDialogChangeNotification", "reload")// reload the markdown every damn time
    setIsHelp(true)
  }

  const container = window !== undefined ? () => window.document.body : undefined;

  const [helpTitle, helpPath, prefix] = getHelpUrl()

  return (
    (<div className='surroundingDiv'>
      <Box className='surroundingBox' sx={{ display: 'flex' }}>

        {/* <CssBaseline /> */}
        <AppBar
          position="fixed"
          sx={{
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` },
          }}
        >
          <Toolbar className="topBarContainer">
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
              size="large">
              <MenuIcon />
            </IconButton>

            <MyToolbarText />

            <span className='help'><button className='help' onClick={helpClicked}>Help</button></span>

            <NetStatus />
          </Toolbar>
        </AppBar>
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
          aria-label="mailbox folders"
        >
          <Drawer
            container={container}
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {tabs()}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
            open
          >
            {tabs()}
          </Drawer>
        </Box>
        <Box
          component="main"
          // sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
          sx={{
            flexGrow: 1,
            p: 2,
            // width: { sm: `calc(100% - ${drawerWidth}px)` }, move to css
          }}
        >
          <Toolbar className="topOfPanel" />
          {panels}
        </Box>
      </Box>
      <MarkdownDialog
        open={isHelp}
        onClose={() => setIsHelp(false)}
        urlprefix={prefix}
        path={helpPath}
        title={helpTitle}
      />
      {/* <div className="tab-tooltip-content">
            One time security and access token setup.
          </div> */}
    </div>)
  );

  // http://localhost:8085/api1/rawgithubusercontentproxy/awootton/knotfree-net-homepage/main/README.md
  // https://knotfree.net/api1/rawgithubusercontentproxy/awootton/knotfree-net-homepage/main/README.md


}


export default App;

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
