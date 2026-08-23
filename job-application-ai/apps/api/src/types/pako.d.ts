declare module 'pako' {
  export function inflateRawSync(data: Uint8Array | Buffer): Uint8Array;
  export function inflateSync(data: Uint8Array | Buffer): Uint8Array;
}
