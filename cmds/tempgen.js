const axios = require('axios');
const config = JSON.parse(require('fs').readFileSync('config.json', 'utf8'));

module.exports = {
    name: 'tempgen',
    description: 'Generate a temporary email address.',
    async execute(api, event) {
        const apiKey = '12c8883f30b463857aabb5a76a9a4ce421a6497b580a347bdaf7666dc2191e25';
        const url = `https://www.haji-mix-api.gleeze.com/api/tempgen?api_key=${apiKey}`;
        try {
            const response = await axios.get(url);
            if (response.data && response.data.email && response.data.token) {
                api.sendMessage(
                    `Temp Mail Generated:\nEmail: ${response.data.email}\n\nToken: ${response.data.token}\n`,
                    event.threadID, event.messageID
                );
            } else {
                api.sendMessage("❌ Failed to generate temp mail.", event.threadID, event.messageID);
            }
        } catch (error) {
            api.sendMessage("❌ There was an error processing your request. Please try again later.", event.threadID, event.messageID);
        }
    }
};
