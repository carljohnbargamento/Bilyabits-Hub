const axios = require("axios");

module.exports = {
    name: "gags",
    description: "Grow a Garden - Stock Identifier",
    usage: "{prefix}gag",
    async execute(api, event, args) {
        const apiUrl = "https://growagardenstock.vercel.app/api/stock/all";

        try {
            const res = await axios.get(apiUrl);
            const data = res.data;

            let msg = "____________________________\n";
            msg += "𝗚𝗿𝗼𝘄 𝗔 𝗚𝗮𝗿𝗱𝗲𝗻 - 𝗦𝘁𝗼𝗰𝗸 𝗜𝗱𝗲𝗻𝘁𝗶𝗳𝗶𝗲𝗿\n";
            msg += "By: 𝙲𝚊𝚛𝚕 𝙹𝚘𝚑𝚗 𝚅𝚒𝚕𝚕𝚊𝚟𝚒𝚝𝚘\n";
            msg += "____________________________\n\n";

            // For each stock type in the response
            for (const key of Object.keys(data)) {
                const stock = data[key];
                const title = stock.name || key.replace(/_/g, " ").toUpperCase();
                const timer = stock.countdown?.formatted || "";
                msg += `👁️‍🗨️${title} \n🕜${timer}:\n`;

                if (Array.isArray(stock.items) && stock.items.length > 0) {
                    for (const item of stock.items) {
                        msg += `   • ${item.name} x${item.quantity}\n`;
                    }
                } else {
                    msg += "   • None\n";
                }
                msg += "\n";
            }
            api.sendMessage(msg.trim(), event.threadID, undefined, event.messageID);
        } catch (err) {
            api.sendMessage(
                "Failed to fetch stock data. Please try again later.",
                event.threadID,
                undefined,
                event.messageID
            );
        }
    }
};
