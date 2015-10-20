var async = require("async"),
  serialport = require("serialport"),
  SerialPort = serialport.SerialPort,
  os = require('os'),
// TODO: Make device selection way more clever
  device = os.type() === 'Darwin' ? "/dev/tty.usbserial-DA01ID01" : '/dev/ttyUSB0';


var usb = require('usb-detection');

usb.on('add', function (device) {
  console.log('add', device);
});

usb.find(function (err, devices) {
  var fasel = {
    locationId: 0,
    vendorId: 1027,
    productId: 24597,
    deviceName: 'FT231X USB UART',
    manufacturer: 'FTDI',
    serialNumber: 'DA01ID01',
    deviceAddress: 0
  };
  console.log('found', devices, err);
});

/*
 var bla = usb.getDeviceList();
 bla.forEach(function (dev) {
 if (dev.deviceDescriptor.idVendor == 0x0403 && dev.deviceDescriptor.idProduct == 0x6015) {
 var port_number = dev.portNumbers[0] - 1;
 }
 });

 */

var port = new SerialPort(
  device, {
    baudrate: 115200,
    databits: 8,
    stopbits: 1,
    parity: 'none',
    parser: serialport.parsers.readline('\n'),
    platformOptions: {
      vmin: 0
    }
  });

function parsePacket(packet) {
  console.log('SERIAL: ', packet.length, ' pieces of data in the package')
}

function makeParser(cb) {
  var lineBuffer = {timings: [], bits: [], empty: true};
  return function parseLine(line) {
    // TODO: track line numbers
    if (line.toLowerCase().indexOf('start') != -1) {
      return false;
    } else if (line.toLowerCase().indexOf('end') != -1) {
      if (!lineBuffer.empty) {
        cb(lineBuffer);
      }
      lineBuffer = {timings: [], bits: [], empty: true};
    } else {
      var arr = line.split(' ');
      if (arr.length > 2) {
        lineBuffer.bits.push(arr[1].trim());
        lineBuffer.timings.push(arr[2].trim());
        lineBuffer.empty = false;
      }
    }
  }
}


exports.start = function (onChange) {
  port.on("open", function (error) {
    if (error) {
      console.log('SERIAL: Failed to open port: ' + error);
      process.exit(23);
    } else {
      console.log('SERIAL: Port opened');
      port.on('data', makeParser(onChange));
    }
  });

  port.on('error', function (error) {
    console.log('SERIAL ERROR: ' + error);
  });
};

exports.send = function (data) {
  console.log("SERIAL: Sending data ...");
  var toSend = data.join(",");
  port.write("P" + toSend + ",S");
};

