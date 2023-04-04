import React, { FC, ReactElement } from 'react'
import preval from 'preval.macro'
import { Button } from '@mui/material'  // Card,Paper

import { CopyToClipboard } from 'react-copy-to-clipboard'

import * as helpers from './Utils-tsx'
import * as types from './Types'
import * as saved from './SavedStuff'
import * as app from './App'

import ConfirmDialog from './dialogs/ConfirmDialog'
import MyInputDialog from './dialogs/MyInputDialog'
import StarsDialog from './dialogs/StarsDialog'

import './MoreStuff.css'
import * as allMgr from './store/allThingsConfigMgr'

type Props = {

}

export const MoreStuff: FC<Props> = (props: Props): ReactElement => {

    // let parts: string[] = ['aaa', 'bbb']
    const [clusterStats, setClusterStats] = React.useState(types.EmptyClusterStats);

    const [isConfirm, setConfirm] = React.useState(false);
    const [isConfigInput, setIsConfigInput] = React.useState(false);
    const [errorstr, setErrorstr] = React.useState("");

    const [isStars, setIsStars] = React.useState(false);

    const [samplePassword, setSamplePassword] = React.useState("");

    function getStat() {

        let url = app.prefix + app.serverName + "api1/getstats"
        console.log('getStat url', url)

        fetch(url, { method: "GET" })
            .then(response => response.text())
            .then(data => {
                var str = '{"When":1667999501,"Stats":[' + data + ']}'
                console.log('clusterstats:' + str)
                var stats: types.ClusterStats = JSON.parse(str) as types.ClusterStats
                // ValidateStats(stats)
                setClusterStats(stats)
            })
            .catch(error => console.error(error));
    }

    function getPassword() {

        let url = app.prefix + app.serverName + "api1/getGiantPassword"
        console.log('getPassword url', url)

        fetch(url, { method: "GET" })
            .then(response => response.text())
            .then(data => {
                var str = '' + data
                console.log('getPassword:' + str)
                setSamplePassword(str)
            })
            .catch(error => console.error(error));
    }

    function getCluster() {

        const url = app.prefix + app.serverName + "api1/getallstats"

        console.log('MoreStuff url', url)

        fetch(url, { method: "GET" })
            .then(response => response.text())
            .then(data => {
                console.log('clusterstats' + data)
                const str: string = data
                if (str !== 'none-yet') { // hackery. the operator sets this and there's no operator in test.
                    var stats: types.ClusterStats = JSON.parse(str) as types.ClusterStats
                    // TODO: validate
                    setClusterStats(stats)
                } else {
                    getStat()
                }
            })
            .catch(error => console.error(error));
    }

    // function getClusterLines() {
    //     return helpers.ArrayToParagraphs(clusterStats)
    // }

    function formatStat(stat: types.ClusterStat, index: number): ReactElement {

        const s: types.KnotFreeTokenStats = stat.contactStats
        const max: types.KnotFreeTokenStats = stat.limits.contactStats

        const intrimmed = Math.floor(s.in * max.in * 100) / 100
        const outtrimmed = Math.floor(s.out * max.out * 100) / 100
        const sutrimmed = Math.floor(s.su * max.su * 100) / 100
        const cotrimmed = Math.floor(s.co * max.co * 100) / 100

        var str = ''
        // str += 'name = ' + stat.name + '\n'

        str += 'Connections = ' + cotrimmed + " of " + max.co + '\n'
        str += 'Subscriptions = ' + sutrimmed + " of " + max.su + '\n'
        str += 'input bytes/sec = ' + intrimmed + " of " + max.in + '\n'
        str += 'output bytes/sec = ' + outtrimmed + " of " + max.out + '\n'
        str += 'memory used = ' + stat.mem + '\n'
        str += 'lsof count = ' + stat.con + '\n'

        return (
            <div className = 'stat' key={index}>
                <div className='overlay' >
                    Usage for {stat.name}
                </div>
                <div className='tokenCard'>
                    {helpers.LinesToParagraphs(str)}
                </div>
            </div>
        )
    }

    // marshal into stats and then write as array of divs with lines
    function formatStats(): ReactElement[] {
        console.log("stats raw")
        if ( clusterStats.Stats.length === 0) {
            return ([])
        }
        const stats = clusterStats;
        var arr = stats.Stats
        var results: ReactElement[] = []
        for (let i = 0; i < arr.length; i++) {
            const item = formatStat(arr[i], i)
            results.push(item)
        }
        return results
    }

    function getConfig(): string {
        const config: saved.ThingsConfig = allMgr.GetGlobalConfig()
        const got = JSON.stringify(config, null, 2);
        return got
    }

    function resetConfig() {
        const config = saved.TestThingsConfig
        allMgr.publish(config,true)
        setConfirm(false)
    }

    function errorJSX(): ReactElement {
        if (errorstr === '') {
            return (<></>)
        } else {
            return (
                <p className='error'>  {errorstr}</p>
            )
        }
    }

    function saveNewConfig(str: string) {
        // marshal as saved.ThingsConfig
        // and set it in saved.
        console.log('have suppoed config', str)
        try {
            const got: saved.ThingsConfig = JSON.parse(str)
            saved.ValidateThingsConfig(got)
            allMgr.publish(got,true)
            setErrorstr('')
        } catch (e) {
            setErrorstr("Incorrect config:" + e)
        }
        setIsConfigInput(false)
    }

    return (
        <>

            <div className='segment'>
                <div className='buttonsDiv'>
                    <CopyToClipboard text={getConfig()}
                        onCopy={() => console.log("config copied to clipboard")} >
                        <Button variant='outlined' >Copy all config to clipboard.</Button>
                    </CopyToClipboard>
                </div>
                <div className='buttonsDiv'  >
                    <Button className='buttons' variant='outlined' onClick={() => setConfirm(true)}>Reset confguration.</Button>
                </div>
                <div className='buttonsDiv'  >
                    <Button className='buttons' variant='outlined' onClick={() => setIsConfigInput(true)}  >Set configuration.</Button>
                    {errorJSX()}
                </div>

            </div>

            <div className='segment'>

                <Button variant='outlined' onClick={getCluster}>Get Cluster Stats</Button>

                <div>
                    {formatStats()}
                </div>
            </div>

            <div className='segment'>
                <p>
                    Build Date: {preval`module.exports = new Date().toLocaleString();`}.
               <br />
                Shift click reload, <span className='reload' > ⟳ </span>, in the browser to get the latest version.</p>
            </div>

            <div className='segment'>

                <Button variant='outlined' onClick={() => setIsStars(true)}>push me</Button>

            </div>

            <ConfirmDialog
                open={isConfirm}
                onClose={() => setConfirm(false)}
                onConfirm={resetConfig}
                title="Reset all the configuration?"
                body='Are you sure you want to toss everything set up here? Perhaps you might like to copy the config to the clipboard first so that you can remember it. Press Confirm of you want to throw it all away.'
            />
            <MyInputDialog
                open={isConfigInput}
                onClose={() => { setIsConfigInput(false) }} //
                onConfirm={saveNewConfig}
                title="Input new configuration"
                body='If you have a configuration that you saved or created you can paste it here.'
                label='paste it in here'
                default=''
            />
            <div className='segment'>
            Just 4 of these words would require 1,000,000,000,000 guesses to crack. Every word makes it 1000 times harder.

                <Button variant='outlined' onClick={getPassword}>Get Password Ideas</Button>
                <div>
                    {samplePassword}
                </div>
            </div>
            <StarsDialog
                open={isStars}
                onClose={() => { setIsStars(false) }} //
                onConfirm={() => { }}
                title=""
            // body='If you have a configuration that you saved or created you can paste it here.'
            //   label=''
            //  default=''
            />


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
