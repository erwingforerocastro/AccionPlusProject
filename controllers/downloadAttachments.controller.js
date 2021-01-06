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

// /**
//  * 
//  * @param {String} folder carpeta donde se encuentran los mensajes
//  * @param {Function} callback funcion que se ejecutar al abrir la carpeta
//  */
// const openFolder = (folder, callback) =>{
//   imap.openBox(folder, true, callback);
// }

// const processMessages = () => {
//   openFolder(FOLDER, function(err, box) {
//     if (err) throw err;

//     let f = imap.seq.fetch("1:20", {
//       bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)"],
//       struct: true
//     });

//     f.on("message", function(msg, seqno) {

//       console.log("Message #%d", seqno);
//       let prefix = "(#" + seqno + ") ";

//       msg.on("body", function(stream, info) {
//         let buffer = "";
//         stream.on("data", function(chunk) {
//           buffer += chunk.toString("utf8");
//         });

//         stream.once("end", function() {
//           console.log(prefix + "Encabezado analizado: %s", Imap.parseHeader(buffer));
//         });
//       });

//       msg.once("attributes", function(attrs) {
//         let attachments = findAttachmentParts(attrs.struct);
//         console.log(prefix + "Tiene archivos adjuntos: %d", attachments.length);

//         for (let i = 0, len = attachments.length; i < len; ++i) {
//           let attachment = attachments[i];
//           /*This is how each attachment looks like {
//               partID: '2',
//               type: 'application',
//               subtype: 'octet-stream',
//               params: { name: 'file-name.ext' },
//               id: null,
//               description: null,
//               encoding: 'BASE64',
//               size: 44952,
//               md5: null,
//               disposition: { type: 'ATTACHMENT', params: { filename: 'file-name.ext' } },
//               language: null
//             }
//           */
//           console.log(
//             prefix + "Recuperando archivo adjunto %s",
//             attachment.params.name
//           );

//           let f = imap.fetch(attrs.uid, {
//             //do not use imap.seq.fetch here
//             bodies: [attachment.partID],
//             struct: true
//           });

//           //build function to process attachment message
//           f.on("message", buildAttMessageFunction(attachment));
//         }
//       });

//       msg.once("end", function() {
//         console.log(prefix + "Finished email");
//       });

//     });

//     f.once("error", function(err) {
//       console.log("Fetch error: " + err);
//     });

//     f.once("end", function() {
//       console.log("Done fetching all messages!");
//       imap.end();
//     });

//   });
// }

// imap.once("ready", function() {
//     processMessages();
// });

// imap.once("error", function(err) {
//   console.log(err);
// });

// imap.once("end", function() {
//   console.log("Connection ended");
// });

// imap.connect();

// // mailListener.on("mail:arrived", function(id){
// //   console.log("Nuevo correo:" + id);
  
// // });

// const fs = require('fs')
// const base64 = require('base64-stream')
// const Imap = require('imap')

// const imap = new Imap({
//   user: 'XXX@126.com',
//   password: 'XXXXX',
//   host: 'imap.126.com',
//   port: 993,
//   tls: true /*,
//   debug: (msg) => {console.log('imap:', msg);} */
// });

// function toUpper(thing) { return thing && thing.toUpperCase ? thing.toUpperCase() : thing }

// function findAttachmentParts(struct, attachments) {
//   attachments = attachments ||  []
//   struct.forEach((i) => {
//     if (Array.isArray(i)) findAttachmentParts(i, attachments)
//     else if (i.disposition && ['INLINE', 'ATTACHMENT'].indexOf(toUpper(i.disposition.type)) > -1) {
//       attachments.push(i)
//     }
//   })
//   return attachments
// }

imap.once('ready', () => {
  // A4 EXAMINE "INBOX"
  imap.openBox('INBOX', true, (err, box) => { 
    if (err) throw err;
    // A5 FETCH 1:3 (UID FLAGS INTERNALDATE BODYSTRUCTURE BODY.PEEK[HEADER.FIELDS (SUBJECT DATE)])
    const f = imap.seq.fetch('1:20', {
      bodies: ['HEADER.FIELDS (SUBJECT)'],
      struct: true  // BODYSTRUCTURE
    }) 
    f.on('message', (msg, seqno) => {
      console.log('Message #%d', seqno)
      const prefix = `(#${seqno})`
      var header = null
      msg.on('body', (stream, info) => {
        var buffer = ''
        stream.on('data', (chunk) => { buffer += chunk.toString('utf8') });
        stream.once('end', () => { header = Imap.parseHeader(buffer) })
      });

      msg.once('attributes', (attrs) => {
        const attachments = findAttachmentParts(attrs.struct);
        console.log(`${prefix} uid=${attrs.uid} Has attachments: ${attachments.length}`);
        attachments.forEach((attachment) => {
        /* 
          RFC2184 MIME Parameter Value and Encoded Word Extensions
                  4.Parameter Value Character Set and Language Information
          RFC2231 Obsoletes: 2184
          {
            partID: "2",
            type: "image",
            subtype: "jpeg",
            params: {
    X         "name":"________20.jpg",
              "x-apple-part-url":"8C33222D-8ED9-4B10-B05D-0E028DEDA92A"
            },
            id: null,
            description: null,
            encoding: "base64",
            size: 351314,
            md5: null,
            disposition: {
              type: "inline",
              params: {
    V           "filename*":"GB2312''%B2%E2%CA%D4%B8%BD%BC%FE%D2%BB%5F.jpg"
              }
            },
            language: null
          }   */            
          console.log(`${prefix} Fetching attachment ${attachment.params.name}`)
          console.log(attachment.disposition.params["filename*"])
          const filename = attachment.params.name  // need decode disposition.params['filename*'] !!!
          const encoding = toUpper(attachment.encoding)
          // A6 UID FETCH {attrs.uid} (UID FLAGS INTERNALDATE BODY.PEEK[{attachment.partID}])
          const f = imap.fetch(attrs.uid, { bodies: [attachment.partID] })
          f.on('message', (msg, seqno) => {
            const prefix = `(#${seqno})`
            msg.on('body', (stream, info) => {
              const writeStream = fs.createWriteStream(filename);
              writeStream.on('finish', () => { console.log(`${prefix} Done writing to file ${filename}`) })
              if (encoding === 'BASE64') stream.pipe(base64.decode()).pipe(writeStream)
              else stream.pipe(writeStream)
            })
            msg.once('end', () => { console.log(`${prefix} Finished attachment file${filename}`) })
          })
          f.once('end', () => { console.log('WS: downloder finish') })
        })
      })
      msg.once('end', () => { console.log(`${prefix} Finished email`); })
    });
    f.once('error', (err) => { console.log(`Fetch error: ${err}`) })
    f.once('end', () => {
      console.log('Done fetching all messages!')
      imap.end()
    })
  })
})
imap.once('error', (err) => { console.log(err) })
imap.once('end', () => { console.log('Connection ended') })
imap.connect()