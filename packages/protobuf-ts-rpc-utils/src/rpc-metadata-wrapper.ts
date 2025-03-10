import { RpcMetadata } from '@protobuf-ts/runtime-rpc'

export class RpcMetadataWrapper {
  public constructor(private inner: RpcMetadata) {}

  public unwrap() {
    return this.inner
  }

  public last(key: string) {
    const value = this.inner[key]
    if (!value) {
      return null
    }
    if (Array.isArray(value)) {
      return value[value.length - 1]
    }
    return value
  }

  public set(key: string, value: string) {
    this.inner[key] = value
  }

  public add(key: string, value: string) {
    if (this.inner[key] === undefined) {
      this.inner[key] = value
    } else if (Array.isArray(this.inner[key])) {
      this.inner[key].push(value)
    } else {
      this.inner[key] = [this.inner[key], value]
    }
  }

  public remove(key: string) {
    delete this.inner[key]
  }

  public clear() {
    this.inner = {}
  }
}
