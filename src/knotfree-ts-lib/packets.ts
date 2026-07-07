// Copyright 2024 Alan Tracey Wootton
//
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

// This is the protocol for knotfree native pubsub messages. On port 8384.
// See testKnotConnect.ts for a simple example of usage.
// The protocol is designed to be simple and efficient.
// The protocol is designed to be reliable and robust.
// The protocol is designed to be fast and scalable.
// The protocol is designed to be easy to implement and use.
// The protocol is designed to be easy to debug and test.
// The protocol is designed to be easy to document and understand.
// Or at least better than MQTT

// Universal is the wire format for all messages (with varlen lengths).
// it's byte then a varint of the count of strings, then a varint of the length of each string, then the strings.
// See FromBuffer and ToBytes for the details.

import { Buffer } from 'buffer' // for stinky react native 

export class Universal {
    commandType: string // P S U L C D or H  // just one character
    data: Uint8Array[]
    constructor(commandType: string, data: Uint8Array[]) {
        this.commandType = commandType
        this.data = data
    }

    toString(): string {
        var s = "commandType:" + this.commandType
        let i = 0
        for (let d of this.data) {
            if (isAscii(d)) {
                s += " " + Buffer.from(d).toString('utf8')
            } else {
                if (i < 2 && d.length === 25 && d[0] === 0) { // a binary address
                    let tmp = Buffer.from(d.subarray(1)).toString('base64')
                    tmp = tmp.replace(/=/g, '')
                    s += " =" + tmp
                } else {
                    s += " $" + Buffer.from(d).toString('hex')
                }
            }
            i++
        }
        return s
    }
}

// MakeUniversal is a convenience function to make a Universal Class from a js Object
export function MakeUniversal(value: any): Universal {
    var p = value as Universal
    return new Universal(p.commandType, p.data)
}
export function MakeNullUniversal(): Universal {
    return new Universal("X", [])
}

export function FromBuffer(buffer: Buffer): [u: Universal|undefined, b: Buffer] {
    if (buffer.length < 2) {
        return [undefined, buffer]
    }
    try {
        let pos = 0
        // first byte is the command type
        const commandType = buffer.readUInt8(pos++)
        // then a varlenint of the count of the strings
        let strCount: number
        [strCount, pos] = ReadVarLenInt(buffer, pos)
        // then a varlenint of the length of each string
        let lengths: number[] = Array(strCount)
        for (let i = 0; i < strCount; i++) {
            [lengths[i], pos] = ReadVarLenInt(buffer, pos)
        }
        // then each string
        const blen = buffer.length
        let data: Uint8Array[] = Array(strCount)
        for (let i = 0; i < strCount; i++) {
            if (pos + lengths[i] > blen) {
                return [undefined, buffer]
            }
            data[i] = buffer.subarray(pos, pos + lengths[i])
            pos += lengths[i]
        }
        let u: Universal = new Universal(String.fromCharCode(commandType), data)
        const b = buffer.subarray(pos)
        return [u, b]
    } catch (error) {
        // this is normal console.log("FromBuffer data shortage:" + Asciiizer(buffer, 256) + " length=" + buffer.length)
    }
    return [undefined, buffer]
}

// ToBytes serializes a Universal to a Buffer
// write one byte
// then write varlenint of the count of the strings
// then write varlenint of the length of each string
// then write each string
export function ToBytes(u: Universal): Buffer {
    let bytes = Buffer.from(u.commandType.substring(0, 1))
    const size = u.data.length
    bytes = Buffer.from(writeVarLenInt(size, bytes))
    for (let a of u.data) {
        bytes = Buffer.from(writeVarLenInt(a.length, bytes))
    }
    for (let a of u.data) {
        bytes = Buffer.concat([bytes, Buffer.from(a)])
    }
    return bytes
}

// PacketCommon is the common interface for all packets.
// TODO: use a class and not the function pointer.
export type PacketCommon = {
    backingUniversal: Universal,
    optionalKeyValues: Map<string, Uint8Array>
    // copy the fields out of the object into the backingUniversal
    toBackingUniversal: () => any
}

export function PacketToBytes(packet: PacketCommon): Buffer {
    packet.toBackingUniversal()
    const u = packet.backingUniversal
    return ToBytes(u)
}


// AddressUnion is one byte followed by more bytes.
// is either utf-8 of an address, or it is a coded version of HashTypeLen bytes
// coding is one of:
// space followed by utf8 glyphs
// $ followed by exactly 48 bytes of hex
// = followed by exactly 32 bytes of base64
// \0 followed by exactly 24 bytes of binary
type AddressUnion = {
    Type: string // length 1 always
    Bytes: Uint8Array      // ' ' or '$' or '=' or 0
}

// Connect is the first message
// Usually the options have a JWT with permissions. C
export interface Connect extends PacketCommon {
}

