import { Buffer } from 'buffer'

import React, { FC, ReactElement } from 'react';
import './App.css';

import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
// import CssBaseline from '@mui/material/CssBaseline';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';


import { HomePage } from './HomePage'
import { AccessTokenPage } from './AccessTokenPage'
import { NetStatus } from './NetStatus'
import { Things } from './Things'
import * as saved from './SavedStuff'

import * as mqtt from "./MqttClient"
import * as more from "./MoreStuff"
import * as utils from './utils'

import Link from '@mui/material/Link';

import Toolbar from '@mui/material/Toolbar';


(window as any).global = window;
// @ts-ignore
window.Buffer = window.Buffer || Buffer


export let serverName = window.location.hostname
export let prefix = "https://"
export let isDev = false
export let forceLocalMode = false

console.log("window.location.port", window.location.port)

if ( window.location.port === "3000" ) {
  serverName = "knotfree.com:8085"
  isDev = true
  prefix = "http://"

  // for debug only:
  serverName = "knotfree.net"
  prefix = "https://"

// serverName = "knotfree.io"
// prefix = "http://"
//forceLocalMode = true

}


serverName = serverName + '/'
// "knotfree.net" or localhost:3000/  knotfree.com is the same as localhost in my /etc/hosts file

export var useMqtt = false
export var useHttp = true // else if not mqtt use http

console.log("Top of App Top of App Top of App Top of App Top of App Top of App v0.1.5 serverName:", prefix, serverName)

if (!mqtt.StartMqtHappened && useMqtt) {

  setTimeout(() => {
    console.log("Initial start of Mqtt Initial start of Mqtt Initial start of Mqtt Initial start of Mqtt ")
    mqtt.StartMqt()
  }, 10)

}

export var httpTarget = 'knotfree.io'
if (serverName.includes('knotfree.io')) {
  httpTarget = 'knotfree.io'
} else if (serverName.includes('local')) {
  httpTarget = 'knotfree.com:8085'
} else {// is knotfree.net
  httpTarget = 'knotfree.net'
}

utils.StartHeartbeatTimer();

function App(): ReactElement {

  return (
    // <div className="App">
    <>
      <VerticalTabs />
    </>
    // </div>
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
    <div
      className="panelTop"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
    >
      {value === index && (
        // <Box sx={{ p: 3 }}>
        <Typography component={'span'} variant={'body2'} >{children}</Typography>
        // </Box>
      )}
    </div>
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

  // do we need this?
  if (window.location.pathname === '/token') {
    starting = 1
  }
  // if (window.location.pathname === '/setup') {
  //   starting = 2
  // }
  if (window.location.pathname === '/Things') {
    starting = 3
  }
  if (window.location.pathname === '/more') {
    starting = 4
  }

  const [value, setValue] = React.useState(starting);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    // since we left out #2 we have to pick a value that is not 2
    if (newValue >= 2) {
      newValue += 1 // use mapping table TODO
    }
    saved.setTabState(newValue)
    setValue(newValue);
  };

  const tabs = (): ReactElement => {
    let ordinalValue = value
    if (ordinalValue >=2 ) {
      ordinalValue -= 1 // use mapping table TODO
    }
    return (
      <>
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={ordinalValue}
          onChange={handleChange}
          aria-label="Vertical tabs example"
          sx={{ borderRight: 1, borderColor: 'divider' }}
        >
          <Tab label="Knotfree" {...a11yProps(0)} />
          <Tab label="Access Token" {...a11yProps(1)} />
          {/* <Tab label="Setup" {...a11yProps(2)} /> */}
          <Tab label="Things" {...a11yProps(3)} />
          <Tab label="Misc" {...a11yProps(4)} />
        </Tabs>
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
      text = "Get Token"
    }
    // if (value === 2) {
    //   text = "Setup"
    // }
    if (value === 3) {
      text = "Things"
    }
    if (value === 4) {
      text = "Misc"
    }

    return (
      <span className='barleft'>{text}</span>
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
      {/* <TabPanel value={value} index={2}>
      
         <SetupThing/>
        
      </TabPanel> */}
      <TabPanel value={value} index={3}>

        <Things />

      </TabPanel>
      <TabPanel value={value} index={4}>

        <more.MoreStuff />

      </TabPanel>
    </>
  )

  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  function getHelpUrl(): string {

    var text = "none"
    if (value === 0) { // about knotfree
      text = "https://github.com/awootton/knotfreeiot/wiki"
    }
    if (value === 1) { // Access Token
      text = "https://github.com/awootton/knotfreeiot/wiki/The-Access-Token-UI"
    }
    // if (value === 2) { // About mqtt5nano
    //   text = "https://github.com/awootton/mqtt5nano"
    // }
    if (value === 3) { // Things
      text = "https://github.com/awootton/knotfree-net-homepage/wiki/Things"
    }
    if (value === 4) { // misc
      text = "https://github.com/awootton/knotfree-net-homepage/wiki/Things"
    }
    return text
  }

  const container = window !== undefined ? () => window.document.body : undefined;

  return (
    <div className = 'surroundingDiv'>
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
          >
            <MenuIcon />
          </IconButton>

          <MyToolbarText />

          <span className='help'><Link href={getHelpUrl()}>Help</Link></span>

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
    </div>
  )

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
