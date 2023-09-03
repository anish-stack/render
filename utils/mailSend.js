const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path"); // Import the 'path' module

const sendEmail = async (options,activationLink) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      auth: {
        user: process.env.SMPT_EMAIL,
        pass: process.env.SMPT_PASSWORD,
      },
    });

    // Get the absolute path to the email template HTML file
    const htmlContent = fs.readFileSync(path.join(__dirname, "../temeplete/mailConfirm.html"), 'utf-8');
    const modifiedHtml = htmlContent.replace('{{activationLink}}', activationLink);
    const mailOptions = {
      from: process.env.SMPT_EMAIL,
      to: options.email,
      subject: options.subject,
      html: modifiedHtml,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

module.exports = sendEmail;
