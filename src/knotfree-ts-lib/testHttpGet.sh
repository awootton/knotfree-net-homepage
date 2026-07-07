

# rewrite samplehttpget.txt so that it has \n instead of newlines, and \r\n instead of carriage returns, and then send it to localhost:3010 using netcat
# sed -E 's/\r/\r/g; s/\n/\\n/g' samplehttpget.txt > samplehttpget_escaped.txt

# rewrite samplehttpget.txt so that \r becomes ascii 13, and \n becomes ascii 10 send it to samplehttpget_escaped.txt
# open in hex editor says this is not working, so try using sed to replace \r with \x0d and \n with \x0a
#sed -E 's/\r/\x0d/g; s/\n/\x0a/g' samplehttpget.txt > samplehttpget_escaped.bin
#

npx tsx src/addTensAndThirteensToFile.ts

nc -N 5 localhost 3010 < samplehttpget_escaped.bin  

cat samplehttpget_escaped.bin | nc localhost 3010

# HTTP/1.1 400 Bad Request nc localhost 3010 < samplehttpget.txt

# the full version note the \n instead of \r\n
# GET /dummyFile.txt HTTP/1.1\nConnection: keep-alive\r\nUpgrade-Insecure-Requests: 1\r\nCookie: _ga=GA1.1.1297819563.1780249232; _ga_FV6JRWPQN2=GS2.1.s1780249232$o1$g0$t1780249240$j52$l0$h0\r\nPragma: no-cache\r\nCache-Control: no-cache\r\nUser-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36\r\nAccept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7\r\nAccept-Encoding: gzip, deflate\r\nAccept-Language: en-US,en;q=0.9\r\nHost: testmain-0n0u0e5p_vr.knotfree.io\r\n\r\n
 
 