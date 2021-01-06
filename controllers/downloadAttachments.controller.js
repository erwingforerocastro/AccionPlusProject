const inspect = require('util').inspect;
const fs      = require('fs');
const base64  = require('base64-stream');
const Imap    = require('imap');
const MailListener = require("mail-listener");
const readline = require('readline');

const { User } = require('../config/downloadAttachments.config.json')
const FOLDER = "INBOX";

const generalData = {
  password: User.password,
  host: 'Outlook.Office365.com',
  port: 993
}

const imap    = new Imap({
  user: User.email,
  ...generalData,
  tls: true
  //,debug: function(msg){console.log('imap:', msg);}
});

// const mailListener = new MailListener({
//   username: "imap-username",
//   ...generalData,
//   secure: true, // use secure connection
//   mailbox: FOLDER, // mailbox to monitor
//   markSeen: true, // all fetched email willbe marked as seen and not fetched next time
//   fetchUnreadOnStart: true // use it only if you want to get all unread email on lib start. Default is `false`
// });

// mailListener.start(); //Iniciar a escuchar

/**
 * 
 * @param {String} thing texto
 */
const toUpper = (thing) => { return thing && thing.toUpperCase ? thing.toUpperCase() : thing; }

/**
 * 
 * @param {Object} struct contiene array con la informacion de cada adjunto
 * @param {Array} attachments adjuntos
 */
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
  let filename = attachment.params.name;
  let encoding = attachment.encoding;
  
  return function (msg, seqno) {

    let prefix = '(#' + seqno + ') ';

    msg.on('body', function(stream, info) {

      //Cree una secuencia de escritura para que podamos guardar el archivo adjunto;
      console.log(prefix + 'Guardando el adjunto como archivo', filename, info);
      let writeStream = fs.createWriteStream(filename);

      writeStream.on('finish', function() {
        console.log(prefix + 'Se termino de guardar el archivo %s', filename);
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
      console.log(prefix + 'Adjunto terminado %s', filename);
    });

  };
}

/**
 * 
 * @param {String} folder carpeta donde se encuentran los mensajes
 * @param {Function} callback funcion que se ejecutar al abrir la carpeta
 */
const openFolder = (folder, callback) =>{
  imap.openBox(folder, true, callback);
}

const processMessages = () => {
  openFolder(FOLDER, function(err, box) {
    if (err) throw err;

    let f = imap.seq.fetch("1:20", {
      bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)"],
      struct: true
    });

    f.on("message", function(msg, seqno) {

      console.log("Message #%d", seqno);
      let prefix = "(#" + seqno + ") ";

      msg.on("body", function(stream, info) {
        let buffer = "";
        stream.on("data", function(chunk) {
          buffer += chunk.toString("utf8");
        });

        stream.once("end", function() {
          console.log(prefix + "Encabezado analizado: %s", Imap.parseHeader(buffer));
        });
      });

      msg.once("attributes", function(attrs) {
        let attachments = findAttachmentParts(attrs.struct);
        console.log(prefix + "Tiene archivos adjuntos: %d", attachments.length);

        for (let i = 0, len = attachments.length; i < len; ++i) {
          let attachment = attachments[i];
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
            prefix + "Recuperando archivo adjunto %s",
            attachment.params.name
          );

          let f = imap.fetch(attrs.uid, {
            //do not use imap.seq.fetch here
            bodies: [attachment.partID],
            struct: true
          });

          //build function to process attachment message
          f.on("message", function(attachment){
            let filename = attachment.params.name;
            let encoding = attachment.encoding;
            
            return function (msg, seqno) {

              let prefix = '(#' + seqno + ') ';

              msg.on('body', function(stream, info) {

                //Cree una secuencia de escritura para que podamos guardar el archivo adjunto;
                console.log(prefix + 'Guardando el adjunto como archivo', filename, info);
                let writeStream = fs.createWriteStream(filename);

                writeStream.on('finish', function() {
                  console.log(prefix + 'Se termino de guardar el archivo %s', filename);
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
                console.log(prefix + 'Adjunto terminado %s', filename);
              });

            };
          });
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

// mailListener.on("mail:arrived", function(id){
//   console.log("Nuevo correo:" + id);
  
// });

