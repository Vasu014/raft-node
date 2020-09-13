const shelljs = require('shelljs');

shelljs.mkdir('-p', ['./src/grpcjs/proto']);
/**
 * Invoke commands to 
 * 1. Generate Javascript gRPC Client-Server files
 * 2. Typings for the same
 * .proto files.
 * 
 * For Reference: https://github.com/agreatfool/grpc_tools_node_protoc_ts/tree/master/examples
 */
shelljs.exec('npx grpc_tools_node_protoc '
    + '--js_out=import_style=commonjs,binary:./src/grpcjs/proto '
    + '--grpc_out=generate_package_definition:./src/grpcjs/proto '
    + '-I  ./proto '
    + 'proto/*.proto');

shelljs.exec('npx grpc_tools_node_protoc '
    + ' --ts_out=generate_package_definition:./src/grpcjs/proto '
    + ' -I ./proto '
    + ' proto/*.proto');
