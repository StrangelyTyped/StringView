import StringView from './StringView.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

var replacementChar = 0xFFFD;

var runBasicUtf8ReadTest = function(strOrBufferToTest, testString, offset){
	offset = offset || 0;
	var buf = strOrBufferToTest;
	if(!(buf instanceof Buffer)){
		buf = Buffer.from(buf);
	}
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	assert.equal(StringView.getString(view, offset, Buffer.byteLength(testString)), testString);
};

var runBasicUtf8WriteTest = function(strToTest, offset, bufferLen, doNt){
	offset = offset || 0;
	var ab = new ArrayBuffer(bufferLen || (offset + Buffer.byteLength(strToTest)));
	var buf = new DataView(ab);
	StringView[doNt ? "setStringNT" : "setString"](buf, offset, strToTest);
	var abuf = Buffer.from(new Uint8Array(ab));
	var end = offset + Buffer.byteLength(strToTest);
	if(doNt){
		for(var i = offset; i < abuf.length; i++){
			if(!abuf[i]){
				end = i;
				break;
			}
		}
	}
	assert.equal(abuf.toString("utf8", offset, end), strToTest);
};

test('readUtf8WithAscii', function(t){
	const testString = "This is a test!";
	runBasicUtf8ReadTest(testString, testString);
});

test('readUtf8', function(){
	var testString = "My 'something' cost £42 while my 'other!' cost €45 ";
	runBasicUtf8ReadTest(testString, testString);
});

test('testOffset', function(){
	var testStr = "What? £45!";
	var offset = 5;
	var buf = Buffer.alloc(Buffer.byteLength(testStr) + offset);
	buf.fill(65);
	buf.write(testStr, offset);
	runBasicUtf8ReadTest(buf, testStr, offset);
});

test('testLongBuffer', function(){
	var testStr = "What? £45!";
	var offset = 5;
	var buf = Buffer.alloc(Buffer.byteLength(testStr) + offset);
	buf.fill(65);
	buf.write(testStr, 0);
	runBasicUtf8ReadTest(buf, testStr);
});

var testMalformedUtf8 = function(buf){
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	var testStr = String.fromCharCode.apply(String, [65, 66, 67, 32, replacementChar, replacementChar, replacementChar, replacementChar, 68, 69]);
	assert.equal(StringView.getString(view, 0, buf.length), testStr);
};

test('readOverlongUtf8', function(){
	var buf = Buffer.from([65, 66, 67, 32, 0xF0, 0x82, 0x82, 0xAC, 68, 69]);
	testMalformedUtf8(buf);
});

test('readMalformedLongCharUtf8', function(){
	var buf = Buffer.from([65, 66, 67, 32, 0xF8, 0x82, 0x82, 0xAC, 68, 69]);
	testMalformedUtf8(buf);
});

test('readMalformedShortCharUtf8', function(){
	var buf = Buffer.from([65, 66, 67, 32, 0xE0, 0x82, 0x82, 0xAC, 68, 69]);
	testMalformedUtf8(buf);
});

test('readHighCodepointUtf8', function(){
	var buf = Buffer.from([65, 66, 67, 32, 0xF7, 0xBF, 0xBF, 0xBF, 68, 69]);
	testMalformedUtf8(buf);
});

test('readUTf8NullTerm', function(){
	var testStr = "What? £45!";
	var buf = Buffer.alloc(Buffer.byteLength(testStr) + 1);
	buf.fill(0);
	buf.write(testStr, 0);
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	assert.equal(StringView.getStringNT(view, 0), testStr);
});

test('readAsciiNullTerm', function(){
	var testStr = "What? $45!";
	var buf = Buffer.alloc(Buffer.byteLength(testStr, "ascii") + 1);
	buf.fill(0);
	buf.write(testStr, 0, "ascii");
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	assert.equal(StringView.getStringNT(view, 0, "ASCII"), testStr);
	
});

test('readUTf8CustomTerm', function(){
	var testStr = "What? $45!";
	var buf = Buffer.alloc(Buffer.byteLength(testStr) + 1);
	buf.fill(0);
	buf.write(testStr, 0, "utf-8");
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	assert.equal(StringView.getStringNT(view, 0, "UTF-8", " ".charCodeAt(0)), "What?");
	
});

test('readAsciiCustomTerm', function(){
	var testStr = "What? $45!";
	var buf = Buffer.alloc(Buffer.byteLength(testStr, "ascii") + 1);
	buf.fill(0);
	buf.write(testStr, 0, "ascii");
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	assert.equal(StringView.getStringNT(view, 0, "ASCII", " ".charCodeAt(0)), "What?");
	
});


test('readUTF8Data', function(){
	var testStr = "What? £45!";
	var buf = Buffer.alloc(Buffer.byteLength(testStr));
	buf.fill(0);
	buf.write(testStr, 0);
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	var retData = StringView.getStringData(view, 0, buf.length);
	assert.equal(retData.str, testStr);
	assert.equal(retData.byteLength, buf.length);
	
});

