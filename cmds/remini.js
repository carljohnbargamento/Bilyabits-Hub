const axios = require("axios");

module.exports = {
    name: "remini",
    description: "Enhance a photo using the Remini API. Usage: {prefix}remini (reply to an image)",
    cooldown: 5,
    execute: async function(api, event, args) {
        // Only process if this is a reply to a message with a photo attachment
        if (!(event.type === "message_reply" && event.messageReply.attachments[0]?.type === "photo")) {
            api.sendMessage("❌ | Please reply to an image with your command.", event.threadID, event.messageID);
            return;
        }

        api.sendTypingIndicator(event.threadID);
        api.sendMessage("✨ Enhancing your image, please wait...", event.threadID, event.messageID);

        try {
            const imgUrl = encodeURIComponent(event.messageReply.attachments[0].url);
            const apiUrl = `https://kaiz-apis.gleeze.com/api/remini?url=${imgUrl}&stream=true&apikey=b640e04c-2b90-434b-91d7-fdd90650e0bf`;

            // Get the image directly from the API as a stream and send it as an attachment
            const response = await axios.get(apiUrl, { responseType: "arraybuffer" });

            if (response.status === 200 && response.data) {
                api.sendMessage(
                    {
                        body: "✨ Here is your enhanced image!",
                        attachment: Buffer.from(response.data, "binary")
                    },
                    event.threadID,
                    event.messageID
                );
            } else {
                api.sendMessage("❌ | Failed to enhance image. Try again later.", event.threadID, event.messageID);
            }
        } catch (error) {
            console.error(error);
            api.sendMessage("❌ | An error occurred while processing your image. Please try again later.", event.threadID, event.messageID);
        }
    }
};
