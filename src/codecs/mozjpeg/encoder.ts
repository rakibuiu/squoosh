import Encoder from './encoder.worker';

export interface Options {
  quality?: number;
}

export const name = 'MozJPEG';
export const type = name;
export const mimeType = 'image/jpeg';
export function encode(data: ImageData, options: Options = {}) {
  return new Encoder().encode(data, options);
}
