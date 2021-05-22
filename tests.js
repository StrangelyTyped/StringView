"use strict";
const t = require("tap");
require("./StringView.js");

var replacementChar = 0xFFFD;

var runBasicUtf8ReadTest = function(strOrBufferToTest, testString, test, offset){
	offset = offset || 0;
	var buf = strOrBufferToTest;
	if(!(buf instanceof Buffer)){
		buf = new Buffer(buf);
	}
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	test.equal(view.getString(offset, Buffer.byteLength(testString)), testString);
};

var runBasicUtf8WriteTest = function(test, strToTest, offset, bufferLen, doNt){
	offset = offset || 0;
	var ab = new ArrayBuffer(bufferLen || (offset + Buffer.byteLength(strToTest)));
	var buf = new DataView(ab);
	buf[doNt ? "setStringNT" : "setString"](offset, strToTest);
	var abuf = new Buffer(new Uint8Array(ab));
	var end = offset + Buffer.byteLength(strToTest);
	if(doNt){
		for(var i = offset; i < abuf.length; i++){
			if(!abuf[i]){
				end = i;
				break;
			}
		}
	}
	test.equal(abuf.toString("utf8", offset, end), strToTest);
};

t.test('readUtf8WithAscii', function(test){
	var testString = "This is a test!";
	runBasicUtf8ReadTest(testString, testString, test);
	test.end();
});

t.test('readUtf8', function(test){
	var testString = "My 'something' cost £42 while my 'other!' cost €45 ";
	runBasicUtf8ReadTest(testString, testString, test);
	test.end();
});

t.test('testOffset', function(test){
	var testStr = "What? £45!";
	var offset = 5;
	var buf = new Buffer(Buffer.byteLength(testStr) + offset);
	buf.fill(65);
	buf.write(testStr, offset);
	runBasicUtf8ReadTest(buf, testStr, test, offset);
	test.end();
});

t.test('testLongBuffer', function(test){
	var testStr = "What? £45!";
	var offset = 5;
	var buf = new Buffer(Buffer.byteLength(testStr) + offset);
	buf.fill(65);
	buf.write(testStr, 0);
	runBasicUtf8ReadTest(buf, testStr, test);
	test.end();
});

var testMalformedUtf8 = function(test, buf){
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	var testStr = String.fromCharCode.apply(String, [65, 66, 67, 32, replacementChar, replacementChar, replacementChar, replacementChar, 68, 69]);
	test.equal(view.getString(0, buf.length), testStr);
};

t.test('readOverlongUtf8', function(test){
	var buf = new Buffer([65, 66, 67, 32, 0xF0, 0x82, 0x82, 0xAC, 68, 69]);
	testMalformedUtf8(test, buf);
	test.end();
});

t.test('readMalformedLongCharUtf8', function(test){
	var buf = new Buffer([65, 66, 67, 32, 0xF8, 0x82, 0x82, 0xAC, 68, 69]);
	testMalformedUtf8(test, buf);
	test.end();
});

t.test('readMalformedShortCharUtf8', function(test){
	var buf = new Buffer([65, 66, 67, 32, 0xE0, 0x82, 0x82, 0xAC, 68, 69]);
	testMalformedUtf8(test, buf);
	test.end();
});

t.test('readHighCodepointUtf8', function(test){
	var buf = new Buffer([65, 66, 67, 32, 0xF7, 0xBF, 0xBF, 0xBF, 68, 69]);
	testMalformedUtf8(test, buf);
	test.end();
});

t.test('readUTf8NullTerm', function(test){
	var testStr = "What? £45!";
	var buf = new Buffer(Buffer.byteLength(testStr) + 1);
	buf.fill(0);
	buf.write(testStr, 0);
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	test.equal(view.getStringNT(0), testStr);
	test.end();
});

t.test('readAsciiNullTerm', function(test){
	var testStr = "What? $45!";
	var buf = new Buffer(Buffer.byteLength(testStr, "ascii") + 1);
	buf.fill(0);
	buf.write(testStr, 0, "ascii");
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	test.equal(view.getStringNT(0, "ASCII"), testStr);
	test.end();
});

t.test('readUTf8CustomTerm', function(test){
	var testStr = "What? $45!";
	var buf = new Buffer(Buffer.byteLength(testStr) + 1);
	buf.fill(0);
	buf.write(testStr, 0, "utf-8");
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	test.equal(view.getStringNT(0, "UTF-8", " ".charCodeAt(0)), "What?");
	test.end();
});

t.test('readAsciiCustomTerm', function(test){
	var testStr = "What? $45!";
	var buf = new Buffer(Buffer.byteLength(testStr, "ascii") + 1);
	buf.fill(0);
	buf.write(testStr, 0, "ascii");
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	test.equal(view.getStringNT(0, "ASCII", " ".charCodeAt(0)), "What?");
	test.end();
});


t.test('readUTF8Data', function(test){
	var testStr = "What? £45!";
	var buf = new Buffer(Buffer.byteLength(testStr));
	buf.fill(0);
	buf.write(testStr, 0);
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	var retData = view.getStringData(0, buf.length);
	test.equal(retData.str, testStr);
	test.equal(retData.byteLength, buf.length);
	test.end();
});

