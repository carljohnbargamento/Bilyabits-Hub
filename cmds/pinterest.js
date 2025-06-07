const axios = require('axios');
const fs = require('fs');
const path = require('path');
// Load config for prefix, if needed
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

module.exports = {
    name: 'pinterest',
    description: 'Search and send random Pinterest images based on your query.',
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

        try {
            // Get Pinterest images
            const response = await axios.get(url);
            if (!response.data || !Array.isArray(response.data.data) || response.data.data.length === 0) {
                api.sendMessage("❌ No images found for that query.", event.threadID, event.messageID);
                return;
            }

            // Download all images from the results and group as attachments
            const images = response.data.data;
            const maxImages = 20; // Limit to avoid spamming too many images at once
            const imagesToSend = images.slice(0, maxImages);

            const downloadPromises = imagesToSend.map((imgUrl, idx) => {
                return new Promise((resolve, reject) => {
                    const fileName = `pinterest_${Date.now()}_${Math.floor(Math.random() * 10000)}_${idx}.jpg`;
                    const filePath = path.join(imgDir, fileName);

                    axios.get(imgUrl, { responseType: 'stream' }).then((imgRes) => {
                        const writer = fs.createWriteStream(filePath);
                        imgRes.data.pipe(writer);
                        writer.on('finish', () => resolve(filePath));
                        writer.on('error', reject);
                    }).catch(reject);
                });
            });

            let filePaths;
            try {
                filePaths = await Promise.all(downloadPromises);
            } catch (err) {
                api.sendMessage("❌ Failed to download one or more images.", event.threadID, event.messageID);
                return;
            }

            // Send all images as attachments in one message
            api.sendMessage(
                {
                    body: `🖼️ Pinterest results for:\n"${query}"\nShowing ${filePaths.length} image(s).`,
                    attachment: filePaths.map(fp => fs.createReadStream(fp))
                },
                event.threadID,
                () => {
                    // Optionally delete the files after sending
                    filePaths.forEach(fp => fs.unlink(fp, () => {}));
                },
                event.messageID
            );
        } catch (error) {
            api.sendMessage("❌ There was an error processing your request. Please try again later.", event.threadID, event.messageID);
        }
    }
};
