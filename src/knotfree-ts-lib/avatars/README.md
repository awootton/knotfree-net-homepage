Message types and destimations.

pubsub (PubSubTopicAndSubscribers) is ALWAYS one to many or many to many, and can be misued as one to one.

sub (PubSubSimple) Think of is as a web Server. is many to one or one to one but never one to many. It's a singleton.  There are never two receivers for that. It's many to ONE. It may send you a reply.

I get confused too. The teminology is confusing. 

Sources/sinks and channels

    iFrames
        a sink. 
        Should alwauy 'publish' a to:
            example: 
                GlbCreatedMessage - goes straight to a useEffect in MainWorldDisplay
                    which then stuffs it into the Aux system (and map)
                    and shoots a message over to reresh the frame drawing item. 


    The player.


        "testmain-vradd-in-frame" is an address where messages can be send.
        It will subscribe to collisions and stuff.

        all publush to testmain-vradd-in-frame should go to the frame
            eg all frames should know what to do with a prozimity alert.
            and a cash send lol.


        Player (app) should sub to general messages but don't expect them to last long.

#### messages: 

### in meteverse proto one

ShowingLeavesChanges  from  localTraverseTheTree in AppCanval
                        to AppCanvas that uses it to trim the demp list and to for groups and publish that as 

LoadingMessage -- the stupid "loading..." and "we good" messages.

pubsub.subscribe("DemoPropertiesChanges  it doesn't even send the list. Just just a notification

sub.subscribe(master + "-in-frame) to these get intercepted and sent to the iFrame
    btw we're getting rid fo the TLD's

// All the GLB drawing elements subscribe to this.
// 
sub.subscribe(master + "-redraw") I don't like this for anything. 

            -- they should just sunscribe directlt to the GLB directly

sub.publish(leafName+"-redraw",message.key) send by MainWorldDisplay when a glb change happens.

pubsub.publish<Map<string, BatchInfo>>("group2LeafListMap 

### In WorldsTest1

sub.subscribe("GlbCreatedMessage", (message: messageTypes.GlbMessage, err: Error|null) => {

sub.publsh ! none yet

If you are reading this from inside the metaverse-proto-one project ou probably think that's where it 
runs. But, it's just a library.
If you are reading it from inside testmain you think that'a where it runs. Close. Aftet all that's why we keep the service running at localhost:3010 and why we tunnel to it. Still wrong. 

The service on localhost:3010 exposes some assets in the public folder. It "serves" them and that's some lasy ass shit right there because it's NOT a server. 

What it does do, importanty, is "serve" all the static content in "build". This is a static site and that's where it is. 
In in prod we'll want to serve it some any of 10 cheap places that serve static sites and that we can use to forward our url to. 
knotfree.org can do it but it's not https and I'm getting OUT of that buiness. That's not why I'm here.

The the place that it runs is IN the player (metaverse-player-one) as an iFrame. Since it's being server by the debug loader it has breakpoints and all the source code. THAT'S the point.
The logs for this project can be seen in metaverse-proto-one. ! 

Because of the way we use testmain as a Swiss army knife there's likely to be for maybe five copies of that same card running in various I-frames inside Metaverse proto one.

Avatars:

I think all avatars I MAKE will be snowmen.

It's gonna be ugly.
What does an avatar need. This will be a dialog box for a cheapo avatar.

Passphrase. From the past phrase, we drive a public you and private to public key needs to be shown and copied.

Everybody gets to make up their own stupid name. It doesn't mean anything. It's better than the public kid which is the real name.

A color let people pick a color?

I'm not doing full on avatar creation. 

A face? Having a face is a lot of work, it's gonna be ugly as hell, don't wanna do it.



