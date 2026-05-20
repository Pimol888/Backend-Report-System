const nodemailer = require("nodemailer");
const { config } = require("../config/env");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    throw new Error("SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env");
  }
  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
  return transporter;
}

function isEmailConfigured() {
  return !!(config.smtpHost && config.smtpUser && config.smtpPass);
}

async function sendMail({ to, subject, text, html }) {
  const transport = getTransporter();
  await transport.sendMail({
    from: config.mailFrom,
    to,
    subject,
    text: text || "",
    html: html || text || "",
  });
}

async function sendPasswordResetEmail(to, code, expiresIn = "1 hour") {
  const subject = "Password reset code";
  const text = `Your password reset code is: ${code}. It expires in ${expiresIn}.`;
  const html = `<p>Your password reset code is: <strong>${code}</strong>.</p><p>It expires in ${expiresIn}.</p>`;
  await sendMail({ to, subject, text, html });
}

module.exports = { sendMail, sendPasswordResetEmail, isEmailConfigured };
