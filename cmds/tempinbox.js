const axios = require('axios');
const config = JSON.parse(require('fs').readFileSync('config.json', 'utf8'));

module.exports = {
    name: 'tempinbox',
    description: 'Check the inbox for a generated temp email address.',
    async execute(api, event, args) {
        const token = args[0];
        if (!token) {
            api.sendMessage(
                `Please provide the token.\nUsage: ${config.prefix}tempinbox <token>`,
                event.threadID, event.messageID
            );
            return;
        }
        const apiKey = '12c8883f30b463857aabb5a76a9a4ce421a6497b580a347bdaf7666dc2191e25';
        const url = `https://www.haji-mix-api.gleeze.com/api/tempinbox?token=${encodeURIComponent(token)}&api_key=${apiKey}`;
        try {
            const response = await axios.get(url);
            if (response.data && Array.isArray(response.data.emails) && response.data.emails.length > 0) {
                let msg = "📬 Temp Inbox:\n\n";
                response.data.emails.forEach((mail, i) => {
                    msg += `Email #${i + 1}:\nFrom: ${mail.from}\nSubject: ${mail.subject}\nDate: ${new Date(mail.date).toLocaleString()}\n\n${mail.body}\n\n---\n`;
                });
                api.sendMessage(msg, event.threadID, event.messageID);
            } else {
                api.sendMessage("📭 No emails found for this token yet.", event.threadID, event.messageID);
            }
        } catch (error) {
            api.sendMessage("❌ There was an error processing your request. Please try again later.", event.threadID, event.messageID);
        }
    }
};
