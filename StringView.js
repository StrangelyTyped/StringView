(function(){
	"use strict";

	/*
		ReadString methods return a string with a byteLength property, just FYI
	*/

	var defaultEncoding = "UTF-8";
	var replacementChar = 0xFFFD;

	var createUtf8Char = function(charCode, arr){
		if(charCode < 0x80){
			//Treat ASCII differently since it doesn't begin with 0x80
			arr.push(charCode);
		}else{
			var limits = [0x7F, 0x07FF, 0xFFFF, 0x1FFFFF];
			var i = 0;
			while(true){
				i++;
				//
				if(i == limits.length){
					console.error("UTF-8 Write - attempted to encode illegally high code point - " + charCode);
					creatUTf8Char(replacementChar, arr);
					return;
				}
				if(charCode <= limits[i]){
					//We have enough bits in 'i+1' bytes to encode this character
					i += 1;

					var aByte = 0;
					var j;
					//add i bits of length indicator
					for(j = 0; j < i; j++){
						aByte <<= 1;
						aByte |= 1;
					}
					//Shift length indicator to MSB
					aByte <<= (8 - i);
					//Add 8 - (i  + 1) bits of code point to fill the first byte
					aByte |= (charCode >> (6 * (i - 1)));
					arr.push(aByte);
					//Fist byte already processed, start at 1 rather than 0
					for(j = 1; j < i; j++){
						//Continuation flag
						aByte = 0x80;
						//6 bits of code point
						aByte |= (charCode >> (6 * (i - (j + 1)))) & 0xBF;
						arr.push(aByte);
					}
					return;
				}
			}
		}
	};

	var createString = {
		"UTF-8": function(str){
			var arr = [];
			var i;
			for(i = 0; i < str.length; i++){
				createUtf8Char(str.charCodeAt(i), arr);
			}
			return arr;
		},
		"ASCII": function(str){
			var arr = [];
			var i, chr;
			for(i = 0; i < str.length; i++){
				chr = str.charCodeAt(i);
				if(chr > 255){
					chr = "?".charCodeAt(0);
				}
				arr.push(chr);
			}
			return arr;
		}
	};

	var utf8ReadChar = function(charStruct, buf, readPos, maxBytes){
		var firstByte = buf.getUint8(readPos);
		charStruct.bytesRead = 1;
		charStruct.charVal = 0;
		if(firstByte & 0x80){
			var numBytes = 0;
			var aByte = firstByte;
			while(aByte & 0x80){
				numBytes++;
				aByte <<= 1;
			}
			if(numBytes === 1){
				console.error("UTF-8 read - found continuation byte at beginning of character");
				charStruct.charVal = replacementChar;
				return;
			}
			if(numBytes > maxBytes){
				console.error("UTF-8 read - attempted to read " + numBytes + " byte character, " + (maxBytes - numBytes) + " bytes past end of buffer");
				charStruct.charVal = replacementChar;
				return;
			}
			//2 bytes means 3 bits reserved for UTF8 byte encoding, 5 bytes remaining for codepoint, and so on
			charStruct.charVal = firstByte & (0xFF >> (numBytes + 1));
			for(var i = 1; i < numBytes; i++){
				aByte = buf.getUint8(readPos + i);
				//0xC0 should isolate the continuation flag which should be 0x80
				if((aByte & 0xC0) !== 0x80){
					console.error("UTF-8 read - attempted to read " + numBytes + " byte character, found non-continuation at byte " + i);
					charStruct.charVal = replacementChar;
					//Wikipedia (awesomely reliable source of information /sarcasm) suggests
					// parsers should replace first byte of invalid sequence and continue
					charStruct.bytesRead = 1;
					return;
				}
				charStruct.charVal <<= 6;
				//0x3F is the mask to remove the continuation flag
				charStruct.charVal |= (aByte & 0x3F);

				if(i == 1){
					var rshift = (8 - (numBytes + 1)) - 1;
					if((charStruct.charVal >> rshift) === 0){
						console.error("UTF-8 read - found overlong encoding");
						charStruct.charVal = replacementChar;
						charStruct.bytesRead = 1;
						return;
					}
				}
				charStruct.bytesRead++;
			}
			if(charStruct.charVal > 0x10FFFF){
				console.error("UTF-8 read - found illegally high code point " + charStruct.charVal);
				charStruct.charVal = replacementChar;
				charStruct.bytesRead = 1;
				return;
			}

		}else{
			charStruct.charVal = firstByte;
		}
	};

	var readString = {
		"UTF-8": function(buf, byteOffset, bytesToRead){
			var nullTerm = (typeof bytesToRead === "undefined");
			var readPos = byteOffset || 0;
			if(!nullTerm && readPos + bytesToRead > buf.byteLength){
				throw new Error("Attempted to read " + ((readPos + bytesToRead) - buf.byteLength) + " bytes past end of buffer");
			}
			var str = "";
			//Horrible hack, but pass an object we can populate with the character and byte count
			//Passing in and overwriting should be slightly better than reallocating for each character
			var charStruct = {};
			while(readPos < buf.byteLength && (nullTerm || bytesToRead > (readPos - byteOffset))){
 				utf8ReadChar(charStruct, buf, readPos, nullTerm ? buf.byteLength - (readPos + byteOffset) : (bytesToRead - (readPos - byteOffset)));
 				readPos += charStruct.bytesRead;
 				if(nullTerm && !charStruct.charVal){
 					break;
 				}
 				str += String.fromCharCode(charStruct.charVal);
			}
			str.byteLength = readPos - byteOffset;
			return str;
		},
		"ASCII": function(buf, byteOffset, bytesToRead){
			var str = "";
			str.byteLength = 0;
			byteOffset = byteOffset || 0;
			var nullTerm = false;
			if(typeof bytesToRead === "undefined"){
				nullTerm = true;
				bytesToRead = buf.byteLength - buf.byteOffset;
			}
			var charCode;
			for(var i = 0; i < bytesToRead; i++){
				charCode = buf.getUint8(i + byteOffset);
				if(charCode === 0 && nullTerm){
					break;
				}
				str += String.fromCharCode(charCode);
				str.byteLength++;
			}
			return str;
		}
	};

	var checkEncoding = function(encoding){
		if(typeof encoding === "undefined"){
			encoding = defaultEncoding;
		}
		if(!createString.hasOwnProperty(encoding)){
			throw new Error("Unknown encoding '" + encoding + "'");
		}
		return encoding;
	};

	var stringByteLength = function(str, encoding){
		encoding = checkEncoding(encoding);	
		return createString[encoding](str).length;
	};

	Object.defineProperties(DataView.prototype, {
		getString: {
			value: function(byteOffset, byteLength, encoding){
				encoding = checkEncoding(encoding);
				if(!byteLength){
					byteLength = this.byteLength - byteOffset;
				}
				return readString[encoding](this, byteOffset, byteLength);
			}
		},
		setString: {
			value: function(byteOffset, value, encoding){
				encoding = checkEncoding(encoding);
				var arr = createString[encoding](value);
				var i;
				for(i = 0; i < arr.length && byteOffset + i < this.byteLength; i++){
					this.setUint8(byteOffset + i, arr[i]);
				}
				return i;
			}
		},
		getStringNT: {
			value: function(byteOffset, encoding){
				encoding = checkEncoding(encoding);
				return readString[encoding](this, byteOffset);
			}
		},
		setStringNT: {
			value: function(byteOffset, value, encoding){
				var bytesWritten = this.setString(byteOffset, value, encoding);
				if(byteOffset + bytesWritten >= this.byteLength){
					//Incomplete string write, or written up against end of buffer
					//Pull back 1 byte to put null term in
					bytesWritten -= 1;
				}
				this.setUint8(byteOffset + bytesWritten, 0);
				return bytesWritten + 1;
			}
		},
		stringByteLength: {
			value: stringByteLength
		}
	});
	Object.defineProperties(DataView, {
		stringByteLength: {
			value: stringByteLength
		},
		addStringCodec: {
			value: function(encoding, reader, writer){
				readString[encoding] = reader;
				createString[encoding] = writer;
			}
		}
	});
}());
