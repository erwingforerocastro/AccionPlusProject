const onEnd = function (result) {
    if (result.error) {
      console.log(result.error)
      return
    }
    console.log("done")
    console.log(result.latestTime)
}

const { User } = require('../config/downloadAttachments.config.json')
const downloadEmailAttachments = require('download-email-attachments');

downloadEmailAttachments({
invalidChars: /[^A-Z]/g, //Regex of Characters that are invalid and will be replaced by X
account: `"${User.email}":${User.password}@outlook.Office365.com:993`, // all options and params besides account are optional
directory: './files',
filenameTemplate: '{day}-{filename}',
filenameFilter: /.png?$/,
timeout: 3000,
log: {warn: console.warn, debug: console.info, error: console.error, info: console.info },
since: '2020-12-31',
lastSyncIds: ['234', '234', '5345'], // ids already dowloaded and ignored, helpful because since is only supporting dates without time
attachmentHandler: function (attachmentData, callback, errorCB) {
    console.log(attachmentData)
    callback()
}
}, onEnd)