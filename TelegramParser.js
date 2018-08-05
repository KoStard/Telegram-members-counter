/* jshint esversion: 6 */

module.exports = {
    getMembersNum: getMembersNum
};

const prv = require("./private");
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(prv.tkn, { polling: true });

function getMembersNum() {
    return bot.getChatMembersCount(prv.pathologyGroupID);
}