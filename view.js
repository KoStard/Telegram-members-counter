/* jshint esversion: 6 */

const fs = require('fs');
const { ipcRenderer } = require('electron');

let width, height;
let container = document.getElementById("container");
let graphContainer = document.getElementById("graph-container");
let graph = document.getElementById("graph");
let scrollSolver = document.getElementById("scroll-solver");
let graphSVG = document.getElementById("graph-svg");
let polygon = document.getElementById("polygon");
let polygonStroke = document.getElementById("polygon-stroke");

let infoPanel = document.getElementById("info-panel");
let infoPanelCurrent = document.getElementById("info-panel-current");
let infoPanelVariance = document.getElementById("info-panel-variance");

let coordinates = document.getElementById("coordinates");
let coordinatesSVG = document.getElementById("coordinates-svg");
let verticalMain = document.getElementById("vertical").getElementsByClassName("main")[0];
let verticalAdditional = document.getElementById("vertical").getElementsByClassName("additional")[0];
let horizontalMain = document.getElementById("horizontal").getElementsByClassName("main")[0];
let horizontalAdditional = document.getElementById("horizontal").getElementsByClassName("additional")[0];

let panelName = document.getElementById("panel-name");
let panelCurrent = document.getElementById("panel-current");
let panelBotName = document.getElementById("panel-bot-name");

const popup = require("./popup");

graphSVG.namespaceURI = "http://www.w3.org/2000/svg";
coordinatesSVG.namespaceURI = "http://www.w3.org/2000/svg";

let polygonOffset = 0;
let topPx = 16,
    bottomPx = 16,
    leftPx = 16,
    rightPx = 16;

let coordsAdditionalSize = 8;

let step = 25,
    horizontalCoordsStep = 50,
    currentHorizontalCoordsNum = 0;

let verticalFrom = 0,
    verticalTo = 1000,
    verticalScale,
    verticalCoordsStepNum = 10;

let scaledPoints = [];
let data = [];
let current = {};

function createButton({
    value,
    buttonClass,
    buttonID,
    onclick,
    owner
}) {
    if (!value) {
        return false;
    }
    let newButton = document.createElement('button');
    newButton.innerText = value;
    if (buttonClass) newButton.className = buttonClass;
    if (buttonID) newButton.id = buttonID;
    if (onclick) newButton.onclick = onclick;
    if (owner) {
        owner.appendChild(newButton);
    }
    return newButton;
}

// Telegram bot part
const TelegramBot = require("node-telegram-bot-api");
let privateDataRaw = fs.readFileSync("private.json");
if (!privateDataRaw.length)
    privateDataRaw = '{}';
let privateData = JSON.parse(privateDataRaw);

function savePrivateData() { fs.writeFileSync('private.json', JSON.stringify(privateData)); }

let botsData = [];
function loadBotsFromPrivateData() {
    for (let username of Object.keys(privateData.bots)) {
        botsData[username] = {
            bot: new TelegramBot(privateData.bots[username].tkn, {
                polling: false
            }),
            username: username
        };
    }
    if (privateData.last)
    current = {
        botsData: botsData[privateData.last.bot],
        target: privateData.last.target
    };
}

function botAdder() {
    new popup.PopupInputPanelBigCentral({
        headerText: 'Bot Token',
        inputNames: ['token'],
        buttons: [
            createButton({
                value: "Done",
                onclick(panel) {
                    let tkn = panel.inputs[0].value;
                    for (let username of Object.keys(privateData.bots)) {
                        if (privateData.bots[username].tkn == tkn)
                            return false;
                    }
                    let bot;
                    try {
                        bot = new TelegramBot(tkn, { polling: false });
                    } catch (err) {
                        console.log("invalid token");
                        return false;
                    }
                    bot.getMe().then(
                        (user) => {
                            privateData.bots[user.username] = {
                                tkn: tkn,
                                targets: [],
                                first_name: user.first_name
                            };
                            botsData[user.username] = {
                                bot: bot,
                                username: user.username
                            };
                            ipcRenderer.send("privateData", privateData, privateData.bots[current.botsData.username].targets);
                            saveData();
                            panel.close();
                        }, (err) => {
                            console.log(err);
                        }
                    );
                }
            }),
            createButton({
                value: "Cancel",
                onclick(panel) {
                    panel.close();
                }
            })
        ],
        owner: container,
        width: 450,
        buffered: false
    });
}

