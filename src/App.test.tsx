// import React from 'react';
// import { render, screen } from '@testing-library/react';
// import App from './App';

import * as thingcard from './ThingCard'
import * as utilsTsx from './Utils-tsx'

// to run: yarn test

test('try parse help screen command', () => {
   
   let h: utilsTsx.helpLine = utilsTsx.parseCmd("[a1 a2] +5 cmt **")
 
   console.log( 'theCommand ', h.theCommand)// a1 a2
   console.log( 'argCount ', h.argCount) // 1
   console.log( 'description ', h.description) // cmt
   console.log( 'stars ', h.stars) // 2

   expect(h.theCommand).toBe('a1 a2')
   expect(h.argCount).toBe(5)
   expect(h.description).toBe('cmt')
   expect(h.stars).toBe(2)

   {
    let h: utilsTsx.helpLine = utilsTsx.parseCmd("[a1 a2]+5cmt**")
    expect(h.theCommand).toBe('a1 a2')
    expect(h.argCount).toBe(5)
    expect(h.description).toBe('cmt')
    expect(h.stars).toBe(2)
   }

   {
    let h: utilsTsx.helpLine = utilsTsx.parseCmd("[a1 a2]  +5   cmt   **")
    expect(h.theCommand).toBe('a1 a2')
    expect(h.argCount).toBe(5)
    expect(h.description).toBe('cmt')
    expect(h.stars).toBe(2)
   }
   {
    let h: utilsTsx.helpLine = utilsTsx.parseCmd("[a1 a2]   cmt   **")
    expect(h.theCommand).toBe('a1 a2')
    expect(h.argCount).toBe(0)
    expect(h.description).toBe('cmt')
    expect(h.stars).toBe(2)
   }
   {
    let h: utilsTsx.helpLine = utilsTsx.parseCmd("[a1 a2]  +5   cmt" )
    expect(h.theCommand).toBe('a1 a2')
    expect(h.argCount).toBe(5)
    expect(h.description).toBe('cmt')
    expect(h.stars).toBe(0)
   }

   {
    let h: utilsTsx.helpLine = utilsTsx.parseCmd("[a1 a2]cmt1 cmt2 cmt3 " )
    expect(h.theCommand).toBe('a1 a2')
    expect(h.argCount).toBe(0)
    expect(h.description).toBe('cmt1 cmt2 cmt3')
    expect(h.stars).toBe(0)
   }

});


// Copyright 2022 Alan Tracey Wootton
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
