import { readdir, rename, mkdir, access } from 'fs/promises'
import { parse, extname, basename } from 'path'
import StreamZip from 'node-stream-zip'
import cheerio from 'cheerio'

// 文件重命名
async function suffixChange(inType, outType, path) {
    try {
        const files = await readdir(path);
        for (const file of files) {
            let fileSeq = parse(file);
            if (fileSeq.ext === inType) {
                let newFile = fileSeq.name + outType;
                let newPath = path + '/' + newFile;
                await rename(file, newPath);
            }
        }
          
    } catch (err) {
        console.error(err)
    }
}

// 单个压缩包根据 html 文件中的图片地址进行提取
async function loadZipImg(zipFile, cacheFolder) {

    const comicName = zipFile.match(/moe](.+?)\.+?/)[1];
    console.log(comicName)
    const comicCacheFolder = cacheFolder + '/' + comicName;
    await mkdir(comicCacheFolder, { recursive: true });
    console.log(comicCacheFolder)

    const zip = new StreamZip.async({ file : zipFile })
    const entriesCount = await zip.entriesCount
    console.log(`Entries read: ${entriesCount}`)

    const entries = await zip.entries()
    
    const re = /^\d{1,3}.html$/

    for (const entry of Object.values(entries)) {
        const entryName =  basename(entry.name)
        if (entryName === 'cover.jpg' || entryName === 'cover.png') {
            await zip.extract(entry.name, comicCacheFolder + '/' + entryName)
        }
        if (re.test(entryName)) {
            const $ = cheerio.load(await zip.entryData(entry.name), { decodeEntities: false })
            console.log(entryName)
            const imgPath = $('.fs img').attr('src').slice(3)
            const title = $('title').text()
            await zip.extract(imgPath, comicCacheFolder + '/' + title + extname(imgPath))
            console.log(imgPath)
            
        }
    }

    await zip.close()
}

// 遍历压缩包进行图片提取分类
async function classfyComic(path, cacheFolder) {

    try {
        await access(cacheFolder, constants.R_OK | constants.W_OK);
    } catch (error) {
        await mkdir(cacheFolder, { recursive: true });
    }

    try {
        const files = await readdir(path);
        for (const file of files) {
            let fileExt = extname(file);
            if (fileExt === '.zip') {
                await loadZipImg(file, cacheFolder)
            }
        }
    } catch (error) {
        console.error(error)
    }
}

let path = '.'
const cacheFolder = path + '/cache'

suffixChange('.epub','.zip', path)
classfyComic(path, cacheFolder)