function targetAdder() {
    new popup.PopupInputPanelBigCentral({
        headerText: 'Channel/Group ID',
        inputNames: ['ID'],
        buttons: [
            createButton({
                value: "Done",
                onclick(panel) {
                    let id = panel.inputs[0].value;
                    for (let username of Object.keys(privateData.targets)) {
                        if (privateData.targets[username].id == id)
                            return false;
                    }
                    let bot = current.botsData.bot;
                    try {
                        bot.getChat(id).then((chat) => { 
                            let key = chat.username || chat.title || chat.first_name || chat.id;
                            console.log("key is "+key);
                            privateData.targets[key] = {
                                title: chat.title,
                                id: id
                            };
                            privateData.bots[current.botsData.username].targets.push(key);
                            ipcRenderer.send("privateData", privateData, privateData.bots[current.botsData.username].targets);
                            saveData();
                            if (!current.target) {
                                current.target = key;
                                resetGraph();
                            }
                            data[key] = [];
                            panel.close();
                        }, (err) => { console.error(err); });
                    } catch (err) {
                        console.log("invalid token");
                        return false;
                    }
                }
            }),
            createButton({
                value: "Cancel",
                onclick(panel) {
                    panel.close();
                }
            })
        ],
        owner: container,
        width: 450,
        buffered: false
    });
}

// Telegram bot logic
function updateCurrent() {
    if (!current.target) return;
    current.botsData.bot.getChatMembersCount(privateData.targets[current.target].id).then((res) => {
        addToData({
            value: res,
            order: (data[current.target].length ? data[current.target][data[current.target].length - 1].order + step : 0),
            date: new Date()
        });
        resetGraph();
        saveData();
    }, (err) => {
        console.log(err);
    });
}

function updateAll() {
    for (let botData of botsData) {
        for (let target of privateData.bots[botData.username].targets) {
            botsData.bot.getChatMembersCount(privateData.targets[target].id).then((res) => {
                addToData({
                    value: res,
                    order: (data[target].length ? data[target][data[target].length - 1].order + step : 0),
                    date: new Date(),
                    target: target
                });
            }, (err) => {
                console.log(err);
            });
        }
    }
    resetGraph();
    saveData();
}

function updatePanel() {
    // current.botsData.bot.getMe().then((user) => {
    //     panelBotName.innerText = user.first_name;
    // }, (err) => {
    //     console.log(err);
    //     });
    if (!current.botsData || !current.botsData.username) return;
    panelBotName.innerText = privateData.bots[current.botsData.username].first_name || current.botsData.username;
    if (!current.target) { console.log("no target"); return; };
    panelCurrent.innerText = data[current.target].length ? data[current.target][data[current.target].length - 1].value : 0;
    panelName.innerText = privateData.targets[current.target].title;
    // current.botsData.bot.getChat(privateData.targets[current.target].id).then((chat) => {
    //     panelName.innerText = chat.title;
    // },
    // (err) => { 
    //     console.log(err);
    // });
}

function createVerticalCoordinates() {
    for (let i = 0; i < verticalCoordsStepNum; i++) {
        let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("class", "coordinates");
        line.setAttribute("x1", leftPx - coordsAdditionalSize / 2);
        line.setAttribute("x2", leftPx + coordsAdditionalSize / 2);
        line.setAttribute("y1", height - bottomPx - (i + 1) * ((height - bottomPx - topPx) / verticalCoordsStepNum));
        line.setAttribute("y2", height - bottomPx - (i + 1) * ((height - bottomPx - topPx) / verticalCoordsStepNum));
        verticalAdditional.appendChild(line);
    }
}

function createHorizontalCoordinates() {
    for (let i = 0; i < Math.floor(width / horizontalCoordsStep); i++) {
        let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("class", "coordinates");
        line.setAttribute("y1", height - bottomPx - coordsAdditionalSize / 2);
        line.setAttribute("y2", height - bottomPx + coordsAdditionalSize / 2);
        line.setAttribute("x1", leftPx + (i + 1) * horizontalCoordsStep);
        line.setAttribute("x2", leftPx + (i + 1) * horizontalCoordsStep);
        horizontalAdditional.appendChild(line);
        currentHorizontalCoordsNum += 1;
    }
}

