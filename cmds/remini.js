const axios = require("axios");
const fs = require("fs");
const path = require("path");
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

module.exports = {
    name: "remini",
    description: "Enhance a photo using the Remini API. Usage: {prefix}remini (reply to an image)",
    cooldown: 5,
    execute: async function(api, event, args) {
        api.sendTypingIndicator(event.threadID);

        // Only work on reply with a photo
        if (
            !(event.type === "message_reply" && event.messageReply.attachments[0]?.type === "photo")
        ) {
            api.sendMessage(`❌ | Please reply to an image with: ${config.prefix}remini`, event.threadID, event.messageID);
            return;
        }

        const imageUrl = encodeURIComponent(event.messageReply.attachments[0].url);
        const apiUrl = `https://kaiz-apis.gleeze.com/api/remini?url=${imageUrl}&stream=true&apikey=b640e04c-2b90-434b-91d7-fdd90650e0bf`;

        api.sendMessage("✨ Enhancing your image, please wait...", event.threadID, event.messageID);

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
                        fs.unlink(filePath, () => {});
                    },
                    event.messageID
                );
            });

            writer.on('error', () => {
                api.sendMessage("❌ Failed to enhance or send the image. Please try again later.", event.threadID, event.messageID);
            });
        } catch (error) {
            console.error(error);
            api.sendMessage("❌ | An error occurred while processing your image. Please try again later.", event.threadID, event.messageID);
        }
    }
};
