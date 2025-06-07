const axios = require('axios');
const fs = require('fs');
const path = require('path');
// Load config for prefix, if needed
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

module.exports = {
    name: 'pinterest',
    description: 'Search and send a random Pinterest image based on your query.',
    async execute(api, event, args) {
        const query = args.join(' ');

        if (!query) {
            api.sendMessage(
                `Please enter a search term for Pinterest.\nUsage: ${config.prefix}pinterest <your search>`,
                event.threadID,
                event.messageID
            );
            return;
        }

        api.sendMessage("🔎 Searching Pinterest, please wait...", event.threadID, event.messageID);

        // Prepare the API URL
        const url = `https://kaiz-apis.gleeze.com/api/pinterest?search=${encodeURIComponent(query)}&apikey=b640e04c-2b90-434b-91d7-fdd90650e0bf`;
        
        // Prepare image output path (../img)
        const imgDir = path.join(__dirname, '..', 'img');
        if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

        const fileName = `pinterest_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
        const filePath = path.join(imgDir, fileName);

        try {
            // Get Pinterest images
            const response = await axios.get(url);
            if (!response.data || !Array.isArray(response.data.data) || response.data.data.length === 0) {
                api.sendMessage("❌ No images found for that query.", event.threadID, event.messageID);
                return;
            }

            // Pick a random image from the results
            const images = response.data.data;
            const randomImgUrl = images[Math.floor(Math.random() * images.length)];

            // Download the image (responseType: stream)
            const imgRes = await axios.get(randomImgUrl, { responseType: 'stream' });

            // Save the image
            const writer = fs.createWriteStream(filePath);
            imgRes.data.pipe(writer);

            writer.on('finish', () => {
                // Send the image as an attachment
                api.sendMessage(
                    {
                        body: `🖼️ Here is a Pinterest result for:\n"${query}"`,
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
                api.sendMessage("❌ Failed to send the image. Please try again later.", event.threadID, event.messageID);
            });
        } catch (error) {
            api.sendMessage("❌ There was an error processing your request. Please try again later.", event.threadID, event.messageID);
        }
    }
};
