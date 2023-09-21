const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path"); // Import the 'path' module

const sendPasswordToken= async (optionsToken,resetPasswordLink) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      auth: {
        user:"dosomething616@gmail.com",
        pass: "luuelrzjzmwqgium",
      },
    });

    // Get the absolute path to the email template HTML file
    const htmlContent = fs.readFileSync(path.join(__dirname, "../temeplete/password.html"), 'utf-8');
    const modifiedHtml = htmlContent.replace('{{resetLink}}', resetPasswordLink);
    const mailOptions = {
      from:"dosomething616@gmail.com",
      to: optionsToken.email,
      subject: optionsToken.subject,
      html: modifiedHtml,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

module.exports = sendPasswordToken;
