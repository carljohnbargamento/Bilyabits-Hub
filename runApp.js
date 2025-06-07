const fs = require("fs");
const wiegine = require("ws3-fca");
const express = require("express");
const path = require("path");
const app = express();

const config = JSON.parse(fs.readFileSync("config.json", "utf8"));
const port = config.port || 3000;

// Persistent status file to track last successful login
const STATUS_FILE = "bot_status.json";

// Helper to load/save persistent status for bot
function saveStatus(status) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), "utf-8");
}
function loadStatus() {
    try {
        return JSON.parse(fs.readFileSync(STATUS_FILE, "utf8"));
    } catch {
        return { online: false, lastSession: null };
    }
}

// Global state
let botStatus = "OFFLINE";
let botApi = null;
let refreshIntervalId = null;
let listening = false;

// Serve static files for portal and img folders
app.use("/portal", express.static(path.join(__dirname, "portal")));
app.use("/img", express.static(path.join(__dirname, "img")));

// Serve the landing page at "/"
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "portal", "index.html"));
});

// Built-in API for status
app.get("/api/status", (req, res) => {
    const status = loadStatus();
    res.json({ status: status.online ? "ONLINE" : "OFFLINE" });
});

// API to get current cookie
app.get("/api/cookie", (req, res) => {
    try {
        const cookie = fs.readFileSync("appstate.txt", "utf8").trim();
        res.json({ cookie });
    } catch {
        res.json({ cookie: "" });
    }
});

// API to set/update cookie
app.use(express.json());
app.post("/api/cookie", (req, res) => {
    const { cookie } = req.body;
    if (!cookie || typeof cookie !== "string") {
        return res.json({ success: false, message: "No cookie provided." });
    }
    try {
        fs.writeFileSync("appstate.txt", cookie.trim(), "utf-8");
        res.json({ success: true, message: "Cookie updated successfully." });
    } catch (e) {
        res.json({ success: false, message: "Failed to update cookie." });
    }
});

// API to delete cookie
app.delete("/api/cookie", (req, res) => {
    try {
        fs.writeFileSync("appstate.txt", "", "utf-8");
        res.json({ success: true, message: "Cookie deleted." });
    } catch (e) {
        res.json({ success: false, message: "Failed to delete cookie." });
    }
});

// Start the Express server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Load commands from the cmds folder
const commandFiles = fs.readdirSync('./cmds').filter(file => file.endsWith('.js'));
console.log("\n\n\n");
console.log("=====COMMANDS LOADED=====");
console.log("====={}=====");
commandFiles.forEach(file => {
    console.log(`[~] ${file.replace('.js', '')}`);
});
console.log("====={}=====");
console.log("\n\n\n");

// Load command modules into an object
const commands = {};
commandFiles.forEach(file => {
    const command = require(`./cmds/${file}`);
    commands[command.name] = command;
});

// Read the cookie string from appstate.txt
function readCookie() {
    try {
        const cookie = fs.readFileSync("appstate.txt", "utf8").trim();
        if (!cookie) throw new Error("appstate.txt is empty or invalid.");
        return cookie;
    } catch (error) {
        console.error("Failed to load a valid appstate.txt:", error);
        return null;
    }
}

// Helper: Clear intervals/listeners if restarting bot
function clearBot() {
    if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
    }
    listening = false;
    botApi = null;
}

