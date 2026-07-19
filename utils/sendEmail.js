const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // If SMTP is not defined, use ethereal test account
  let transporter;
  
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  } else {
    // Generate a test ethereal account dynamically if none is provided
    let testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  const message = {
    from: `${process.env.FROM_NAME || 'SpeedToyz'} <${process.env.FROM_EMAIL || 'noreply@speedtoyz.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  const info = await transporter.sendMail(message);

  if (!process.env.SMTP_HOST) {
    console.log('Test email sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  }
};

module.exports = sendEmail;
