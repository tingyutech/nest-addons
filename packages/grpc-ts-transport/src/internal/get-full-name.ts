import { MethodInfo } from '@protobuf-ts/runtime-rpc'

export function getFullName(method: MethodInfo) {
  return `${method.service.typeName}/${method.name}`
}
