const { app, BrowserWindow } = require('electron')
const { ipcMain } = require('electron')
const cheerio = require('cheerio')
const rp = require('request-promise')
const { download } = require("electron-dl")
const sharp = require('sharp')
const fs = require('fs')


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({ width: 1200, height: 800 })

  // and load the index.html of the app.
  win.loadFile('index.html')

  // Open the DevTools.
  win.webContents.openDevTools()

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on('searchByKeyword', (event, arg) => {
  const options = {
    transform: (body) => {
      return cheerio.load(body)
    }
  }

  const keyword = arg.keyword
  const page = arg.page

  let pageParam = ""
  if (page && 1 < page) {
    pageParam = "&page=" + page
  }

  // replace spaces
  const query = keyword.replace(/[ 　]+/g, ' ').replace(/ /g, '+')
  const url = 'https://www.amazon.co.jp/s?k=' + encodeURIComponent(query) + pageParam
  console.log("Get URL: " + url)
  rp.get(url, options)
    .then(($) => {
      const data = []

      $('.s-result-item').each((i, elem) => {

        const sgColInner = $(elem).children('.sg-col-inner')

        // image
        const imageUrl = $(sgColInner).find('.s-image-square-aspect').children().attr('src')
        // console.log('imageUrl: ' + imageUrl)

        // artist, album
        const topSmall = $(sgColInner).find('.a-spacing-top-small')
        const h2Selector = $(topSmall).find('h2')
        const album = $(h2Selector).children().text().trim()
        const artist = $(h2Selector).parent().children('.a-color-secondary').text().trim()
        // console.log(artist + ' - ' + album)

        let result = {}
        result.artist = artist
        result.title = album
        result.img = imageUrl
        data.push(result)
      })

      event.sender.send('reply', data)

    }).catch((error) => {
      console.error('Error:', error)
    })

  return
})

ipcMain.on("download", (event, info) => {
  download(BrowserWindow.getFocusedWindow(), info.url, info.opts)
    .then(downloadItem => {
      const savePath = downloadItem.getSavePath()
      console.log("getSavePath=" + savePath)
      console.log("original size=" + downloadItem.getReceivedBytes())
      if (savePath) {
        sharp.cache(false)
        sharp(savePath)
          .rotate()
          .resize({ width: 200 })
          .toBuffer()
          .then(data => {
            console.log("resized! size=" + data.length)
            fs.writeFileSync(savePath, data)
          })
          .catch(err => {
            console.log("error! while resizing. err=" + err)
          })
      }
    })
})
