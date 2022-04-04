import { readdir, rename, mkdir, access, open, rm } from 'fs/promises'
import { parse, extname, basename } from 'path'
import StreamZip from 'node-stream-zip'
import archiver from 'archiver'
import cheerio from 'cheerio'
import minimist from 'minimist'

// 文件重命名
async function suffixChange(inType, outType, path) {
    try {
        const files = await readdir(path);
        for (const file of files) {
            let fileSeq = parse(file);
            if (fileSeq.ext === inType) {
                let newFile = fileSeq.name + outType;
                let oldPath = path + '/' + file;
                let newPath = path + '/' + newFile;
                await rename(oldPath, newPath);
            }
        }

    } catch (err) {
        console.error(err)
    }
}

// 单个压缩包根据 html 文件中的图片地址进行提取
async function loadZipImg(zipFile, cacheFolder) {

    console.log(`开始解析 ${zipFile}`)
    const comicName = zipFile.match(/moe](.+?)\.+?/)[1];
    console.log(`${comicName} => 开始提取 `)
    const comicCacheFolder = cacheFolder + '/' + comicName;
    await mkdir(comicCacheFolder, { recursive: true });

    const zip = new StreamZip.async({ file: zipFile })
    const entries = await zip.entries()

    const re = /^\d{1,3}.html$/

    for (const entry of Object.values(entries)) {
        const entryName = basename(entry.name)
        if (entryName === 'cover.jpg' || entryName === 'cover.png') {
            await zip.extract(entry.name, comicCacheFolder + '/' + entryName)
        }
        if (re.test(entryName)) {
            const $ = cheerio.load(await zip.entryData(entry.name), { decodeEntities: false })
            const imgPath = $('.fs img').attr('src').slice(3)
            const title = $('title').text()
            await zip.extract(imgPath, comicCacheFolder + '/' + title + extname(imgPath))
        }
    }

    await zip.close()
    console.log(`${comicName} => 提取完成 `)

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
                await loadZipImg(path + '/' + file, cacheFolder)
            }
        }
    } catch (error) {
        console.error(error)
    }
}

async function packFolder(comicFolder, cacheFolder, outputFolder) {
    try {

        const outputFd = await open(outputFolder + '/' + comicFolder + '.zip', 'w');
        const output = outputFd.createWriteStream();

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        archive.pipe(output)

        const files = await readdir(cacheFolder + '/' + comicFolder);
        for (const file of files) {
            archive.file(cacheFolder + '/' + comicFolder + '/' + file, { name: file });
        }
        await archive.finalize();

    } catch (error) {
        console.log(error)
    }
}

// 重新打包
async function packComic(cacheFolder, outputFolder) {
    try {
        await access(cacheFolder, constants.R_OK | constants.W_OK);
    } catch (error) {
        await mkdir(outputFolder, { recursive: true });
    }

    try {
        const files = await readdir(cacheFolder);
        for (const file of files) {
            await packFolder(file, cacheFolder, outputFolder)
            console.log(`${file} 已打包`)
        }
    } catch (error) {
        console.error(error)
    }
}

const argv = minimist(process.argv.slice(2));

let path = argv['path'] || ''
console.log(path)

if (path) {
    const cacheFolder = path + '/cache'
    const outputFolder = path + '/output'

    console.log('============> 开始重命名文件')
    await suffixChange('.epub', '.zip', path)

    console.log('============> 开始提取图片')
    await classfyComic(path, cacheFolder)

    console.log('============> 开始打包')
    await packComic(cacheFolder, outputFolder)

    console.log('============> 开始清理缓存文件')
    await rm(cacheFolder, { recursive: true })
    console.log('============> 完成')
} else {
    console.log('请输入漫画 epub 文件所在文件夹路径')
}

// TODO: 增加多线程支持