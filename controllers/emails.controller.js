const { MAYA_EMAIL, MAYA_PASSWORD } = require('../config/env')
const nodeoutlook = require('nodejs-nodemailer-outlook')

/**
 * @author: Karen Mantilla 
 * 
 * Method for sending emails from Maya account 
 * 
 * ----------------------------------------------------------------
 * WARNING: ONLY ONE PARAMETER SHOULD BE SET MESSAGE OR MESSAGEHTML
 * ----------------------------------------------------------------
 * 
 * @params
 * [subject] Email's subject
 * [message] Email's message body 
 * [messageHtml] Email's message body in html form (USE it WHEN IT'S NECESSARY ADDING STYLE TO EMAIL MESSAGE BODY)
 * [email] User's email whom the message will be sent
 */
exports.sendEmail = (subject, message, messageHtml, email) => {

    return new Promise((resolve, reject) => {

        nodeoutlook.sendEmail({
            auth: {
                user: MAYA_EMAIL,
                pass: MAYA_PASSWORD
            },
            from: MAYA_EMAIL,
            to: email,
            subject: subject,
            html: messageHtml,
            text: message,
            onError: (e) => {
                reject(false)
            },
            onSuccess: (i) => {
                resolve(true)
            }
        })
    })
}
