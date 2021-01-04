const inspect = require('util').inspect;
const fs      = require('fs');
const base64  = require('base64-stream');
const Imap    = require('imap');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Email:', (res) => {
  console.log(`Hello ${res}!`);

  rl.close();
});

const imap    = new Imap({
  user: '',
  password: '',
  host: 'Outlook.Office365.com',
  port: 993,
  tls: true
  //,debug: function(msg){console.log('imap:', msg);}
});

const toUpper = (thing) => { thing && thing.toUpperCase ? thing.toUpperCase() : thing;}

const findAttachmentParts = (struct, attachments) => {
  attachments = attachments ||  [];
  for (var i = 0, len = struct.length, r; i < len; ++i) {
    if (Array.isArray(struct[i])) {
      findAttachmentParts(struct[i], attachments);
    } else {
      if (struct[i].disposition && ['INLINE', 'ATTACHMENT'].indexOf(toUpper(struct[i].disposition.type)) > -1) {
        attachments.push(struct[i]);
      }
    }
  }
  return attachments;
}

const buildAttMessageFunction = (attachment) => {
  var filename = attachment.params.name;
  var encoding = attachment.encoding;

  return function (msg, seqno) {
    var prefix = '(#' + seqno + ') ';
    msg.on('body', function(stream, info) {
      //Create a write stream so that we can stream the attachment to file;
      console.log(prefix + 'Streaming this attachment to file', filename, info);
      var writeStream = fs.createWriteStream(filename);
      writeStream.on('finish', function() {
        console.log(prefix + 'Done writing to file %s', filename);
      });

      //stream.pipe(writeStream); this would write base64 data to the file.
      //so we decode during streaming using 
      if (toUpper(encoding) === 'BASE64') {
        //the stream is base64 encoded, so here the stream is decode on the fly and piped to the write stream (file)
        stream.pipe(base64.decode()).pipe(writeStream);
      } else  {
        //here we have none or some other decoding streamed directly to the file which renders it useless probably
        stream.pipe(writeStream);
      }
    });

    msg.once('end', function() {
      console.log(prefix + 'Finished attachment %s', filename);
    });
  };
}

const openFolder = (folder, callback) =>{
  imap.openBox(folder, true, callback);
}

const processMessages = () => {
  openFolder("INBOX", function(err, box) {
    if (err) throw err;

    var f = imap.seq.fetch("1:10", {
      bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)"],
      struct: true
    });

    f.on("message", function(msg, seqno) {

      console.log("Message #%d", seqno);
      var prefix = "(#" + seqno + ") ";

      msg.on("body", function(stream, info) {
        var buffer = "";
        stream.on("data", function(chunk) {
          buffer += chunk.toString("utf8");
        });

        stream.once("end", function() {
          console.log(prefix + "Parsed header: %s", Imap.parseHeader(buffer));
        });
      });

      msg.once("attributes", function(attrs) {
        var attachments = findAttachmentParts(attrs.struct);
        console.log(prefix + "Has attachments: %d", attachments.length);

        for (var i = 0, len = attachments.length; i < len; ++i) {
          var attachment = attachments[i];
          /*This is how each attachment looks like {
              partID: '2',
              type: 'application',
              subtype: 'octet-stream',
              params: { name: 'file-name.ext' },
              id: null,
              description: null,
              encoding: 'BASE64',
              size: 44952,
              md5: null,
              disposition: { type: 'ATTACHMENT', params: { filename: 'file-name.ext' } },
              language: null
            }
          */
          console.log(
            prefix + "Fetching attachment %s",
            attachment.params.name
          );
          var f = imap.fetch(attrs.uid, {
            //do not use imap.seq.fetch here
            bodies: [attachment.partID],
            struct: true
          });
          //build function to process attachment message
          f.on("message", buildAttMessageFunction(attachment));
        }
      });

      msg.once("end", function() {
        console.log(prefix + "Finished email");
      });

    });

    f.once("error", function(err) {
      console.log("Fetch error: " + err);
    });

    f.once("end", function() {
      console.log("Done fetching all messages!");
      imap.end();
    });

  });
}

imap.once("ready", function() {
    processMessages();
});

imap.once("error", function(err) {
  console.log(err);
});

imap.once("end", function() {
  console.log("Connection ended");
});

imap.connect();