
![knotfree knot](/KnotFreeKnot256cropped.png)
 # knotfree.net

## What

This is the source code to the knotfree.net homepage. 
It is a React 'pwa' and can be served by any http server that serves a folder of static assest.

## Why

There is access to [mqtt5 style](https://github.com/awootton/mqtt5nano) iot things from the serial port, from the local next, worldwide over mqtt5 and worldwide in a web browser.

However, to use the end-to-end encryption requires code so this page will form small dashboards for thingss. (see the ```THINGS``` tab)

## How

Visit the 'ACCESS TOKEN' tab to get a free access token. Click on the 'THINGS' tab to access commands on your thing. 

To serve this locally simply navgate to the /build directory here and then start a server. eg.  
```python3 -m http.server```
will do it.

If you make changes simply type ```yarn build``` into a termnal. 

To run in develpment mode type ```yarn start```  and it will come up in your browser.


## Where

It's running at knotfree.net.

## When

2019 to 2022.

## Who 

Copyright 2022 Alan Tracey Wootton. See LICENSE.

#knotfree #iot #mqtt #mqtt5 #go #mqtt5nano