export function MakeConnect() {
    let p: Connect = {
        backingUniversal: new Universal("C", []),
        optionalKeyValues: new Map<string, Uint8Array>(),
        toBackingUniversal: () => {
            p.backingUniversal.data = []
            appendOptions(p.optionalKeyValues, p.backingUniversal.data)
        }
    }
    return p
}
export function FillConnect(u: Universal): Connect | undefined{
    if ( ! u ){
        return undefined
    }
    if (u.commandType != "C") {
        return undefined
    }
    let p = MakeConnect()
    p.backingUniversal = u
    fillOptions(p.optionalKeyValues, u.data, 0)
    return p
}


// Disconnect is the last thing a client will hear.
// May contain a string in options["error"]
// A client can also send this to server. "D"
export interface Disconnect extends PacketCommon {
}
// TODO: do the make and the fill

// Ping is a utility. Aka Heartbeat.
export interface Ping extends PacketCommon {
}
// TODO: do the make and the fill

// MessageCommon is
export interface MessageCommon extends PacketCommon {
    // aka destination address aka channel aka topic.
    Address: AddressUnion
}

// Subscribe is to declare that the Thing has an address.
// Presumably one would Subscribe before a Send. "S"
export interface Subscribe extends MessageCommon {
}
export function MakeSubscribe(): Subscribe {
    let p: Subscribe = {
        backingUniversal: new Universal("S", []),
        Address: { Type: ' ', Bytes: new Uint8Array() },
        optionalKeyValues: new Map<string, Uint8Array>(),
        toBackingUniversal: () => {
            p.backingUniversal.data = []
            appendAddress(p.Address, p.backingUniversal.data)
            appendOptions(p.optionalKeyValues, p.backingUniversal.data)
        }
    }
    return p
}
export function FillSubscribe(u: Universal): Subscribe | undefined{
    if ( ! u ){
        return undefined
    }
    if (u.commandType != "S") {
        return undefined
    }
    if (u.data.length < 1) {
        return undefined
    }
    let p: Subscribe = MakeSubscribe()
    p.backingUniversal = u
    p.Address = AddressFromBytes(u.data[0])
    fillOptions(p.optionalKeyValues, u.data, 1)
    return p
}



// Unsubscribe might prevent future reception at the indicated destination address. "U"
export interface Unsubscribe extends MessageCommon {
}
// TODO: do the make and the fill


// Send aka 'publish' aka 'push' sends Payload (and the options) to destination aka Address.
export interface Send extends MessageCommon { // "P"

    // Aka return address. Required.
    Source: AddressUnion,

    Payload: Uint8Array
}
export function MakeSend(): Send {
    let p: Send = {
        backingUniversal: new Universal("P", []), // P is for publish or push, or send
        optionalKeyValues: new Map<string, Uint8Array>(),
        Address: { Type: ' ', Bytes: new Uint8Array() },
        Source: { Type: ' ', Bytes: new Uint8Array() },
        Payload: new Uint8Array(),
        toBackingUniversal: () => {
            p.backingUniversal.data = []
            appendAddress(p.Address, p.backingUniversal.data)
            appendAddress(p.Source, p.backingUniversal.data)
            p.backingUniversal.data.push(p.Payload)
            appendOptions(p.optionalKeyValues, p.backingUniversal.data)
        }
    }
    return p
}
export function FillSend(u: Universal): Send | undefined{
    if ( ! u ){
        return undefined
    }
    if (u.commandType != "P") {
        return undefined
    }
    if (u.data.length < 3) {
        return undefined
    }
    let p: Send = MakeSend()
    p.backingUniversal = u
    p.Address = AddressFromBytes(u.data[0])
    p.Source = AddressFromBytes(u.data[1])
    p.Payload = u.data[2]
    fillOptions(p.optionalKeyValues, u.data, 3)
    return p
}

// Lookup returns information on the dest to source.
// Can be used to verify existance of an endpoint prior to subscribe.
// If the topic metadata has one subscriber and an ipv6 address then this is the same as a dns lookup.
// there will be commands to add and remove the name in the options under the key "cmd"
// No command means just a lookup. "L"
export interface Lookup extends MessageCommon {

    // a return address
    Source: AddressUnion
}
export function MakeLookup(): Lookup {
    let p: Lookup = {
        backingUniversal: new Universal("L", []),
        optionalKeyValues: new Map<string, Uint8Array>(),
        Address: { Type: ' ', Bytes: new Uint8Array() },
        Source: { Type: ' ', Bytes: new Uint8Array() },
        toBackingUniversal: () => {
            p.backingUniversal.data = []
            appendAddress(p.Address, p.backingUniversal.data)
            appendAddress(p.Source, p.backingUniversal.data)
            appendOptions(p.optionalKeyValues, p.backingUniversal.data)
        }
    }
    return p
}
export function FillLookup(u: Universal): Lookup | undefined{
    if ( ! u ){
        return undefined
    }
    if (u.commandType != "L") {
        return undefined
    }
    let p: Lookup = MakeLookup()
    p.backingUniversal = u
    p.Address = AddressFromBytes(u.data[0])
    p.Source = AddressFromBytes(u.data[1])
    fillOptions(p.optionalKeyValues, u.data, 2)
    return p
}

