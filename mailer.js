const nodemailer = require("nodemailer");

async function sendClockInFailureEmail(reason = "") {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.EMAIL_TO_SEND,
        subject: "Clock In Failed",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #111111;">

                <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 600; color: #111111;">Clock In Failed</h2>

                <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #333333;">Hi Himanshu,</p>

                <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #333333;">
                    The automated clock-in on Darwinbox did not complete successfully on <strong>${now}</strong>.
                </p>

                ${reason ? `
                <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #333333;">
                    <strong>Reason:</strong> ${reason}
                </p>
                ` : ""}

                <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #333333;">
                    Please log in to <a href="https://baazigames.darwinbox.in/" style="color: #1a56db;">Darwinbox</a> and clock in manually.
                </p>

                <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 0 0 20px 0;" />

                <p style="margin: 0; font-size: 13px; color: #888888;">
                    This is an automated notification from Darwin Automation. Please do not reply to this email.
                </p>

            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${process.env.EMAIL_TO_SEND}`);
    } catch (error) {
        console.error(`Error sending alert email: ${error.message}`);
    }
}

module.exports = { sendClockInFailureEmail };
