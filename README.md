# :sailboat: raft-node
A NodeJS  implementation of RAFT Consensus Algorithm
This is mostly for self learning as of now. I saw several implementations in Go, and wondered how difficult/messy (or maybe not) would it be to write a distributed consensus module in NodeJS (Yes, I'm looking at you single threaded event loop!).

I intend to keep making iterative improvements to this over time. 

Feel free to go through the code, and maybe even submit a PR ;)

## :hammer: Tools used:
- NodeJS
- TypeScript
- gRPC
- Protobuf
- Jest (For tests)

## :clipboard: Future Tasks
- Integrate a database for log persistence
- Containerize
- Provide APIs to use this module easily, instead of the basic driver program we have right now

## :books: Resources
- RAFT Paper - https://raft.github.io/raft.pdf
- Amazing blog on implementation (Golang Based) - https://eli.thegreenplace.net/2020/implementing-raft-part-0-introduction/

