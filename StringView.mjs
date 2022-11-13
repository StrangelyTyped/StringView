const encodingUtf8 = "UTF-8";
const encodingAscii = "ASCII";

const defaultEncoding = encodingUtf8;
const replacementChar = 0xFFFD;

const createUtf8Char = function(charCode, arr){
	if(charCode < 0x80){
		//Treat ASCII differently since it doesn't begin with 0x80
		arr.push(charCode);
	}else{
		const limits = [0x7F, 0x07FF, 0xFFFF, 0x1FFFFF];
		let i = 0;
		while(true){
			i++;
			
			if(i === limits.length){
				console.error("UTF-8 Write - attempted to encode illegally high code point - " + charCode);
				createUtf8Char(replacementChar, arr);
				return;
			}
			if(charCode <= limits[i]){
				//We have enough bits in 'i+1' bytes to encode this character
				i += 1;

				let aByte = 0;
				let j;
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


const utf8ReadChar = function(charStruct, buf, readPos, maxBytes){
	const firstByte = buf.getUint8(readPos);
	charStruct.bytesRead = 1;
	charStruct.charVal = 0;
	if(firstByte & 0x80){
		let numBytes = 0;
		let aByte = firstByte;
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
		for(let i = 1; i < numBytes; i++){
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

			if(i === 1){
				const rshift = (8 - (numBytes + 1)) - 1;
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

const writeStringUtf8 = function(str){
	const arr = [];
	for(let i = 0; i < str.length; i++){
		createUtf8Char(str.charCodeAt(i), arr);
	}
	return arr;
};

const writeStringAscii = function(str){
	const arr = [];
	for(let i = 0; i < str.length; i++){
		let chr = str.charCodeAt(i);
		if(chr > 255){
			chr = "?".charCodeAt(0);
		}
		arr.push(chr);
	}
	return arr;
};

const readStringUtf8 = function(buf, byteOffset, bytesToRead, terminator){
	const nullTerm = (typeof bytesToRead === "undefined");
	let readPos = byteOffset || 0;
	if(!nullTerm && readPos + bytesToRead > buf.byteLength){
		throw new Error("Attempted to read " + ((readPos + bytesToRead) - buf.byteLength) + " bytes past end of buffer");
	}
	const str = [];
	const charStruct = {};
	while(readPos < buf.byteLength && (nullTerm || bytesToRead > (readPos - byteOffset))){
		utf8ReadChar(charStruct, buf, readPos, nullTerm ? buf.byteLength - (readPos + byteOffset) : (bytesToRead - (readPos - byteOffset)));
		readPos += charStruct.bytesRead;
		if(nullTerm && charStruct.charVal === terminator){
			break;
		}
		str.push(String.fromCharCode(charStruct.charVal));
	}
	return {
		str: str.join(""),
		byteLength: (readPos - byteOffset)
	};
};

const readStringAscii = function(buf, byteOffset, bytesToRead, terminator){
	const str = [];
	let byteLength = 0;
	byteOffset = byteOffset || 0;
	let nullTerm = false;
	if(typeof bytesToRead === "undefined"){
		nullTerm = true;
		bytesToRead = buf.byteLength - buf.byteOffset;
	}
	for(let i = 0; i < bytesToRead; i++){
		const charCode = buf.getUint8(i + byteOffset);
		byteLength++;
		if(nullTerm && charCode === terminator){
			break;
		}
		str.push(String.fromCharCode(charCode));
	}
	return {
		str: str.join(""), 
		byteLength: byteLength
	};
};

class StringView {

	#readString = new Map([
		[encodingAscii, readStringAscii],
		[encodingUtf8, readStringUtf8],
	]);
	#writeString = new Map([
		[encodingAscii, writeStringAscii],
		[encodingUtf8, writeStringUtf8],
	]);

	#checkEncoding(encoding){
		if(typeof encoding === "undefined"){
			encoding = defaultEncoding;
		}
		if(!this.#writeString.has(encoding)){
			throw new Error("Unknown string encoding '" + encoding + "'");
		}
		return encoding;
	}

	addStringCodec(encoding, reader, writer){
		this.#readString.put(encoding, reader);
		this.#writeString.put(encoding, writer);
	}

	stringByteLength(str, encoding){
		encoding = this.#checkEncoding(encoding);	
		return this.#writeString.get(encoding)(str).length;
	}

	getString(dataView, byteOffset, byteLength, encoding){
		return this.getStringData(dataView, byteOffset, byteLength, encoding).str;
	}

	getStringData(dataView, byteOffset, byteLength, encoding){
		encoding = this.#checkEncoding(encoding);
		if(!byteLength){
			byteLength = dataView.byteLength - byteOffset;
		}
		return this.#readString.get(encoding)(dataView, byteOffset, byteLength);
	}

	getStringNT(dataView, byteOffset, encoding, terminator = 0) {
		return this.getStringDataNT(dataView, byteOffset, encoding, terminator).str;
	}

	getStringDataNT(dataView, byteOffset, encoding, terminator = 0) {
		encoding = this.#checkEncoding(encoding);
		return this.#readString.get(encoding)(dataView, byteOffset, undefined, terminator);
	}
	
	setString(dataView, byteOffset, value, encoding){
		encoding = this.#checkEncoding(encoding);
		const arr = this.#writeString.get(encoding)(value);
		let i;
		for(i = 0; i < arr.length && byteOffset + i < dataView.byteLength; i++){
			dataView.setUint8(byteOffset + i, arr[i]);
		}
		return i;
	}
	
	setStringNT(dataView, byteOffset, value, encoding){
		let bytesWritten = this.setString(dataView, byteOffset, value, encoding);
		if(byteOffset + bytesWritten >= dataView.byteLength){
			//Incomplete string write, or written up against end of buffer
			//Pull back 1 byte to put null term in
			bytesWritten -= 1;
		}
		dataView.setUint8(byteOffset + bytesWritten, 0);
		return bytesWritten + 1;
	}
}

export default new StringView();
