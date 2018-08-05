/* jshint esversion: 6 */

let width, height;
let graphContainer = document.getElementById("graph-container");
let graph = document.getElementById("graph");
let scrollSolver = document.getElementById("scroll-solver");
let graphSVG = document.getElementById("graph-svg");
let polygon = document.getElementById("polygon");
let polygonStroke = document.getElementById("polygon-stroke");

let polygonOffset = 0;

function resetDims(){
    graphSVG.setAttribute("viewBox", `0 0 ${width} ${height}`);
    graphSVG.style.width = width;
}

function resetScrolls(){
    scrollSolver.scrollTo(width, 0);
}

let points = [];

function addArrays() {
    res = [];
    for (let arg of arguments) {
        for (let curr of arg) {
            res.push(curr);
        }
    }
    return res;
}

function addPoint(x, y){
    points.push([x, y]);
    // console.log(points.map(x=>`${Math.floor(x[0])},${Math.floor(x[1])}`).join(" "));
    polygonStroke.setAttribute("points", points.map(x=>`${Math.floor(x[0])},${Math.floor(x[1])}`).join(" "));
    polygon.setAttribute("points", (addArrays([[points[0][0], height]], points, [[points[points.length-1][0], height]])).map(x=>`${Math.floor(x[0])},${Math.floor(x[1])}`).join(" "));
    let polW = polygon.getBoundingClientRect().width;
    if (polW + polygonOffset > width) {
        width = polW + polygonOffset;
        resetDims();
        resetScrolls();
    }
}

function init() {
    let r = graphContainer.getBoundingClientRect();
    width = r.width;
    height = r.height-64;
    console.log(width, height);
    resetDims();
}
let x = 0;
function* adder() {
    while (true){
        yield addPoint(x, Math.random()*height); 
        x+=100;
    }
}
let intrvl;

function stop() {
    clearInterval(intrvl);
}

window.onload = function() {
    init();
    let dd = adder();
    intrvl = setInterval(function(){dd.next();}, 500);
};