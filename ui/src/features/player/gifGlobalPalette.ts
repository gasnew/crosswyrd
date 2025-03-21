import _ from 'lodash';
import quantize from 'quantize';

interface FrameType {
  colorTable: [number, number, number][];
}
export function buildGlobalPalette(frames: FrameType[]): number[][] {
  // Possibly thousands of unique colors
  const allColors = _.flatMap(frames, (frame) =>
    _.map(frame.colorTable, (color) => [color[0], color[1], color[2]])
  );

  // Quantize the palette
  const quantizedColors = _.uniqBy(
    quantize(allColors, 256).palette(),
    (color: number[]) => `r${color[0]}g${color[1]}b${color[2]}`
  );

  // Pad out the palette with random unique colors to get to 256
  let paddedPalette = quantizedColors;
  while (paddedPalette.length < 256) {
    paddedPalette = _.uniqBy(
      [
        ...quantizedColors,
        ..._.times(256 - quantizedColors.length, (index) => [
          _.random(0, 255),
          _.random(0, 255),
          _.random(0, 255),
        ]),
      ],
      (color: number[]) => `r${color[0]}g${color[1]}b${color[2]}`
    );
  }

  // We need to use the same sorting algorithm everywhere for the steganography
  // to work
  return _.sortBy(paddedPalette);
}

