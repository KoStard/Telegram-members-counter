/* jshint esversion: 6 */

let width, height;
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

graphSVG.namespaceURI = "http://www.w3.org/2000/svg";
coordinatesSVG.namespaceURI = "http://www.w3.org/2000/svg";

let polygonOffset = 0;
let topPx = 16, bottomPx = 16, leftPx = 16, rightPx = 16;

let coordsAdditionalSize = 8;

let step = 25,
    horizontalCoordsStep = 50,
    currentHorizontalCoordsNum = 0,
    pageOffsetX = 0;

let verticalFrom = 0,
    verticalTo = 1000,
    verticalScale,
    verticalCoordsStepNum = 10;

let scaledPoints = [];
let data = [];

function createVerticalCoordinates() {
    for (let i = 0; i < verticalCoordsStepNum; i++) {
        let line = document.createElementNS("http://www.w3.org/2000/svg","line");
        line.setAttribute("class", "coordinates");
        line.setAttribute("x1", leftPx - coordsAdditionalSize / 2);
        line.setAttribute("x2", leftPx + coordsAdditionalSize / 2);
        line.setAttribute("y1", height - bottomPx - (i + 1) * ((height - bottomPx - topPx) / verticalCoordsStepNum));
        line.setAttribute("y2", height - bottomPx - (i + 1) * ((height - bottomPx - topPx) / verticalCoordsStepNum));
        verticalAdditional.appendChild(line);
    }
}

function createHorizontalCoordinates() {
    for (let i = 0; i < Math.floor(width / horizontalCoordsStep); i++){
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

function resetScrolls(){
    scrollSolver.scrollTo(width, 0);
}

function resetVerticalScale() {
    verticalScale = Math.abs((height - topPx - bottomPx) / (verticalTo - verticalFrom));
}

function resetGraph() {
    console.log("reseting graph");
    scaledPoints = [];
    for (let element of data) {
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

function addPoint(x, y) {
    scaledPoints.push([x+leftPx, height - bottomPx - y*verticalScale]);
    polygonStroke.setAttribute("points", scaledPoints.map(x=>`${Math.floor(x[0])},${Math.floor(x[1])}`).join(" "));
    polygon.setAttribute("points", (addArrays([[scaledPoints[0][0], height]], scaledPoints, [[scaledPoints[scaledPoints.length-1][0], height]])).map(x=>`${Math.floor(x[0])},${Math.floor(x[1])}`).join(" "));
    let polW = polygon.getBoundingClientRect().width;
    if (polW + polygonOffset > width || polW + polygonOffset < width - graphContainer.getBoundingClientRect().width) { // Enabling to shrink too
        width = polW + polygonOffset;
        resetDims();
        resetScrolls();
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

    graphContainer.onmouseenter = function () {
        infoPanel.style.display = "block";
    };
    graphContainer.onmouseleave = function () {
        infoPanel.style.display = "none";
    };
    let lastIndex = -1;
    let infoPanelHeight, infoPanelWidth;
    graphContainer.onmousemove = function (event) {
        let x = scrollSolver.scrollLeft + event.pageX - leftPx - polygonOffset;
        let index = Math.floor(x / step);
        if (index >= 0 && index < data.length && index != lastIndex) {
            if (!infoPanelHeight)
                infoPanelHeight = infoPanel.getBoundingClientRect().height;
            infoPanelWidth = infoPanel.getBoundingClientRect().width;

            lastIndex = index;
            infoPanel.style.top = (scaledPoints[index][1] > infoPanelHeight) ? scaledPoints[index][1] : infoPanelHeight;
            infoPanel.style.left = scaledPoints[index][0];

            if (scaledPoints[index][0] - infoPanelWidth/2 < 0) {
                infoPanel.style.left = infoPanelWidth / 2;
            } else if (scaledPoints[index][0] + infoPanelWidth/2 > width + leftPx + rightPx) {
                infoPanel.style.left = width + leftPx + rightPx - infoPanelWidth/2;
            }

            infoPanelCurrent.innerText = data[index].value;
            if (index > 0) {
                let res = data[index].value - data[index - 1].value;
                if (res > 0) {
                    infoPanelVariance.innerText = "+"+res;
                    infoPanelVariance.className = "success";
                } else if (res < 0) {
                    infoPanelVariance.innerText = res;
                    infoPanelVariance.className = "fail";
                } else {
                    infoPanelVariance.innerText = res;
                    infoPanelVariance.className = "";
                }
            } else {
                infoPanelVariance.innerText = "-";
                infoPanelVariance.className = "";
            }
        } else {

        }
    };
}

window.onload = function() {
    init();

    for (let i = 0; i < 26; i++){ 
        data.push({
            order: i * step,
            value: Math.floor(Math.random() * 1000)
        });
    }

    resetGraph();
};