// msb first 
function writeVarLenInt(n: number, data: Buffer): Buffer {
    let dest = Buffer.alloc(8)
    let pos = 0
    // first just write them all
    while (n > 0) {
        let b = n & 0x7F
        n = n >> 7
        dest.writeUInt8(b, pos++)
    }
    // now reverse them and add 0x80 to all but the last
    let dest2 = Buffer.alloc(pos)
    for (let i = 0; i < pos; i++) {
        let tmp = dest.readUInt8(pos - 1 - i)
        if (i < pos - 1) {
            tmp = tmp | 0x80
        }
        dest2.writeUInt8(tmp, i)
    }
    return Buffer.concat([data, dest2])
}


// appendOptions appends the options TO the array
function appendOptions(options: Map<string, Uint8Array>, array: Uint8Array[]) {
    for (let [key, value] of options) {
        array.push(Buffer.from(key))
        array.push(value)
    }
}
// fillOptions fills the options FROM the array
function fillOptions(options: Map<string, Uint8Array>, data: Uint8Array[], offset: number) {
    for (let i = offset; i < data.length; i += 2) {
        options.set(Buffer.from(data[i]).toString(), data[i + 1])
    }
}

// ToBytes simply concates the Type and the Bytes
// The utf-8 types will NOT end up with a space at the start
// is it better to just alloc the bytes?
function AddressToBytes(address: AddressUnion): Buffer {

    if (address.Type === ' ') { // Utf8Address {
        return Buffer.from(address.Bytes)
    }
    return Buffer.concat([Buffer.from(address.Type), Buffer.from(address.Bytes)])
}


// BinaryAddress is when an AddressUnion is 24 bytes of bits
const BinaryAddress = "\0"
// HexAddress is when an AddressUnion is 48 bytes of hex bytes
const HexAddress = "$"
// Base64Address is when an AddressUnion is 32 bytes of base64 bytes
const Base64Address = "="
// Utf8Address is when an AddressUnion is a utf-8 bytes. The default
const Utf8Address = " "

function AddressFromBytes(bytes: Uint8Array): AddressUnion {
    if (!bytes) {
        return { Type: Utf8Address, Bytes: new Uint8Array() }
    }
    let a: AddressUnion = { Type: ' ', Bytes: new Uint8Array() }
    if (bytes.length === 0) {
        a.Type = Utf8Address
        a.Bytes = bytes
        return a
    }
    let first = bytes.subarray(0, 1).toString() // AddressType(bytes[0])
    let more = bytes.subarray(1)
    if (first === BinaryAddress && more.length === 24) {
        a.Type = BinaryAddress
        a.Bytes = more
        return a
    }
    if (first === HexAddress && more.length === 48) {
        a.Type = HexAddress
        a.Bytes = more
        return a
    }
    if (first === Base64Address && more.length === 32) {
        a.Type = Base64Address
        a.Bytes = more
        return a
    }
    if (first === Utf8Address) {
        a.Type = Utf8Address
        a.Bytes = more
        return a
    }
    a.Type = Utf8Address
    a.Bytes = bytes // and not more
    return a
}

function appendAddress(address: AddressUnion, array: Uint8Array[]) {
    const bytes = AddressToBytes(address)
    array.push(bytes)
}

export function isAscii(bytes: Uint8Array): boolean {
    for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] > 127) {
            return false
        }
        if (bytes[i] < 32 && bytes[i] != 9 && bytes[i] != 10 && bytes[i] != 13) {
            return false
        }
    }
    return true
}

// Asciiizer is a utility to convert bytes to a string. for logging
export function Asciiizer(bytes: Uint8Array, max: number): string {
    let val = ''
    let bytes2 = bytes
    if (bytes2.length > max) {
        bytes2 = bytes2.subarray(0, max)
    }
    if (isAscii(bytes2)) {
        val = Buffer.from(bytes2).toString('utf8')
        //escape 9,10 and 13 now
        val = val.replace(/\t/g, '\\t')
        val = val.replace(/\r/g, '\\r')
        val = val.replace(/\n/g, '\\n')
    } else {
        val = Buffer.from(bytes2).toString('hex')
    }
    return val
}

function ReadVarLenInt(buffer: Buffer, pos: number): [val: number, pos: number] {
    let val = 0
    let byte = buffer.readUInt8(pos++) // throws when out of data
    val = byte & 0x7F
    while (byte & 0x80) {
        val = val << 7
        byte = buffer.readUInt8(pos++) // throws when out of data
        val = val | (byte & 0x7F)
    }
    return [val, pos]
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
