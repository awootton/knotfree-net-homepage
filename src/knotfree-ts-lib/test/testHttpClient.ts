// import {assert} from 'chai';
// import assert from 'node:assert/strict';
import { ok, strictEqual, equal } from 'node:assert';


import * as knothttp from '../httpClient'
import * as types from '../types'
import * as packets from '../packets'

// npx tsx src/test/testHttpClient.ts

const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjExMDU1NDMsImlzcyI6Il85c2giLCJqdGkiOiJkdmF3M3oyOG84Ynhxc3E2ZndvengzaHgiLCJpbiI6MTIxNiwib3V0IjoxMjE2LCJzdSI6NjQsImNvIjozMiwidXJsIjoia25vdGZyZWUuaW8vbXF0dCIsInB1YmsiOiJORVVkWlhzUFRELWx4R2VlSFdYRy1vXzl3bGZuX3NCU3FQcVVxekEwSFMwIn0.KLo0z6Rqw9kTGheINSAToGWIa2EdcblyVDmFetlVZ4rrlCtYYg3d9K_sHmaAtbBWiJv-UfUbpQ0mr88XNqZyDQ"

// This will require that knotfree is running and that the py server in knotfree-help-content is runnign.
// check with http://localhost:4321/images/knot128cropped.png
var config: types.ServerConfigList = {
    token: token,
    ownerPublicKey: "",
    ownerPrivateKey: "",
    items: [
        {
            name: "knotfree-help-content",
            // hashedName: Buffer.from(""),
            host: "localhost",
            port: 4321,
        }
    ]
}

var gadget = knothttp.startHttpProxy(config,"localhost",8085,(arg: packets.Universal)=>{})

setTimeout(doTheRest, 1000)

function doTheRest() {

    // now, do a get to localhost 4321
    var gotData: Object = {}
    async function doATestGet() {
        const response = await fetch('http://knotfree-help-content.knotfree.com:8085/');
        const data = await response.text();
        // console.log("doATestGet got", data);
        gotData = data
    }

    async function xxx() {
        await doATestGet()
        console.log("gotData", gotData.toString())
        const ss = gotData.toString().includes("Directory listing for")
        equal(ss, true);

        gadget.httpMonger.packer.restarter.dontReconnect = true
        gadget.httpMonger.packer.restarter.connectInfo.private_client_not_for_use.end()
        gadget.httpMonger.packer.restarter.connectInfo.private_client_not_for_use.destroy()
        console.log("done")
    }
    xxx()
}