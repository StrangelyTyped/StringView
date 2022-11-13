StringView
==========

JavaScript DataView helper for reading/writing strings.

## API
Provides the following methods for reading and writing strings from a native JS [DataView](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView) object.

```javascript
import StringView from "StringView"
StringView.getString(dataView, byteOffset, byteLength = <remaining length>, encoding = "UTF-8")
StringView.getStringData(dataView, byteOffset, byteLength = <remaining length>, encoding = "UTF-8")
StringView.getStringNT(dataView, byteOffset, encoding = "UTF-8", terminator = '\0')
StringView.getStringDataNT(dataView, byteOffset, encoding = "UTF-8", terminator = '\0')
StringView.setString(dataView, byteOffset, value, encoding = "UTF-8")
StringView.setStringNT(dataView, byteOffset, value, encoding = "UTF-8")
StringView.stringByteLength(dataView, str, encoding = "UTF-8")
StringView.addStringCodec(encoding, readerFunc, writerFunc)
```
All methods assume a default encoding of UTF-8 unless an encoding is specified.

### Methods
#### `StringView.getString(dataView, byteOffset, byteLength = <remaining length>, encoding = "UTF-8")`
Returns the string represented by this DataView's buffer starting at `byteOffset`. The string will be made from `byteLength` bytes (defaulting to the length of the buffer minus `byteOffset` if not specified) interpreted using the specified encoding. 

This method will throw an Error if the provided `byteOffset` and `byteLength` would cause access past the end of the buffer.

If `encoding` is provided to `getString` then `byteLength` must also be provided.
The `byteLength` defaults to the length of the buffer minus the `byteOffset` if not provided.

#### `StringView.getStringData(dataView, byteOffset, byteLength = <remaining length>, encoding - "UTF-8")`
Functionally identical to the method `getString`, but returns an object with two properties: `str`, and `byteLength` - the `str` property is the read string, and the `byteLength` property indicates the number of bytes that were consumed while reading it. Note that if decoding issues are encountered this byte length value may differ from a subsequently calculated byte length for the returned string.

#### `StringView.getStringNT(dataView, byteOffset, encoding = "UTF-8", terminator = '\0')`
Returns the string represented by this DataView's buffer starting at `byteOffset` and reading until a null byte (or the numeric char code specified as `terminator`) or the end of the buffer is encountered, interpreted using the specified encoding.

#### `StringView.getStringDataNT(dataView, byteOffset, encoding = "UTF-8", terminator = '\0')`
Functionally identical to the method `getStringNT`, but returns an object with two properties: `str`, and `byteLength` - the `str` property is the read string (**not including** null byte), and the `byteLength` property indicates the number of bytes that were consumed while reading it (**including** the null byte). Note that if decoding issues are encountered this byte length value may differ from a subsequently calculated byte length for the returned string.

#### `StringView.setString(dataView, byteOffset, value, encoding = "UTF-8")`
Writes the provided value into this DataView's buffer starting at `byteOffset`. The string will be encoded using the specified encoding. This function will return the number of bytes written to the string, which may be less than the number required to completely represent the string if `byteOffset` is too close to the end of the buffer. Note that this function may write a partial character at the end of the string in the case of truncation.

#### `StringView.setStringNT(dataView, byteOffset, value, encoding = "UTF-8")`
Writes the provided value into this DataView's buffer starting at `byteOffset`. The string will be encoded using the specified encoding and terminated with a null byte. This function will return the number of bytes written to the string, which may be less than the number required to completely represent the string if `byteOffset` is too close to the end of the buffer. If the string was truncated it will still be terminated by a null byte. The null byte will be included the the return value. Note that this function may write a partial character at the end of the string in the case of truncation. Note that unlike getStringNT this method does not accept a custom terminator argument - if a custom terminator is required then use `setString` with the desired terminator appended to the string.

#### `StringView.stringByteLength(str, encoding = "UTF-8")`
Calculates and returns the number of bytes required to completely represent the provided string using the specified encoding.

#### `StringView.addStringCodec(encoding, readerFunc, writerFunc)`
Adds support for encoding and decoding the specified encoding to all DataView instances. The `readerFunc` and `writerFunc` arguments should be functions adhering to the following specification. 

##### readerFunc
The reader function should accept the following arguments:

* `buf` - the DataView object to operate on
* `byteOffset` - the offset in the data buffer to begin reading
* `bytesToRead` - the number of bytes to read, or undefined for terminated strings.
* `terminator` - the char code for the terminator character (if bytesToRead is undefined)

The reader function should return an object with two properties - `str` being the decoded string, and `byteLength` representing the number of bytes consumed in reading the string.
The string should not include the terminator character, but the character should be included in the byteLength value.

##### writerFunc
The writer function should accept a single argument - the string to encode, and must return a JavaScript array of unsigned byte values representing that string in the specified encoding.

## Supported Encodings
The following encodings are supported by default:

* UTF-8
* ASCII

Support for additional encodings can be added using the `StringView.addStringCodec` method.


## Invalid UTF-8 Characters
Any invalid UTF-8 characters encountered are replaced with one or more U+FFFD characters (the 'replacement character').

## Examples
Please see test.mjs for usage examples.