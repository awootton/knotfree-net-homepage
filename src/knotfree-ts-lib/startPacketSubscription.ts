import { Buffer } from 'buffer' // for stinky react native 

import * as client from './client'
import * as packets from './packets'

const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjExMDU1NDMsImlzcyI6Il85c2giLCJqdGkiOiJkdmF3M3oyOG84Ynhxc3E2ZndvengzaHgiLCJpbiI6MTIxNiwib3V0IjoxMjE2LCJzdSI6NjQsImNvIjozMiwidXJsIjoia25vdGZyZWUuaW8vbXF0dCIsInB1YmsiOiJORVVkWlhzUFRELWx4R2VlSFdYRy1vXzl3bGZuX3NCU3FQcVVxekEwSFMwIn0.KLo0z6Rqw9kTGheINSAToGWIa2EdcblyVDmFetlVZ4rrlCtYYg3d9K_sHmaAtbBWiJv-UfUbpQ0mr88XNqZyDQ"

// only call this once ever
export function startTestTopicWatcher(myUpdateTestTopic: (arg: packets.Universal) => void,host:string, subs:string[]): client.Packetizer {

    let packer = client.NewDefaultPacketizer()
    packer.token = token
    packer.subs = subs //["testtopic"]// this was a test: ,"testtopic2","testtopic3","testtopic4","testtopic5"]
    packer.restarter.connectInfo.host = host
    packer.restarter.connectInfo.verbose = true
    // packer.restarter.connectInfo.verboseRaw = true

    const oldOnConnect = packer.restarter.onConnect
    packer.restarter.onConnect = (r: client.Restarter) => {
        oldOnConnect(r)
        console.log("onConnect")
        const fakesend = packets.MakeSend()
        fakesend.Payload = Buffer.from("have onConnect")
        fakesend.toBackingUniversal()
        myUpdateTestTopic(fakesend.backingUniversal)
    }

    const oldonDisconnect = packer.restarter.onDisconnect
    packer.restarter.onDisconnect = (r: client.Restarter) => {
        oldonDisconnect(r,Error("onDisconnect"))
        console.log("onDisconnect")
        const fakesend = packets.MakeSend()
        fakesend.Payload = Buffer.from("have onDisconnect")
        fakesend.toBackingUniversal()
        myUpdateTestTopic(fakesend.backingUniversal)
    }

    packer.onPacket = (packer: client.Packetizer, u: packets.Universal) => {
        if (!u) {
            console.log("ERROR: sent onPacket an undefined?")
            return
        }
        const u2 = new packets.Universal(u.commandType, u.data)
        // console.log("node has packet", u2.toString())
        myUpdateTestTopic(u)
    }
    client.StartRestarter(packer.restarter)
    setInterval(() => {

        packer.doSubscriptions(packer)

    }, 18 * 60 * 1000)

    return packer
}

// Copyright 2026 Alan Tracey Wootton
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
