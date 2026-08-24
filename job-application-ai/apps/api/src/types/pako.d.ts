declare module 'pako' {
  export interface InflateOptions {
    raw?: boolean;
    to?: 'string' | 'array' | 'typedarray' | 'uint8array';
  }

  export function inflate(data: Uint8Array | ArrayBuffer | Buffer, options?: InflateOptions): Uint8Array;
  export function inflateRaw(data: Uint8Array | ArrayBuffer | Buffer, options?: InflateOptions): Uint8Array;
}