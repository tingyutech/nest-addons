#!/bin/bash
set -eo pipefail
protoc \
  --ts_out=src/pb --ts_opt long_type_string \
  --ts_opt eslint_disable \
  --ts_opt enable_import_extensions \
  --proto_path=./proto \
    google/rpc/code.proto \
    google/rpc/error_details.proto \
    google/rpc/status.proto \
    google/protobuf/duration.proto \
    google/protobuf/any.proto