StringView
==========

JavaScript DataView extension for reading/writing strings.

## API
Adds the following methods to DataView:

```javascript
var dataview = new DataView(...);
dataview.getString(byteOffset, optional byteLength, optional encoding)
dataview.getStringNT(byteOffset, optional encoding)
dataview.setString(byteOffset, value, optional encoding)
dataview.setStringNT(byteOffset, value, optional encoding)
dataview.stringByteLength(str, optional encoding) // instance method
DataView.stringByteLength(str, optional encoding) // Static method
DataView.addStringCodec(encoding, decoder, encoder) //Static method
```
All methods assume a default encoding of UTF-8 unless an encoding is specified.

### Instance Methods
####`dataview.getString(byteOffset, optional byteLength, optional encoding)`
Returns the string represented by this DataView's buffer starting at `byteOffset`. The string will be made from `byteLength` bytes (defaulting to the length of the buffer minus `byteOffset` if not specified) interpreted using the specified encoding. The returned string will have a property `byteLength` representing the number of bytes actually consumed in constructing the string.

This method will throw an Error if the provided `byteOffset` and `byteLength` would cause access past the end of the buffer.

#### `dataview.getStringNT(byteOffset, optional encoding)`
Returns the string represented by this DataView's buffer starting at `byteOffset` and reading until a null byte or the end of the buffer is encountered, interpreted using the specified encoding. The returned string will have a property `byteLength` representing the number of bytes actually consumed in constructing the string. The `byteLength` will include the null byte but the returned string will not.

#### `dataview.setString(byteOffset, value, optional encoding)`
Writes the provided value into this DataView's buffer starting at `byteOffset`. The string will be encoded using the specified encoding. This function will return the number of bytes written to the string, which may be less than the number required to completely represent the string if `byteOffset` is too close to the end of the buffer. Note that this function may write a partial character at the end of the string in the case of truncation.

#### `dataview.setStringNT(byteOffset, value, encoding)`
Writes the provided value into this DataView's buffer starting at `byteOffset`. The string will be encoded using the specified encoding and terminated with a null byte. This function will return the number of bytes written to the string, which may be less than the number required to completely represent the string if `byteOffset` is too close to the end of the buffer. If the string was truncated it will still be terminated by a null byte. The null byte will be included the the return value. Note that this function may write a partial character at the end of the string in the case of truncation.

#### `dataview.stringByteLength(str, optional encoding)`
Calculates and returns the number of bytes required to completely represent the provided string using the specified encoding.

### Static Methods
#### `DataView.stringByteLength(str, optional encoding)`
Calculates and returns the number of bytes required to completely represent the provided string using the specified encoding.

#### `DataView.addStringCodec(encoding, decoder, encoder)`
Adds support for encoding and decoding the specified encoding to all DataView instances. The `decoder` and `encoder` arguments should be functions adhering to the following specification. 

##### Decoder
The decoder function should accept the following arguments:

* `buf` - the DataView object to operate on
* `byteOffset` - the offset in the data buffer to begin reading
* `bytesToRead` - the number of bytes to read, or undefined for null terminated strings.

The decoder function should return the decoded string, and attach `byteLength` property to that string representing the number of bytes consumed in reading the string.

##### Encoder
The encoder function should accept a single argument - the string to encode, and must return a JavaScript array of unsigned byte values representing that string in the specified encoding.

If `encoding` is provided to `getString` then `byteLength` must also be provided.
The `byteLength` defaults to the length of the buffer minus the `byteOffset` if not provided.

The strings returned from `getString` and `getStringNT` have a property 'byteLength' indicating how many bytes were consumed in the process of reading the string.

## Supported Encodings
The following encodings are supported by default:

* UTF-8
* ASCII

Support for additional encodings can be added using the `DataView.addStringCodec` method.

## Compatibility
This script is suitable for running in any JavaScript environment (browser / Node.JS / etc) which supports DataView.

## Invalid UTF-8 Characters
Any invalid UTF-8 characters encountered are replaced with one or more U+FFFD characters (the 'replacement character').

## Examples
Please see tests.js for usage examples.

## Tests
Tests are written using NodeUnit, you may need to `npm install -g nodeunit` in order to run the `npm test` command.