function checkHorizontalCoordinates() {
    while (Math.floor(width / horizontalCoordsStep) > currentHorizontalCoordsNum) {
        let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("class", "coordinates");
        line.setAttribute("y1", height - bottomPx - coordsAdditionalSize / 2);
        line.setAttribute("y2", height - bottomPx + coordsAdditionalSize / 2);
        line.setAttribute("x1", leftPx + (currentHorizontalCoordsNum + 1) * horizontalCoordsStep);
        line.setAttribute("x2", leftPx + (currentHorizontalCoordsNum + 1) * horizontalCoordsStep);
        horizontalAdditional.appendChild(line);
        currentHorizontalCoordsNum += 1;
    }
}

function resetDims() {
    graphSVG.setAttribute("viewBox", `0 0 ${width + rightPx + leftPx} ${height}`);
    graphSVG.style.width = width + rightPx + leftPx;
    coordinatesSVG.setAttribute("viewBox", `0 0 ${width + rightPx + leftPx} ${height}`);
    coordinatesSVG.style.width = width + rightPx + leftPx;
    checkHorizontalCoordinates();
}

function resetScrolls() {
    scrollSolver.scrollTo(width, 0);
}

function resetVerticalScale() {
    verticalScale = Math.abs((height - topPx - bottomPx) / (verticalTo - verticalFrom));
}

function resetGraph() {
    console.log("reseting graph");
    scaledPoints = [];
    if (!current.target) {
        polygonStroke.setAttribute("points", "");
        polygon.setAttribute("points", "");
        return;
    }
    for (let element of data[current.target]) {
        addPoint(element.order, element.value);
    }
}

function resize(from, to) {
    verticalFrom = from;
    verticalTo = to;
    resetVerticalScale();
    resetGraph();
}

function addArrays() {
    res = [];
    for (let arg of arguments) {
        for (let curr of arg) {
            res.push(curr);
        }
    }
    return res;
}

function addToData({ value, order, date, target }) {
    if (!target) target = current.target;
    if (!data[target]) {
        data[target] = [];
    }
    data[target].push({
        value: value,
        order: order,
        date: date
    });
}

function addPoint(x, y) {
    scaledPoints.push([x + leftPx, height - bottomPx - (y - verticalFrom)* verticalScale]);
    polygonStroke.setAttribute("points", scaledPoints.map(x => `${Math.floor(x[0])},${Math.floor(x[1])}`).join(" "));
    polygon.setAttribute("points", (addArrays([
        [scaledPoints[0][0], height]
    ], scaledPoints, [
        [scaledPoints[scaledPoints.length - 1][0], height]
    ])).map(x => `${Math.floor(x[0])},${Math.floor(x[1])}`).join(" "));
    let polW = polygon.getBoundingClientRect().width;
    if (polW + polygonOffset > width || polW + polygonOffset < width - graphContainer.getBoundingClientRect().width) { // Enabling to shrink too
        width = polW + polygonOffset;
        resetDims();
        resetScrolls();
    }
}

function switchToBot(username) {
    if (username == current.botsData.username) return;
    current.botsData = botsData[username];
    switchToTarget(privateData.bots[username].targets[0], true);
    ipcRenderer.send("privateData", privateData, privateData.bots[current.botsData.username].targets);
    updatePanel();
    resetGraph();
    saveData();
}

function switchToTarget(username, isStep=false) {
    if (current.target == username) return;
    current.target = username;
    if (!isStep) {
        resetGraph();
        updatePanel();
        saveData();
    }
}

