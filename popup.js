/* jshint esversion: 6 */

module.exports = {
    createResponsiveFunction: createResponsiveFunction,
    PopupAlertPanelSmall: PopupAlertPanelSmall,
    PopupInputPanelBigCentral: PopupInputPanelBigCentral,
    runningPopup: () => { return runningPopup; },
    removeRunningPopup: () => { runningPopup.close(); runningPopup=undefined; }
};
let runningPopup;
function createResponsiveFunction({func, popupAlertPanel, startInfo, successInfo, successLogic, errorInfo}) {
    return (attrs)=>{
        if (startInfo) {
            new popupAlertPanel(startInfo);
        }
        try{
            let successLogicResp = (successLogic?successLogic(attrs):true);
            if (func(attrs) === false) throw false;
            if (successInfo && successLogicResp) new popupAlertPanel(successInfo);
        } catch (err) {
            if (errorInfo == 'error') {
                new popupAlertPanel({text:err});
            }else if (errorInfo) {
                new popupAlertPanel(errorInfo);
            }
        }
    };
}

function PopupAlertPanelSmall({ text, color, icon, parent, delay, onclick }) {
    if (!parent) parent = document.body;
    if (!delay) delay = 2000;
    if (!color) color = '#fff';
    let oldPanels = document.getElementsByClassName('popupAlertPanelSmall');
    for (let oldPanel of oldPanels) {
        oldPanel.remove();
    }
    let panel = document.createElement('div');
    panel.className = 'popupAlertPanelSmall';
    panel.innerHTML = `<p>${text}</p>`;
    panel.style.backgroundColor = color;
    if (onclick) {panel.onclick = onclick; panel.style.cursor = 'pointer';}
    parent.appendChild(panel);
    this.panel = panel;
    setTimeout(()=>{
        panel.remove();
    }, delay);
}

function PopupBigPanelCentral({ owner, onclose, buffered }) {
    this.onclose = onclose;
    let panelHolder = document.createElement('div');
    panelHolder.className = 'popupBigPanelCentralHolder';

    let backgroundCover = document.createElement('div');
    backgroundCover.className = 'backgroundCover';
    panelHolder.appendChild(backgroundCover);

    let panel = document.createElement('div');
    panel.className = 'popupBigPanelCentral';
    panelHolder.appendChild(panel);

    owner.appendChild(panelHolder);

    this.panelHolder = panelHolder;
    this.panel = panel;
    if (buffered)
        this.hide = () => {
            if (this.onclose) this.onclose();
            runningPopup = undefined;
            this.panelHolder.style.display = "none";
        };
    this.exit = () => {
        this.onclose && this.onclose();
        runningPopup = undefined;
        this.panelHolder.remove();
    };
    this.close = () => {
        if (this.hide) this.hide();
        else this.exit();
    }
    backgroundCover.onclick = () => {
        if (this.hide) this.hide();
        else this.exit();
    };
}

function PopupInputPanelBigCentral({ headerText, inputNames, finishFunction, buttons, owner, onclose, initialState,
openingFunction, buffered = true, width}) {
    this.args = arguments[0];
    this.openingFunction = openingFunction;

    this.popupBigPanelCentral = new PopupBigPanelCentral({ owner: owner, buffered: buffered });
    this.panelHolder = this.popupBigPanelCentral.panelHolder;
    this.panelHolder.classList.add('popupInputPanelBigCentral');
    let panel = this.popupBigPanelCentral.panel;
    this.panel = panel;
    if (width) this.panel.style.width = width;
    
    let header = createPopupElement('div', ['text', 'header']);
    header.innerText = headerText;
    panel.appendChild(header);

    this.inputs = [];
    for (let inputName of inputNames) {
        let name = inputName.match(/^\*text([\s\S]+)/);
        if (name){
            name = name[1];
            let textarea = createPopupElement('textarea', ['standart', 'textarea']);
            textarea.setAttribute('placeholder', name);
            this.inputs.push(textarea);
            panel.appendChild(textarea);
        }else {
            let inp = createPopupElement('input', ['standart', 'input']);
            inp.type = 'text';
            inp.setAttribute('placeholder', inputName);
            this.inputs.push(inp);
            panel.appendChild(inp);
        }
    }

    for(let button of buttons) {
        button = makePopupElement(button, ['standart', 'button']);
        let tempFunc = button.onclick;
        button.onclick = ()=>{tempFunc(this);};
        panel.appendChild(button);
    }
    if (onclose) this.popupBigPanelCentral.onclose = () => { onclose(this); };

    this.focus = () => {
        if (this.inputs.length > 0) {
            this.inputs[0].focus();
        } else if (buttons.length > 0) {
            buttons[0].focus();
        }
    };

    this.exit = () => {
        this.popupBigPanelCentral.close();
    };

    if (buffered) {
        this.show = () => {
            runningPopup = this;
            this.panelHolder.style.display = "block";
            if (this.openingFunction) this.openingFunction(this);
            this.focus();
        };
        this.hide = () => {
            this.popupBigPanelCentral.hide();
        };
    } else {
        if (initialState!="hidden")
            this.focus();
    }

    this.close = () => {
        if (this.hide) this.hide();
        else this.exit();
    };

    if (initialState == "hidden") {
        this.hide();
    }

    if (finishFunction) finishFunction(this);
    return this;
}
let popupClassNames = {
    standart: 'popup-standart',
    textarea: 'popup-textarea',
    input: 'popup-input',
    button: 'popup-button',
    header: 'popup-header',
    text: 'popup-text'
};
function createPopupElement(name, mode) {
    let tempElem = document.createElement(name);
    if (!mode) mode = [popupClassNames.standart];
    tempElem.classList.add(...mode.map((x)=>{if (popupClassNames[x]) return popupClassNames[x];}));
    return tempElem;
}

function makePopupElement(elem, mode) {
    if (!mode) mode = [popupClassNames.standart];
    for (let curr of mode) {
        if (!popupClassNames[curr]) continue;
        curr = popupClassNames[curr];
        if (!elem.classList.contains(curr)) elem.classList.add(curr);
    }
    return elem;
}