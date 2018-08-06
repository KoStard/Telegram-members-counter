/* jshint esversion:6 */

const { app, BrowserWindow, Menu, ipcMain } = require("electron");

let win;
function createWindow() {
    win = new BrowserWindow({ width: 800, height: 600 });
    win.loadFile("index.html");
    // win.webContents.openDevTools();

    win.on('closed', () => {
        win = null;
    });
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform != 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (win == null) {
        createWindow();
    }
});

ipcMain.on("privateData", (event, privateData, targets) => {
    template[template.length - 1].submenu[0].submenu = [];
    template[template.length - 1].submenu[1].submenu = [];
    for (let el of Object.keys(privateData.bots))
        template[template.length - 1].submenu[0].submenu.push({
            label: el,
            click: () => { 
                win.webContents.send("switch", {
                    type: 'bot',
                    username: el
                });
            }
        });
    for (let el of targets)
        template[template.length - 1].submenu[1].submenu.push({
            label: el,
            click: () => {
                win.webContents.send("switch", {
                    type: 'target',
                    username: el
                });
            }
        });
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
});

const template = [{
    label: 'Edit',
    submenu: [{
        role: 'undo'
    },
    {
        role: 'redo'
    },
    {
        type: 'separator'
    },
    {
        role: 'cut'
    },
    {
        role: 'copy'
    },
    {
        role: 'paste'
    },
    {
        role: 'pasteandmatchstyle'
    },
    {
        role: 'delete'
    },
    {
        role: 'selectall'
    }
    ]
},
{
    label: 'View',
    submenu: [{
        role: 'reload'
    },
    {
        role: 'forcereload'
    },
    {
        role: 'toggledevtools'
    },
    {
        type: 'separator'
    },
    {
        role: 'resetzoom'
    },
    {
        role: 'zoomin'
    },
    {
        role: 'zoomout'
    },
    {
        type: 'separator'
    },
    {
        role: 'togglefullscreen'
    }
    ]
},
{
    role: 'window',
    submenu: [{
        role: 'minimize'
    },
    {
        role: 'close'
    }
    ]
},
{
    role: 'help',
    submenu: [{
        label: 'Learn More',
        click() {
            require('electron').shell.openExternal('https://electronjs.org')
        }
    }]
}, {
    label: 'Update',
    submenu: [{
        label: 'Update Current',
        click() {
            win.webContents.send("updateCurrent");
        }
    }, {
        label: 'Update All',
        click() {
            win.webContents.send("updateAll");
        }
    }]
},
{
    label: 'Switch',
    submenu: [
        {
            label: 'Bots',
            submenu: []
        },
        {
            label: 'Targets',
            submenu: []
        }
    ]
    }
];

if (process.platform === 'darwin') {
    template.unshift({
        label: app.getName(),
        submenu: [{
            role: 'about'
        },
        {
            type: 'separator'
        },
        {
            role: 'services',
            submenu: []
        },
        {
            type: 'separator'
        },
        {
            role: 'hide'
        },
        {
            role: 'hideothers'
        },
        {
            role: 'unhide'
        },
        {
            type: 'separator'
        },
        {
            role: 'quit'
        }
        ]
    });

    // Edit menu
    template[1].submenu.push({
        type: 'separator'
    }, {
            label: 'Speech',
            submenu: [{
                role: 'startspeaking'
            },
            {
                role: 'stopspeaking'
            }
            ]
        });

    // Window menu
    template[3].submenu = [{
        role: 'close'
    },
    {
        role: 'minimize'
    },
    {
        role: 'zoom'
    },
    {
        type: 'separator'
    },
    {
        role: 'front'
    }
    ];
}