function init() {
    let r = graphContainer.getBoundingClientRect();
    width = r.width;
    height = r.height;
    resetVerticalScale();
    createVerticalCoordinates();
    createHorizontalCoordinates();
    horizontalMain.setAttribute("y1", height - 16);
    horizontalMain.setAttribute("y2", height - 16);
    resetDims();

    // graphContainer.onmouseenter = function () {
    //     infoPanel.style.display = "block";
    // };
    infoPanel.style.display = "none";
    let lastIndex = -1;
    graphContainer.onmouseleave = function () {
        infoPanel.style.display = "none";
        lastIndex = -1;
    };
    let infoPanelHeight, infoPanelWidth;
    graphContainer.onmousemove = function (event) {
        let x = scrollSolver.scrollLeft + event.pageX - leftPx - polygonOffset;
        let index = Math.round(x / step);
        if (index >= 0 && index < scaledPoints.length) {
            if (index != lastIndex) {
                if (infoPanel.style.display == "none") infoPanel.style.display = "block";
                if (!infoPanelHeight)
                    infoPanelHeight = infoPanel.getBoundingClientRect().height;
                infoPanelWidth = infoPanel.getBoundingClientRect().width;

                lastIndex = index;
                infoPanel.style.top = (scaledPoints[index][1] > infoPanelHeight) ? scaledPoints[index][1] : infoPanelHeight;
                infoPanel.style.left = scaledPoints[index][0];

                let graphContainerWidth = graphContainer.getBoundingClientRect().width;
                if (scaledPoints[index][0] - infoPanelWidth / 2 < 0) {
                    infoPanel.style.left = infoPanelWidth / 2;
                } else if (graphContainerWidth > width) {
                    if (scaledPoints[index][0] + infoPanelWidth / 2 > graphContainerWidth) {
                        infoPanel.style.left = graphContainerWidth - infoPanelWidth / 2;
                    }
                } else if (scaledPoints[index][0] + infoPanelWidth / 2 > width + leftPx + rightPx) {
                    infoPanel.style.left = width + leftPx + rightPx - infoPanelWidth / 2;
                }

                infoPanelCurrent.innerText = data[current.target][index].value;
                if (index > 0) {
                    let res = data[current.target][index].value - data[current.target][index - 1].value;
                    if (res > 0) {
                        infoPanelVariance.innerText = "+" + res;
                        infoPanelVariance.className = "success";
                    } else if (res < 0) {
                        infoPanelVariance.innerText = res;
                        infoPanelVariance.className = "fail";
                    } else {
                        infoPanelVariance.innerText = "-";
                        infoPanelVariance.className = "";
                    }
                } else {
                    infoPanelVariance.innerText = "-";
                    infoPanelVariance.className = "";
                }
            }
        } else {
            infoPanel.style.display = "none";
            lastIndex = -1;
        }
    };
    loadBotsFromPrivateData();
    updateData();
    resetGraph();
    updatePanel();
    ipcRenderer.send("privateData", privateData, privateData.bots[privateData.last.bot].targets);
    ipcRenderer.on('switch', (_, content) => {
        if (content.type == 'bot') {
            switchToBot(content.username);
        } else if (content.type == 'target') {
            switchToTarget(content.username);
        }
    });
    ipcRenderer.on('updateCurrent', () => {
        updateCurrent();
    });
    ipcRenderer.on('updateAll', () => {
        updateAll();
    });
    ipcRenderer.on('addBot', () => {
        botAdder();
    });
    ipcRenderer.on('addTarget', () => {
        targetAdder();
    });
}

function saveData() {
    fs.writeFileSync('./data.json', JSON.stringify(data));
    console.log(current);
    privateData.last.bot = current.botsData.username;
    privateData.last.target = current.target;
    savePrivateData();
}

function test() {
    // new popup.PopupInputPanelBigCentral({
    //     headerText: 'test',
    //     inputNames: ['some', 'thing'],
    //     finishFunction: (arg) => { console.log(arg); },
    //     buttons: [
    //         createButton({
    //             value: "Click me",
    //             onclick: () => { console.log("clicked"); },
    //         }),
    //     ],
    //     owner: container,
    //     onclose: (arg) => { console.log("onclose"); },
    //     buffered: false,
    //     width: 500,
    // });
    current.botsData.bot.getUpdates(offset = 1).then((res) => { console.log(res); }, (err) => { console.log(err); });
}

function updateData() {
    data = JSON.parse(fs.readFileSync('./data.json'));
}

window.onload = function () {
    init();
};