// Main bot logic
function startBot() {
    clearBot();
    const cookie = readCookie();
    if (!cookie) {
        botStatus = "OFFLINE";
        saveStatus({ online: false, lastSession: null });
        return;
    }

    wiegine.login(cookie, {
        forceLogin: true,
        listenEvents: true,
        logLevel: "silent",
        updatePresence: true,
        bypassRegion: "PNB",
        selfListen: false,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:118.0) Gecko/20100101 Firefox/118.0",
        online: true,
        autoMarkDelivery: true,
        autoMarkRead: true
    }, (err, api) => {
        if (err) {
            console.error("Login failed:", err);
            botStatus = "OFFLINE";
            saveStatus({ online: false, lastSession: null });
            return;
        }
        botStatus = "ONLINE";
        botApi = api;
        const botID = api.getCurrentUserID();

        // Save the session (cookie) back to appstate.txt after login
        try {
            fs.writeFileSync("appstate.txt", cookie, "utf-8");
            console.log("Saved session cookie to appstate.txt");
        } catch (e) {
            console.error("Failed to save appstate.txt:", e);
        }

        // Change bot's bio
        function updateBotBio(api) {
            const bio = `Prefix: ${config.prefix}\nOwner: ${config.botOwner}`;
            api.changeBio(bio, (err) => {
                if (err) {
                    console.error("Failed to update bot bio:", err);
                } else {
                    console.log("Bot bio updated successfully.");
                }
            });
        }
        updateBotBio(api);

        // Notify the admin only if it's a new session
        let statusInfo = loadStatus();
        if (!statusInfo.online || statusInfo.lastSession !== botID) {
            const adminUserThread = config.adminID;
            api.sendMessage(
                `I am online!\nBot Owner Name: ${config.botOwnerName}\nBot ID: ${botID}`,
                adminUserThread
            );
            saveStatus({ online: true, lastSession: botID });
        } else {
            // Still online, no need to notify again
            saveStatus({ online: true, lastSession: botID });
        }

        // Refresh fb_dtsg every hour
        refreshIntervalId = setInterval(() => {
            if (api.refreshFb_dtsg) {
                api.refreshFb_dtsg();
                console.log("Refreshed fb_dtsg at:", new Date().toLocaleString());
            }
        }, 60 * 60 * 1000);

        // =============== BUILT-IN AND COMMAND HANDLING ===============
        function handleBuiltInCommands(api, event) {
            const msg = event.body ? event.body.trim() : "";
            if (msg.toLowerCase() === "prefix") {
                api.sendMessage(
                    `The current prefix is: "${config.prefix}"`,
                    event.threadID,
                    undefined,
                    event.messageID
                );
                return true;
            }
            return false;
        }
        function handleCommand(event) {
            const prefix = config.prefix;
            const message = event.body ? event.body.trim() : "";
            if (!message) return;
            if (handleBuiltInCommands(api, event)) return;

            if (message.startsWith(prefix)) {
                const args = message.slice(prefix.length).trim().split(/ +/);
                const commandNameRaw = args.shift();
                const commandName = commandNameRaw ? commandNameRaw.toLowerCase() : "";
                if (!commandName) {
                    api.sendMessage(
                        `No command input, please type "${config.prefix}help" for available commands.`,
                        event.threadID,
                        undefined,
                        event.messageID
                    );
                    return;
                }
                if (!commands[commandName]) {
                    let usageMsg = "⚠️ Invalid command.\n";
                    usageMsg += `Usage: ${prefix}<command>\n`;
                    usageMsg += `Example: ${prefix}help\n`;
                    usageMsg += `Type "${prefix}help" to see the available commands.`;
                    api.sendMessage(
                        usageMsg,
                        event.threadID,
                        undefined,
                        event.messageID
                    );
                    return;
                }
                try {
                    commands[commandName].execute(api, event, args);
                } catch (error) {
                    console.error(`Error executing command ${commandName}:`, error);
                    api.sendMessage(
                        `There was an error executing the ${commandName} command.`,
                        event.threadID,
                        undefined,
                        event.messageID
                    );
                }
                return;
            }
            // Warn if user omits prefix
            const splitMessage = message.split(/ +/);
            const msgCommandName = splitMessage[0].toLowerCase();
            if (commands[msgCommandName]) {
                api.sendMessage(
                    `⚠️ Please use the prefix "${config.prefix}" before the command.\nExample: ${config.prefix}${msgCommandName}`,
                    event.threadID,
                    undefined,
                    event.messageID
                );
                return;
            }
            // Unrecognized input
            api.sendMessage(
                `🤖 Unrecognized input.\nAlways use the prefix "${config.prefix}" before commands.\nType "${config.prefix}help" to see available commands.`,
                event.threadID,
                undefined,
                event.messageID
            );
        }

        // =============== LISTEN FOR EVENTS ===============
        if (!listening) {
            api.listenMqtt((err, event) => {
                if (err) return console.error("Error while listening:", err);
                switch (event.type) {
                    case "message":
                        handleCommand(event);
                        break;
                    case "event":
                        console.log("Other event type:", event);
                        break;
                }
            });
            listening = true;
        }
    });
}

// Watch cookie file for changes, restart bot on update
fs.watchFile("appstate.txt", { interval: 1500 }, (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
        console.log("appstate.txt changed, restarting bot...");
        botStatus = "OFFLINE";
        setTimeout(() => {
            startBot();
        }, 1500);
    }
});

// Initial startup
startBot();

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
