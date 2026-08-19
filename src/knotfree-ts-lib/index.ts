// The instructions I got:

export * from './3d/Dns8Tree';
export * from './avatars/PubSubTopicAndSubscribers';
export * from './KnotTokenStack/httpClient';
export * from './test/testCrypto';

// I can't realistically export EVERYTHING.
// Am I supposed to? I ain't doin all that. No way.
// in real life I sync ALL the files with other projects 
// every 10 sec and that's that. 

// See ./sync.sh here

// 2. Export specific items or rename them if needed
// export { DefaultLogger as Logger } from './logger';

// 3. Export TypeScript types or interfaces explicitly 
export type { DnsResponse, DnsStatusCode } from './3d/DnsTypes';

// I suspect that this whole Node Package Manager is as useful as a 
// MAKE file or any of the other 20 ways I've seen people generate intractible link errors at scale.
// Give me a break. 