// Generate a new one of these from parsed frames with buildGlobalPalette.
export const GLOBAL_PALETTE = [
  [0, 119, 97],
  [100, 100, 96],
  [100, 108, 100],
  [100, 152, 144],
  [100, 156, 52],
  [100, 180, 172],
  [100, 188, 60],
  [100, 20, 4],
  [100, 228, 108],
  [100, 52, 220],
  [100, 92, 196],
  [102, 180, 223],
  [108, 112, 136],
  [108, 140, 132],
  [108, 199, 89],
  [108, 236, 108],
  [108, 236, 124],
  [108, 44, 180],
  [115, 206, 70],
  [116, 180, 212],
  [116, 188, 100],
  [116, 188, 228],
  [116, 196, 192],
  [116, 68, 164],
  [12, 156, 196],
  [12, 196, 36],
  [12, 4, 148],
  [12, 4, 36],
  [120, 132, 148],
  [120, 172, 180],
  [123, 205, 4],
  [124, 100, 140],
  [124, 172, 144],
  [124, 172, 52],
  [124, 20, 52],
  [124, 4, 236],
  [124, 44, 132],
  [124, 80, 200],
  [128, 156, 148],
  [131, 154, 254],
  [132, 100, 28],
  [132, 116, 204],
  [132, 180, 28],
  [132, 220, 204],
  [132, 244, 236],
  [132, 28, 220],
  [132, 4, 156],
  [136, 28, 104],
  [137, 18, 115],
  [140, 100, 188],
  [140, 180, 84],
  [140, 188, 156],
  [140, 196, 60],
  [140, 214, 218],
  [140, 44, 4],
  [148, 124, 60],
  [148, 212, 208],
  [148, 84, 220],
  [156, 167, 87],
  [156, 180, 228],
  [156, 220, 212],
  [156, 52, 4],
  [156, 68, 100],
  [156, 68, 12],
  [157, 200, 253],
  [159, 165, 63],
  [16, 39, 213],
  [164, 124, 68],
  [164, 20, 124],
  [164, 224, 32],
  [164, 32, 224],
  [164, 92, 52],
  [168, 83, 120],
  [172, 116, 140],
  [172, 124, 44],
  [172, 148, 204],
  [172, 196, 196],
  [172, 96, 116],
  [180, 180, 76],
  [180, 204, 156],
  [180, 212, 188],
  [180, 228, 220],
  [180, 52, 180],
  [180, 52, 52],
  [180, 52, 84],
  [184, 116, 44],
  [184, 160, 112],
  [184, 176, 188],
  [186, 2, 130],
  [188, 128, 32],
  [188, 76, 212],
  [19, 72, 20],
  [191, 163, 134],
  [192, 205, 64],
  [196, 100, 124],
  [196, 204, 116],
  [196, 228, 228],
  [196, 236, 84],
  [196, 244, 140],
  [196, 36, 12],
  [196, 60, 212],
  [199, 50, 158],
  [20, 160, 132],
  [20, 20, 20],
  [20, 4, 212],
  [20, 44, 100],
  [204, 116, 140],
  [204, 12, 20],
  [204, 124, 172],
  [204, 16, 64],
  [204, 204, 196],
  [204, 44, 20],
  [204, 60, 144],
  [204, 84, 196],
  [212, 16, 168],
  [212, 204, 148],
  [212, 236, 236],
  [212, 244, 4],
  [212, 252, 60],
  [212, 92, 20],
  [220, 116, 92],
  [220, 12, 92],
  [220, 124, 12],
  [220, 140, 68],
  [220, 172, 236],
  [220, 180, 140],
  [220, 196, 60],
  [220, 236, 116],
  [220, 44, 68],
  [221, 194, 202],
  [223, 64, 74],
  [226, 190, 26],
  [228, 108, 28],
  [228, 12, 244],
  [228, 152, 136],
  [228, 188, 124],
  [228, 228, 220],
  [228, 244, 244],
  [228, 60, 180],
  [23, 141, 210],
  [234, 201, 69],
  [236, 100, 220],
  [236, 164, 68],
  [236, 188, 116],
  [236, 20, 220],
  [236, 244, 244],
  [236, 52, 188],
  [237, 92, 154],
  [24, 84, 122],
  [240, 176, 36],
  [240, 241, 152],
  [244, 140, 176],
  [244, 196, 204],
  [244, 208, 144],
  [244, 212, 236],
  [244, 236, 196],
  [244, 244, 116],
  [244, 244, 208],
  [244, 252, 252],
  [244, 76, 228],
  [244, 84, 28],
  [248, 160, 116],
  [248, 176, 36],
  [248, 216, 176],
  [252, 11, 206],
  [252, 132, 108],
  [252, 140, 100],
  [252, 188, 228],
  [252, 204, 204],
  [252, 228, 188],
  [252, 236, 220],
  [252, 244, 228],
  [252, 244, 236],
  [252, 252, 236],
  [252, 252, 248],
  [252, 44, 124],
  [28, 108, 208],
  [28, 156, 4],
  [28, 236, 188],
  [28, 28, 28],
  [28, 44, 180],
  [28, 64, 64],
  [28, 68, 36],
  [28, 84, 204],
  [3, 246, 73],
  [32, 244, 68],
  [36, 108, 108],
  [36, 188, 116],
  [39, 159, 162],
  [4, 116, 148],
  [4, 244, 124],
  [4, 252, 252],
  [4, 4, 4],
  [4, 44, 116],
  [4, 44, 220],
  [40, 40, 40],
  [40, 72, 20],
  [42, 35, 187],
  [44, 100, 44],
  [44, 124, 20],
  [44, 140, 60],
  [44, 148, 136],
  [44, 184, 236],
  [44, 20, 108],
  [44, 236, 140],
  [44, 68, 148],
  [44, 84, 236],
  [48, 240, 220],
  [51, 71, 110],
  [52, 112, 28],
  [52, 128, 40],
  [52, 212, 196],
  [52, 28, 204],
  [52, 52, 52],
  [52, 68, 60],
  [52, 68, 92],
  [53, 4, 77],
  [55, 27, 164],
  [56, 52, 124],
  [60, 140, 68],
  [60, 172, 220],
  [60, 228, 76],
  [60, 60, 60],
  [61, 29, 106],
  [68, 128, 124],
  [68, 128, 16],
  [68, 148, 140],
  [68, 20, 68],
  [68, 44, 44],
  [71, 171, 170],
  [72, 80, 80],
  [74, 80, 99],
  [76, 36, 244],
  [76, 4, 188],
  [77, 40, 133],
  [80, 12, 48],
  [80, 184, 172],
  [80, 188, 176],
  [84, 100, 100],
  [84, 100, 244],
  [84, 100, 4],
  [84, 108, 60],
  [84, 72, 36],
  [88, 156, 164],
  [88, 168, 160],
  [88, 180, 180],
  [88, 224, 36],
  [88, 228, 192],
  [92, 132, 180],
  [92, 140, 100],
  [92, 196, 212],
  [92, 56, 152],
  [92, 92, 92],
  [95, 95, 96],
  [99, 109, 133],
  [99, 194, 132],
];
