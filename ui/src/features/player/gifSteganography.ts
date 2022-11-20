import _ from 'lodash';

// Functions adapted from
// https://github.com/CalderWhite/gif-msg/blob/master/gif_msg.py

export function encodePalette(
  bytes: Uint8Array,
  palette: number[][]
): number[][] {
  /// Hide the bytes by specifically ordering the colors in
  //the palette.

  // Pad the bytes to 128
  const paddedBytes = new Uint8Array(128);
  console.log(palette);
  console.log(bytes);
  _.times(paddedBytes.length, (index) => {
    paddedBytes[index] = index < bytes.length ? bytes[index] : 0;
  });

  const encodedSize = 256;
  let encoded: number[][] = [];

  // the half of the colours which have the larger amount of possible indicies
  // one small + one large = len(palette)
  // if the palette is 256 elements long, then small + large = 1 byte
  let larges: number[] = [];
  let pairs: number[][] = [];
  _.forEach(paddedBytes, (byte, index) => {
    const large = Math.min(byte, encodedSize - index - 1);
    const small = byte - large;

    pairs.push([small, large]);
    larges.push(large);
    encoded.splice(small, 0, palette[palette.length - (index + 1)]);
  });
  _.forEach(pairs, (pair) => console.log(pair[0] + pair[1], pair[0], pair[1]));

  // the larges need the most amount of indicies to choose from, so they are
  // inserted last and in reverse order
  _.times(paddedBytes.length, (index) => {
    const reverseIndex = paddedBytes.length - 1 - index;
    encoded.splice(larges[reverseIndex], 0, palette[reverseIndex]);
  });

  console.log(encoded);
  return encoded;
}

export function decodePalette(palette: number[][]): Uint8Array {
  // Find the data hidden within the order of the given gct.
  // lodash's sort function is lexographic (meaning it takes into consideration
  // the different values within each nested tuple in their order or priority)
  // this way there is always a winner when sorting the array
  // the only edge case where there would be an issue is if there were two colours
  // of the same value, which would be redundant and thus has been eliminated
  // from consideration
  const paletteCopy = _.map(palette, (color) => [...color]);
  const indexRef: number[][] = _.sortBy(paletteCopy);

  console.log(palette);
  // there will be half as many values as there are in the array since each time
  // you use up an index, one of the lower indexes must be used to complete the byte
  // (think of the arithmetic summation formula proof, if that helps)
  // https://www.purplemath.com/modules/series6.htm
  const decodedCount = 128;
  const decoded: Uint8Array = new Uint8Array(decodedCount);

  let pairs: (number | undefined)[][] = [];
  // first do the initial values
  _.times(decodedCount, (index) => {
    const refIndex = paletteCopy.indexOf(indexRef[index]);
    decoded[index] = refIndex;

    paletteCopy.splice(refIndex, 1);
    pairs.push([refIndex, undefined]);
  });

  // second do the values that are added on to the initial values to get them up to a byte
  _.forEach(_.range(decodedCount, indexRef.length), (index) => {
    const refIndex = paletteCopy.indexOf(indexRef[index]);
    decoded[decodedCount + decodedCount - 1 - index] += refIndex;
    console.log(
      refIndex,
      decodedCount,
      index,
      decodedCount + decodedCount - 1 - index
    );

    paletteCopy.splice(refIndex, 1);
    //pairs[decodedCount - 1 - index][1] = refIndex;
  });
  //for i in range(decoded_count, len(index_ref)):
  //  index = encoded_palette.index(index_ref[i])
  //  decoded[decoded_count-1-i] += index

  //  encoded_palette.pop(index)
  _.forEach(pairs, (pair) =>
    console.log((pair[0] || 0) + (pair[1] || 0), pair[0], pair[1])
  );

  console.log(decoded);
  return decoded;
}
