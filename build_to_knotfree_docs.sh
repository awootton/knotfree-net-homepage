#!/bin/bash



# run this is a terminal window
# it will build the project, copy it to docs/_sites2
# in the knot free project

yarn build

rsync -a ./build/ ../knotfreeiot/docs/   

aws s3 cp ./build s3://gotoherestatic/knotfree.net/ --recursive