test('readASCIIData', function(){
	var testStr = "What? $45!";
	var buf = Buffer.alloc(Buffer.byteLength(testStr, "ascii"));
	buf.fill(0);
	buf.write(testStr, 0, "ascii");
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	var retData = StringView.getStringData(view, 0, buf.length, "ASCII");
	assert.equal(retData.str, testStr);
	assert.equal(retData.byteLength, buf.length);
	
});

test('readUTf8NullTermData', function(){
	var testStr = "What? £45!";
	var buf = Buffer.alloc(Buffer.byteLength(testStr) + 1);
	buf.fill(0);
	buf.write(testStr, 0);
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	var retData = StringView.getStringDataNT(view, 0);
	assert.equal(retData.str, testStr);
	assert.equal(retData.byteLength, buf.length);
	
});

test('readAsciiNullTermData', function(){
	var testStr = "What? $45!";
	var buf = Buffer.alloc(Buffer.byteLength(testStr, "ascii") + 1);
	buf.fill(0);
	buf.write(testStr, 0, "ascii");
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	var retData = StringView.getStringDataNT(view, 0, "ASCII");
	assert.equal(retData.str, testStr);
	assert.equal(retData.byteLength, buf.length);
	
});

test('byteLength', function(){
	var testStrs = ["Ascii String","What? £45! No, €45.","£ @ €"];
	testStrs.forEach(function(val){
		assert.equal(StringView.stringByteLength(val), Buffer.byteLength(val));
	});
	
});

test('readAscii', function(){
	var testStr = "What? $45!";
	var buf = Buffer.from(testStr, "ascii");
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	assert.equal(StringView.getString(view, 0, buf.length, "ASCII"), testStr);
	
});

test('readAsciiWithUtf8', function(){
	var testStr = "What? £45!";
	var buf = Buffer.from(testStr);
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	assert.notEqual(StringView.getString(view, 0, buf.length, "ASCII"), testStr);
	
});

test('writeUtf8AndAscii', function(){
	var strs = ["Basic Ascii!", "Expensive UTF-8 - £4", "€5 - very £ expensive UTF-8"];
	strs.forEach(function(val){
		runBasicUtf8WriteTest(val);
	});
	
});

test('writeOffset', function(){
	runBasicUtf8WriteTest("What? £45!", 5);
	
});

test('writeLongBuffer', function(){
	runBasicUtf8WriteTest("What? £45!", 5, 100);
	
});

test('writeLongBufferNT', function(){
	runBasicUtf8WriteTest("What? £45!", 5, 100, true);
	
});

test('writeReturnVal', function(){
	var testStr = "That's a lot of money / tests";
	var testStrLen = Buffer.byteLength(testStr);
	
	var ab1 = new ArrayBuffer(100);
	var buf1 = new DataView(ab1);
	var bytesWritten1 = StringView.setString(buf1, 0, testStr);
	assert.equal(bytesWritten1, testStrLen);

	var bufLen = 5;
	var ab2 = new ArrayBuffer(bufLen);
	var buf2 = new DataView(ab2);
	var bytesWritten2 = StringView.setString(buf2, 0, testStr);
	assert.equal(bytesWritten2, bufLen);

	var offset = 2;
	var bytesWritten3 = StringView.setString(buf2, offset, testStr);	
	assert.equal(bytesWritten3, bufLen - offset);

	
});

test('writeReturnValNT', function(){
	var testStr = "That's a lot of money / tests";
	var testStrLen = Buffer.byteLength(testStr) + 1;
	
	var ab1 = new ArrayBuffer(100);
	var buf1 = new DataView(ab1);
	var bytesWritten1 = StringView.setStringNT(buf1, 0, testStr);
	assert.equal(bytesWritten1, testStrLen);

	var bufLen = 5;
	var ab2 = new ArrayBuffer(bufLen);
	var buf2 = new DataView(ab2);
	var bytesWritten2 = StringView.setStringNT(buf2, 0, testStr);
	assert.equal(bytesWritten2, bufLen);

	var offset = 2;
	var bytesWritten3 = StringView.setStringNT(buf2, offset, testStr);	
	assert.equal(bytesWritten3, bufLen - offset);

	
});

test('writeNullTermByte', function(){
	var testStr = "ABCDEFG";
	
	var ab1 = new ArrayBuffer(Buffer.byteLength(testStr) + 1);
	var buf1 = new DataView(ab1);
	StringView.setStringNT(buf1, 0, testStr);
	var abuf1 = Buffer.from(new Uint8Array(ab1));
	assert.equal(abuf1[abuf1.length - 2], "G".charCodeAt(0));
	assert.equal(abuf1[abuf1.length - 1], 0);

	var ab2 = new ArrayBuffer(5);
	var buf2 = new DataView(ab2);
	StringView.setStringNT(buf2, 0, testStr);
	var abuf2 = Buffer.from(new Uint8Array(ab2));
	assert.equal(abuf2[abuf2.length - 2], "D".charCodeAt(0));
	assert.equal(abuf2[abuf2.length - 1], 0);

	
});
