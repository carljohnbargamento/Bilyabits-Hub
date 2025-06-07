const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

module.exports = {
    name: 'dal-e',
    description: 'Generate an image based on a prompt using DALL·E 3',
    async execute(api, event, args) {
        const prompt = args.join(' ');

        if (!prompt) {
            api.sendMessage(
                `Please enter a prompt for the artwork.\nUsage: ${config.prefix}art <your prompt>`,
                event.threadID,
                event.messageID
            );
            return;
        }

        api.sendMessage("🎨 Generating your art, please wait...", event.threadID, event.messageID);

        // Prepare the new API URL
        const url = `https://api.zetsu.xyz/api/dalle-3?prompt=${encodeURIComponent(prompt)}&apikey=dd4d0574e81326816584a5e7bd43ca8e`;
        
        // Prepare image output path
        const imgDir = path.join(__dirname, '..', 'img');
        if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

        const fileName = `dal-e_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
        const filePath = path.join(imgDir, fileName);

        try {
            // Download the image (responseType: stream)
            const response = await axios.get(url, { responseType: 'stream' });

            // Save the image
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            writer.on('finish', () => {
                // Send the image as an attachment
                api.sendMessage(
                    {
                        body: `🎨 Here is your generated art for prompt:\n"${prompt}"`,
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
                api.sendMessage("❌ Failed to generate or send the image. Please try again later.", event.threadID, event.messageID);
            });
        } catch (error) {
            api.sendMessage("❌ There was an error processing your request. Please try again later.", event.threadID, event.messageID);
        }
    }
};
