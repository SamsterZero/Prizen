import nodemailer from 'nodemailer';

export function createEmailTransport() {
	const smtpUrl = process.env.SMTP_URL;
	if (!smtpUrl) return null;
	return nodemailer.createTransport(smtpUrl);
}
