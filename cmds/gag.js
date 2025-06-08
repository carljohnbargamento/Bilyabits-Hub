const axios = require("axios");

module.exports = {
    name: "gag",
    description: "Grow a Garden - Stock Identifier",
    async execute(api, event, args) {
        const apiUrl = "https://growagardenstock.vercel.app/api/stock/all";

        // Stock type to emoji mapping (fallback)
        const emojiMap = {
            cosmetics_stock: "🧑‍🌾",
            egg_stock: "🥚",
            gear_stock: "🛠️",
            honey_stock: "🍯",
            seeds_stock: "🌱"
        };

        // Per-item keyword to emoji mapping
        const itemEmojis = [
            // Animals
            { keywords: ["raccoon"], emoji: "🦝" },
            { keywords: ["gnome"], emoji: "🧙" },
            { keywords: ["bee"], emoji: "🐝" },
            { keywords: ["cat"], emoji: "🐱" },
            { keywords: ["dog"], emoji: "🐶" },
            { keywords: ["chicken", "hen"], emoji: "🐔" },
            { keywords: ["duck"], emoji: "🦆" },
            { keywords: ["rabbit", "bunny"], emoji: "🐰" },
            { keywords: ["fish"], emoji: "🐟" },
            { keywords: ["pig"], emoji: "🐷" },
            { keywords: ["cow"], emoji: "🐮" },
            { keywords: ["sheep"], emoji: "🐑" },
            { keywords: ["horse"], emoji: "🐴" },
            { keywords: ["goat"], emoji: "🐐" },
            { keywords: ["bird"], emoji: "🐦" },

            // Seeds, Plants & Foods
            { keywords: ["carrot"], emoji: "🥕" },
            { keywords: ["daffodil"], emoji: "🌼" },
            { keywords: ["strawberry"], emoji: "🍓" },
            { keywords: ["tomato"], emoji: "🍅" },
            { keywords: ["tulip"], emoji: "🌷" },
            { keywords: ["blueberry"], emoji: "🫐" },
            { keywords: ["orange"], emoji: "🍊" },
            { keywords: ["seed"], emoji: "🌱" },
            { keywords: ["flower"], emoji: "🌸" },
            { keywords: ["potato"], emoji: "🥔" },
            { keywords: ["apple"], emoji: "🍎" },
            { keywords: ["banana"], emoji: "🍌" },
            { keywords: ["grape"], emoji: "🍇" },
            { keywords: ["lavender"], emoji: "💜" },
            { keywords: ["fruit"], emoji: "🍏" },

            // Tools & Objects
            { keywords: ["shovel"], emoji: "🧑‍🌾" },
            { keywords: ["rake"], emoji: "🧹" },
            { keywords: ["trowel"], emoji: "🛠️" },
            { keywords: ["wrench"], emoji: "🔧" },
            { keywords: ["tool"], emoji: "🧰" },
            { keywords: ["watering can"], emoji: "🚿" },
            { keywords: ["bench"], emoji: "🪑" },
            { keywords: ["chair"], emoji: "🪑" },
            { keywords: ["crate"], emoji: "📦" },
            { keywords: ["tile"], emoji: "🧱" },
            { keywords: ["floor"], emoji: "🟫" },
            { keywords: ["path"], emoji: "🚶" },
            { keywords: ["well"], emoji: "⛲" },
            { keywords: ["pottery"], emoji: "🏺" },
            { keywords: ["sign"], emoji: "🪧" },
            { keywords: ["relic"], emoji: "🗿" },
            { keywords: ["recall"], emoji: "🔄" },
            { keywords: ["favorite"], emoji: "❤️" },
            { keywords: ["medium"], emoji: "➖" },
            { keywords: ["common"], emoji: "🟢" },
            { keywords: ["white"], emoji: "⚪" },
            { keywords: ["brown"], emoji: "🟤" },
            { keywords: ["red"], emoji: "🔴" },
            { keywords: ["blue"], emoji: "🔵" },

            // Miscellaneous
            { keywords: ["honey"], emoji: "🍯" },
            { keywords: ["comb"], emoji: "🧇" },
            { keywords: ["pack"], emoji: "📦" },
            { keywords: ["grave"], emoji: "🪦" },
        ];

        // Helper to find emoji for item name
        function getItemEmoji(name, fallback) {
            const lower = name.toLowerCase();
            for (const entry of itemEmojis) {
                for (const kw of entry.keywords) {
                    if (lower.includes(kw)) return entry.emoji;
                }
            }
            return fallback;
        }

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
                const stockTypeEmoji = emojiMap[key] || "📦";
                const title = stock.name || key.replace(/_/g, " ").toUpperCase();
                const timer = stock.countdown?.formatted || "";
                msg += `👁️‍🗨️${title} 🕜${timer}:\n`;

                if (Array.isArray(stock.items) && stock.items.length > 0) {
                    for (const item of stock.items) {
                        const emoji = getItemEmoji(item.name, stockTypeEmoji);
                        msg += `     • ${emoji} ${item.name} x${item.quantity}\n`;
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
