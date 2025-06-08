const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

module.exports = {
    name: 'remini',
    description: 'Enhance a photo with the Remini API. Usage: {prefix}remini (reply to an image)',
    async execute(api, event, args) {
        // Check if the message is a reply to another message
        if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {
            api.sendMessage(
                `Please reply to an image with: ${config.prefix}remini`,
                event.threadID,
                event.messageID
            );
            return;
        }

        // Find the first image attachment
        const attachment = event.messageReply.attachments.find(att => att.type === 'photo' || att.type === 'image');
        if (!attachment || !attachment.url) {
            api.sendMessage(
                "The replied message must contain a photo/image attachment.",
                event.threadID,
                event.messageID
            );
            return;
        }

        const imageUrl = attachment.url;
        api.sendMessage("✨ Enhancing your image, please wait...", event.threadID, event.messageID);

        // Prepare the Remini API URL
        const apiUrl = `https://kaiz-apis.gleeze.com/api/remini?url=${encodeURIComponent(imageUrl)}&stream=true&apikey=b640e04c-2b90-434b-91d7-fdd90650e0bf`;

        // Prepare image output path
        const imgDir = path.join(__dirname, '..', 'img');
        if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

        const fileName = `remini_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
        const filePath = path.join(imgDir, fileName);

        try {
            // Download the enhanced image (responseType: stream)
            const response = await axios.get(apiUrl, { responseType: 'stream' });

            // Save the image
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
                        // Optionally delete the file after sending
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
