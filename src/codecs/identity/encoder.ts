import { Encoder } from '../codec';

export type EncodeOptions = {};

export default class IdentityEncoder implements Encoder<EncodeOptions> {
  static mimeType = null;

  async encode(data: ImageData, options: EncodeOptions): Promise<ImageData> {
    return data;
  }
}
