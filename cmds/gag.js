const axios = require("axios");

module.exports = {
    name: "gag",
    description: "Grow a Garden - Stock Identifier",
    async execute(api, event, args) {
        const apiUrl = "https://growagardenstock.vercel.app/api/stock/all";
        // Stock type to emoji mapping
        const emojiMap = {
            cosmetics_stock: "🧑‍🌾",
            egg_stock: "🥚",
            gear_stock: "🛠️",
            honey_stock: "🍯",
            seeds_stock: "🌱"
        };

        try {
            const res = await axios.get(apiUrl);
            const data = res.data;

            let msg = "____________________________\n";
            msg += "Grow a Garden - Stock Identifier\n";
            msg += "By: Carl John Villavito\n";
            msg += "____________________________\n\n";

            // For each stock type in the response
            for (const key of Object.keys(data)) {
                const stock = data[key];
                const emoji = emojiMap[key] || "📦";
                const title = stock.name || key.replace(/_/g, " ").toUpperCase();
                const timer = stock.countdown?.formatted || "";
                msg += `👁️‍🗨️${title} 🕜${timer}:\n`;

                if (Array.isArray(stock.items) && stock.items.length > 0) {
                    for (const item of stock.items) {
                        msg += `     • ${emoji} ${item.name} {${item.quantity}}\n`;
                    }
                } else {
                    msg += "     • None\n";
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
