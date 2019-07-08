const { ipcRenderer } = require('electron')
const util = require('util')
const remote = require('electron').remote
const app = require('electron').remote.app
const { dialog } = require('electron').remote
const clipboard = require('electron').clipboard

search = (page) => {
  const keyword = document.querySelector('#keyword')
  const params = {}
  params.page = page
  params.keyword = keyword.value
  ipcRenderer.send('searchByKeyword', params)
}

keydown = () => {
  if (window.event.keyCode == 13) {
    search()
  }
}

document.querySelector('#searchBtn').addEventListener('click', () => {
  search()
})

ipcRenderer.on('reply', (event, resultItems) => {
  const result = document.querySelector('#result')
  // remove all child elements
  // result.innerHTML = ''; is slower
  while (result.firstChild) {
    result.removeChild(result.firstChild);
  }
  const table = document.createElement("table")
  let tr = document.createElement("tr")
  let itemCount = 0

  // show result as table
  for (const item of resultItems) {
    // row
    if (itemCount % 4 === 0) {
      if (itemCount !== 0) {
        table.appendChild(tr)
        tr = document.createElement("tr")
      }
    }
    const td = document.createElement("td")
    td.setAttribute("width", "25%")

    // artist name
    const artist = item.artist
    const artistP = document.createElement("p")
    artistP.innerText = artist
    td.appendChild(artistP)

    // title
    const title = item.title
    const titleP = document.createElement("p")
    titleP.innerText = title
    td.appendChild(titleP)

    // copy button
    const copyP = document.createElement("p")
    const copy = document.createElement("button")
    copy.setAttribute("class", "copyName")
    copy.textContent = "copy"
    copy.setAttribute("artist", artist)
    copy.setAttribute("title", title)
    copyP.appendChild(copy)
    td.appendChild(copyP)

    // image
    const imgUrl = item.img
    const imgElm = document.createElement("img")
    imgElm.src = imgUrl
    imgElm.alt = title
    imgElm.title = title
    imgElm.setAttribute("class", "smallImage")
    imgElm.setAttribute("artist", artist)
    td.appendChild(imgElm)

    tr.appendChild(td)

    itemCount++
  }
  table.appendChild(tr)
  result.appendChild(table)

  // paging button
  let currentPage = 0
  const currentPageElem = document.querySelector("#currentPage")
  if (currentPageElem) {
    currentPage = Number(currentPageElem.innerText)
    console.log("currentPage! " + currentPage)
  }
  currentPage = currentPage + 1

  const currentPageSpan = document.createElement("span")
  currentPageSpan.setAttribute("id", "currentPage")
  currentPageSpan.innerText = currentPage

  const previous = document.createElement("button")
  previous.setAttribute("class", "previous")
  previous.textContent = "previous"
  previous.setAttribute("page", currentPage - 1)

  const next = document.createElement("button")
  next.setAttribute("class", "next")
  next.textContent = "next"
  next.setAttribute("page", currentPage + 1)

  // clear
  const paging = document.querySelector('#paging')
  while (paging.firstChild) {
    paging.removeChild(paging.firstChild);
  }

  paging.appendChild(previous)
  paging.appendChild(currentPageSpan)
  paging.appendChild(next)

  document.querySelector('.next').addEventListener('click', () => {
    search(currentPage + 1)
  })
  document.querySelector('.previous').addEventListener('click', () => {
    search(currentPage - 1)
  })

  // Retain the searching word
  // document.querySelector('#keyword').value = ""

  const smallImages = document.getElementsByClassName("smallImage")

  Array.from(smallImages).forEach((element) => {
    element.addEventListener('click', () => {

      const artist = element.getAttribute("artist").replace(/\s+/g, '_').replace(/\//g, '')
      const title = element.getAttribute("title").replace(/\s+/g, '_').replace(/\//g, '')
      const imgUrl = element.getAttribute("src")
      console.log("image clicked! " + artist + ", " + title)

      const options = {
        title: 'Save Dialog',
        defaultPath: app.getPath('desktop') + '/' + artist + '-' + title + '.jpg',
        filters: [
          { name: 'Images', extensions: ['jpg', 'png', 'gif'] },
          { name: 'Documents', extensions: ['txt', 'html'] },
        ]
      }

      dialog.showSaveDialog(null, options, (fullPath) => {
        if (!fullPath) {
          // when click cancel button
          return
        }

        console.log("fullPath:" + fullPath)
        const filename = fullPath.replace(/^.*[\\\/]/, '')
        ipcRenderer.send("download", {
          // electron-dlのsaveAs: trueでもダイアログを出すことは可能だが、
          // ディレクトリやファイル名の指定ができ無さそうなので使用しない
          url: imgUrl,
          opts: {
            directory: ".",
            filename: filename
          }
        })
      })
    })
  })

  const copyButtons = document.getElementsByClassName("copyName")
  Array.from(copyButtons).forEach((element) => {
    element.addEventListener('click', () => {
      const artist = element.getAttribute("artist").replace(/\s+/g, '_').replace(/\//g, '')
      const title = element.getAttribute("title").replace(/\s+/g, '_').replace(/\//g, '')
      clipboard.writeText(artist + "-" + title)
    })
  })
})

function dump(v) {
  return console.log(util.inspect(v))
}
