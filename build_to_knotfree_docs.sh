#!/bin/bash

# run this is a terminal window
# it will build the project, copy it to docs/
# in the knot free project
# because, for now, we embed these static assets in the knotfree container. 

yarn build

rsync -a ./build/ ../knotfreeiot/docs/   

aws s3 cp ./build s3://gotoherestatic/knotfree.net/ --recursive

