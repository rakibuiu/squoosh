import { h, Component } from 'preact';
import { bind, bitmapToImageData } from '../../lib/util';
import * as style from './style.scss';
import Output from '../output';
import Options from '../options';

import * as mozJpeg from '../../codecs/mozjpeg/encoder';
import { Options as MozJPEGOptions } from '../../codecs/mozjpeg/encoder';

const ENCODERS = [
  mozJpeg
];

interface EncoderOptions {
  [mozJpeg.type]: MozJPEGOptions;
}

type EncoderType = keyof EncoderOptions;

interface SourceImage {
  file: File;
  img: ImageBitmap;
  data: ImageData;
}

interface EncodedImage<K extends EncoderType> {
  type: K;
  options: EncoderOptions[K];
  data?: ImageBitmap;
  counter: number;
  loading: boolean;
}

type Props = {};

interface State {
  source?: SourceImage;
  images: [
    EncodedImage<EncoderType> | 'source',
    EncodedImage<EncoderType> | 'source'
  ];
  loading: boolean;
  error?: string;
}

export default class App extends Component<Props, State> {
  state: State = {
    loading: false,
    images: [
      'source',
      { type: mozJpeg.type, options: { quality: 7 }, loading: false, counter: 0 }
    ]
  };

  constructor() {
    super();
    // In development, persist application state across hot reloads:
    if (process.env.NODE_ENV === 'development') {
      this.setState(window.STATE);
      let oldCDU = this.componentDidUpdate;
      this.componentDidUpdate = (props, state) => {
        if (oldCDU) oldCDU.call(this, props, state);
        window.STATE = this.state;
      };
    }
  }

  setImageTypeAndOptions(index: number, type?: ImageType, options: any = {}) {
    const images = this.state.images.slice();
    const image = images[index];
    images[index] = {
      ...image,
      type: type || image.type,
      options,
      loading: false,
      counter: image.counter + 1
    };
    this.setState({ images });
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { source, images } = this.state;

    for (let i = 0; i < images.length; i++) {
      if (source !== prevState.source || images[i] !== prevState.images[i]) {
        this.updateImage(i);
      }
    }
  }

  @bind
  async onFileChange(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    this.setState({ loading: true });
    try {
      const img = await createImageBitmap(file);
      // compute the corresponding ImageData once since it only changes when the file changes:
      const data = await bitmapToImageData(img);
      this.setState({
        source: { data, img, file },
        error: undefined,
        loading: false
      });
    } catch (err) {
      this.setState({ error: 'IMAGE_INVALID', loading: false });
    }
  }

  async updateImage(index: number) {
    const { source, images } = this.state;
    if (!source) return;
    let image = images[index];
    if (image === 'source') return;

    // Each time we trigger an async encode, the ID changes.
    const id = ++image.counter;
    image.loading = true;
    this.setState({ });
    const result = await this.updateCompressedImage(source.data, image.type, image.options);
    image = this.state.images[index];
    // If another encode has been initiated since we started, ignore this one.
    if (image === 'source' || image.counter !== id) return;
    image.data = result;
    image.loading = false;
    this.setState({ });
  }

  async updateCompressedImage(sourceData: ImageData, type: ImageType, options: CodecOptions) {
    try {
      const encoder = await new ENCODERS[type]() as Encoder;
      const compressedData = await encoder.encode(sourceData, options);
      let imageData;
      if (compressedData instanceof ArrayBuffer) {
        imageData = new Blob([compressedData], {
          type: ENCODERS[type].mimeType || ''
        });
      } else {
        imageData = compressedData;
      }
      return await createImageBitmap(imageData);
    } catch (err) {
      console.error(`Encoding error (type=${type}): ${err}`);
    }
  }

  render({ }: Props, { loading, error, images, sourceData }: State) {
    for (let image of images) {
      if (image && image.loading) loading = true;
    }
    const leftImg = images[0] ? images[0].data : sourceData;
    const rightImg = images[1] ? images[1].data : sourceData;

    return (
      <div id="app" class={style.app}>
        {(leftImg && rightImg) ? (
          <Output leftImg={leftImg} rightImg={rightImg} />
        ) : (
          <div class={style.welcome}>
            <h1>Select an image</h1>
            <input type="file" onChange={this.onFileChange} />
          </div>
        )}
        {images.map((image, index: number) => (
          <span class={index ? style.rightLabel : style.leftLabel}>{ENCODER_NAMES[image.type]}</span>
        ))}
        {images.map((image, index: number) => (
          <Options
            class={index ? style.rightOptions : style.leftOptions}
            name={index ? 'Right' : 'Left'}
            type={image.type}
            options={image.options}
            onTypeChange={this.setImageTypeAndOptions.bind(this, index)}
            onOptionsChange={this.setImageTypeAndOptions.bind(this, index, null)}
          />
        ))}
        {loading && <span style={{ position: 'fixed', top: 0, left: 0 }}>Loading...</span>}
        {error && <span style={{ position: 'fixed', top: 0, left: 0 }}>Error: {error}</span>}
      </div>
    );
  }
}
