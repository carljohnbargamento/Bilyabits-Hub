const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

async function getImageUrlFromReply(api, event) {
    // Try to get the URL from the reply directly
    if (
        event.messageReply &&
        event.messageReply.attachments &&
        event.messageReply.attachments.length > 0
    ) {
        const attachment = event.messageReply.attachments.find(att =>
            att.type === 'photo' || att.type === 'image'
        );
        if (attachment && attachment.url) return attachment.url;
    }

    // Fallback: try to fetch the original message by ID
    if (event.messageReply && event.messageReply.messageID) {
        try {
            const messages = await new Promise((resolve, reject) => {
                api.getMessage(event.messageReply.messageID, (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });

            if (
                messages &&
                messages.attachments &&
                messages.attachments.length > 0
            ) {
                const attachment = messages.attachments.find(att =>
                    att.type === 'photo' || att.type === 'image'
                );
                if (attachment && attachment.url) return attachment.url;
            }
        } catch (e) {
            // Ignore, fallback will fail below
        }
    }
    return null;
}

module.exports = {
    name: 'remini',
    description: 'Enhance a photo with the Remini API. Usage: {prefix}remini (reply to an image)',
    async execute(api, event, args) {
        const imageUrl = await getImageUrlFromReply(api, event);

        if (!imageUrl) {
            api.sendMessage(
                `❌ Please reply to an image with: ${config.prefix}remini\nOr make sure the image is not expired or deleted.`,
                event.threadID,
                event.messageID
            );
            return;
        }

        api.sendMessage("✨ Enhancing your image, please wait...", event.threadID, event.messageID);

        const apiUrl = `https://kaiz-apis.gleeze.com/api/remini?url=${encodeURIComponent(imageUrl)}&stream=true&apikey=b640e04c-2b90-434b-91d7-fdd90650e0bf`;

        const imgDir = path.join(__dirname, '..', 'img');
        if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

        const fileName = `remini_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
        const filePath = path.join(imgDir, fileName);

        try {
            const response = await axios.get(apiUrl, { responseType: 'stream' });
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            writer.on('finish', () => {
                api.sendMessage(
                    {
                        body: `✨ Here is your enhanced image!`,
                        attachment: fs.createReadStream(filePath)
                    },
                    event.threadID,
                    () => {
                        fs.unlink(filePath, () => {});
                    },
                    event.messageID
                );
            });

            writer.on('error', () => {
                api.sendMessage("❌ Failed to enhance or send the image. Please try again later.", event.threadID, event.messageID);
            });
        } catch (error) {
            api.sendMessage("❌ There was an error processing your request. Please try again later.", event.threadID, event.messageID);
        }
    }
};