t.test('readASCIIData', function(test){
	var testStr = "What? $45!";
	var buf = new Buffer(Buffer.byteLength(testStr, "ascii"));
	buf.fill(0);
	buf.write(testStr, 0, "ascii");
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	var retData = view.getStringData(0, buf.length, "ASCII");
	test.equal(retData.str, testStr);
	test.equal(retData.byteLength, buf.length);
	test.end();
});

t.test('readUTf8NullTermData', function(test){
	var testStr = "What? £45!";
	var buf = new Buffer(Buffer.byteLength(testStr) + 1);
	buf.fill(0);
	buf.write(testStr, 0);
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	var retData = view.getStringDataNT(0);
	test.equal(retData.str, testStr);
	test.equal(retData.byteLength, buf.length);
	test.end();
});

t.test('readAsciiNullTermData', function(test){
	var testStr = "What? $45!";
	var buf = new Buffer(Buffer.byteLength(testStr, "ascii") + 1);
	buf.fill(0);
	buf.write(testStr, 0, "ascii");
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	var retData = view.getStringDataNT(0, "ASCII");
	test.equal(retData.str, testStr);
	test.equal(retData.byteLength, buf.length);
	test.end();
});

t.test('byteLength', function(test){
	var testStrs = ["Ascii String","What? £45! No, €45.","£ @ €"];
	testStrs.forEach(function(val){
		test.equal(DataView.stringByteLength(val), Buffer.byteLength(val));
	});
	test.end();
});

t.test('readAscii', function(test){
	var testStr = "What? $45!";
	var buf = new Buffer(testStr, "ascii");
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	test.equal(view.getString(0, buf.length, "ASCII"), testStr);
	test.end();
});

t.test('readAsciiWithUtf8', function(test){
	var testStr = "What? £45!";
	var buf = new Buffer(testStr);
	var abuf = new Uint8Array(buf);
	var view = new DataView(abuf.buffer);
	test.notEqual(view.getString(0, buf.length, "ASCII"), testStr);
	test.end();
});

t.test('writeUtf8AndAscii', function(test){
	var strs = ["Basic Ascii!", "Expensive UTF-8 - £4", "€5 - very £ expensive UTF-8"];
	strs.forEach(function(val){
		runBasicUtf8WriteTest(test, val);
	});
	test.end();
});

t.test('writeOffset', function(test){
	runBasicUtf8WriteTest(test, "What? £45!", 5);
	test.end();
});

t.test('writeLongBuffer', function(test){
	runBasicUtf8WriteTest(test, "What? £45!", 5, 100);
	test.end();
});

t.test('writeLongBufferNT', function(test){
	runBasicUtf8WriteTest(test, "What? £45!", 5, 100, true);
	test.end();
});

t.test('writeReturnVal', function(test){
	var testStr = "That's a lot of money / tests";
	var testStrLen = Buffer.byteLength(testStr);
	
	var ab1 = new ArrayBuffer(100);
	var buf1 = new DataView(ab1);
	var bytesWritten1 = buf1.setString(0, testStr);
	test.equal(bytesWritten1, testStrLen);

	var bufLen = 5;
	var ab2 = new ArrayBuffer(bufLen);
	var buf2 = new DataView(ab2);
	var bytesWritten2 = buf2.setString(0, testStr);
	test.equal(bytesWritten2, bufLen);

	var offset = 2;
	var bytesWritten3 = buf2.setString(offset, testStr);	
	test.equal(bytesWritten3, bufLen - offset);

	test.end();
});

t.test('writeReturnValNT', function(test){
	var testStr = "That's a lot of money / tests";
	var testStrLen = Buffer.byteLength(testStr) + 1;
	
	var ab1 = new ArrayBuffer(100);
	var buf1 = new DataView(ab1);
	var bytesWritten1 = buf1.setStringNT(0, testStr);
	test.equal(bytesWritten1, testStrLen);

	var bufLen = 5;
	var ab2 = new ArrayBuffer(bufLen);
	var buf2 = new DataView(ab2);
	var bytesWritten2 = buf2.setStringNT(0, testStr);
	test.equal(bytesWritten2, bufLen);

	var offset = 2;
	var bytesWritten3 = buf2.setStringNT(offset, testStr);	
	test.equal(bytesWritten3, bufLen - offset);

	test.end();
});

t.test('writeNullTermByte', function(test){
	var testStr = "ABCDEFG";
	
	var ab1 = new ArrayBuffer(Buffer.byteLength(testStr) + 1);
	var buf1 = new DataView(ab1);
	buf1.setStringNT(0, testStr);
	var abuf1 = new Buffer(new Uint8Array(ab1));
	test.equal(abuf1[abuf1.length - 2], "G".charCodeAt(0));
	test.equal(abuf1[abuf1.length - 1], 0);

	var ab2 = new ArrayBuffer(5);
	var buf2 = new DataView(ab2);
	buf2.setStringNT(0, testStr);
	var abuf2 = new Buffer(new Uint8Array(ab2));
	test.equal(abuf2[abuf2.length - 2], "D".charCodeAt(0));
	test.equal(abuf2[abuf2.length - 1], 0);

	test.end();
});
