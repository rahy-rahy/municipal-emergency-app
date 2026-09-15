'use strict';

const nodemailer = require('nodemailer');
const config = require('./config');

let transporter = null;
if (config.mail.enabled && config.mail.host) {
  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.port === 465,
    auth: config.mail.user
      ? { user: config.mail.user, pass: config.mail.pass }
      : undefined
  });
}

// Sends the verification link. When no mail server is configured the
// link is printed to the server log so the flow still works in a demo.
async function sendVerificationEmail(toEmail, link) {
  const subject = 'Confirm your email for the Municipal Emergency App';
  const text =
    'Welcome. Please confirm your email to finish creating your account.\n\n' +
    link +
    '\n\nIf you did not request this, ignore this message.';

  if (!transporter) {
    console.log('\n[email not configured] verification link for ' + toEmail + ':');
    console.log(link + '\n');
    return { delivered: false, link };
  }

  await transporter.sendMail({
    from: config.mail.from,
    to: toEmail,
    subject,
    text
  });
  return { delivered: true };
}

module.exports = { sendVerificationEmail };
