import { Buffer } from 'buffer'

import React, { FC, ReactElement } from 'react';
// import logo from './logo.svg';
// import logo192 from './logo192.png';
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
import { Devices } from './Devices'
import * as saved from './SavedStuff'

import * as mqtt from "./MqttClient"
import * as more from "./MoreStuff"

import Link from '@mui/material/Link';

import Toolbar from '@mui/material/Toolbar';



(window as any).global = window;
// @ts-ignore
window.Buffer = window.Buffer || Buffer


export const serverName = window.location.hostname + ':' + window.location.port + '/' // "knotfree.net"

console.log("Top of App Top of App Top of App Top of App Top of App Top of App ")

if (!mqtt.StartMqtHappened) {

  setTimeout(() => {
    console.log("Initial start of Mqtt Initial start of Mqtt Initial start of Mqtt Initial start of Mqtt ")
    mqtt.StartMqt()
  }, 1)

}


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
  if (window.location.pathname === '/mqtt5nano') {
    starting = 2
  }
  if (window.location.pathname === '/devices') {
    starting = 3
  }
  if (window.location.pathname === '/more') {
    starting = 4
  }

  const [value, setValue] = React.useState(starting);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    saved.setTabState(newValue)
    setValue(newValue);
  };

  const tabs = (): ReactElement => {
    return (
      <>
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={value}
          onChange={handleChange}
          aria-label="Vertical tabs example"
          sx={{ borderRight: 1, borderColor: 'divider' }}
        >
          <Tab label="About Knotfree" {...a11yProps(0)} />
          <Tab label="Access Token" {...a11yProps(1)} />
          <Tab label="About mqtt5nano" {...a11yProps(2)} />
          <Tab label="Devices" {...a11yProps(3)} />
          <Tab label="more" {...a11yProps(4)} />
        </Tabs>
      </>
    )
  }

  //  export const AccessTokenPage: FC<Props> = (props: Props): ReactElement => {

  var MyToolbarText: FC<{}> = (): ReactElement => {

    var text = "none"
    if (value === 0) {
      text = "About Knotfree"
    }
    if (value === 1) {
      text = "Access Token"
    }
    if (value === 2) {
      text = "About mqtt5nano"
    }
    if (value === 3) {
      text = "Devices"
    }
    if (value === 4) {
      text = "more coming"
    }

    return (
      <span className='barleft'>{text}</span>
    )
  }

  const devicesUrl = "/devices"
  // console.log("devicesUrl", devicesUrl)

  const panels = (
    <>
      <TabPanel value={value} index={0} >
        <HomePage />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <AccessTokenPage />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <>
          Mqtt5nano is an easy to use mqtt 5 client for Arduino with utilities to connect to wifi and to mqtt.
          There are are utilities to make your iot device into a command line server that is accessable worldwide
          while also having complete end-to-end security. You can find <Link
            target="_blank"
            rel="noopener"
            underline="hover"
            href={"https://github.com/awootton/mqtt5nano"}> mqtt5nano on github </Link>
          To command devices see the
          <Link
            rel="noopener"
            underline="hover"
            href={devicesUrl} > devices </Link>
          tab here.
        </>
      </TabPanel>
      <TabPanel value={value} index={3}>
        <Devices />
      </TabPanel>
      <TabPanel value={value} index={4}>
        <more.MoreStuff/>
      </TabPanel>
    </>
  )

  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  function getHelpUrl() :string
  {

    var text = "none"
    if (value === 0) { // about knotfree
      text = "https://github.com/awootton/knotfreeiot/wiki"
    }
    if (value === 1) { // Access Token
      text = "https://github.com/awootton/knotfreeiot/wiki/The-Access-Token-UI"
    }
    if (value === 2) { // About mqtt5nano
      text = "https://github.com/awootton/mqtt5nano"
    }
    if (value === 3) { // devices
      text = "https://github.com/awootton/knotfree-net-homepage/wiki/Devices"
    }
    if (value === 4) { // misc
      text = "https://github.com/awootton/knotfree-net-homepage/wiki/Devices"
    }
    return text
  }

  const container = window !== undefined ? () => window.document.body : undefined;

  return (
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
           
          <span className= 'help'><Link href={getHelpUrl()}>Help</Link></span>
            
          <NetStatus />
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
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
  )

}


export default App;
