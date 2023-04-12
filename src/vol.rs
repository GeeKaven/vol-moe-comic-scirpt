use std::{
    collections::HashMap,
    fs::{self, File},
    io::{self, Read},
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use lazy_static::lazy_static;
use regex::Regex;
use select::{document::Document, predicate::Name};
use zip::{write::FileOptions, ZipArchive, ZipWriter};

pub fn suffix_change(in_type: &str, out_type: &str, path: &str) -> Result<()> {
    let dir = fs::read_dir(path).with_context(|| format!("错误的文件夹路径: {}", path))?;
    for entry in dir {
        let file = entry?.path();
        let ext = file.extension().unwrap_or("".as_ref());

        if ext == in_type {
            let new_name = format!(
                "{}.{}",
                file.file_stem().unwrap().to_str().unwrap(),
                out_type
            );
            fs::rename(&file, &file.with_file_name(new_name))?;
        }
    }
    Ok(())
}

pub fn classfy_comic(path: &str, cache: &str) -> Result<()> {
    if let Err(_) = fs::create_dir(cache) {};

    let dir = fs::read_dir(path).with_context(|| format!("错误的文件夹路径: {}", path))?;
    for entry in dir {
        let file = entry?.path();
        let ext = file.extension().unwrap_or("".as_ref());
        if ext == "zip" {
            load_img_from_zip(&file, cache)?;
        }
    }

    Ok(())
}

fn load_img_from_zip(file: &PathBuf, cache: &str) -> Result<()> {
    let filename = file.file_name().unwrap().to_str().unwrap();

    println!("开始提取: {:?}", filename);

    lazy_static! {
        static ref RE: Regex = Regex::new(r"\](.+?)\.+?").unwrap();
    }

    let caps = RE.captures(filename).unwrap();
    let comic_name = &caps[1];
    let comic_path = Path::new(cache).join(comic_name);
    if let Err(_) = fs::create_dir_all(&comic_path) {};

    let mut archive = ZipArchive::new(File::open(file)?)?;

    let mut image_map = HashMap::new();

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let entry_name = file
            .enclosed_name()
            .unwrap()
            .file_name()
            .unwrap()
            .to_str()
            .unwrap();

        lazy_static! {
            static ref RE_HTML: Regex = Regex::new(r".html$").unwrap();
            static ref RE_FILE_NAME: Regex = Regex::new(r"([^/]+)$").unwrap();
        }

        if RE_HTML.is_match(entry_name) {
            let mut html_string = String::new();

            file.read_to_string(&mut html_string)?;

            let document = Document::from(html_string.as_str());
            let title = document.find(Name("title")).next().unwrap().text();
            let path = document
                .find(Name("img"))
                .next()
                .unwrap()
                .attr("src")
                .unwrap();
            let name_cap = RE_FILE_NAME.captures(path).unwrap();
            let key = name_cap[1].to_owned();
            image_map.insert(key, title);
        }
    }

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let entry_name = file
            .enclosed_name()
            .unwrap()
            .file_name()
            .unwrap()
            .to_str()
            .unwrap();

        if let Some(title) = image_map.get(entry_name) {
            let ext = file
                .enclosed_name()
                .unwrap()
                .extension()
                .unwrap_or("".as_ref());
            let mut out_path = comic_path.join(format!("{}.{}", title, ext.to_str().unwrap()));
            if entry_name == "cover.png"
                || entry_name == "cover.jpg"
                || entry_name == "createby.png"
            {
                out_path = comic_path.join(entry_name);
            }
            let mut out_file = File::create(out_path)?;
            io::copy(&mut file, &mut out_file)?;
        }
    }

    println!("提取完成: {:?}", filename);
    Ok(())
}

pub fn pack_comic(cache: &str, output: &str) -> Result<()> {
    let dir = fs::read_dir(cache).with_context(|| format!("错误的文件夹路径: {}", cache))?;

    for entry in dir {
        let file = entry?.path();
        pack_folder(&file, output)?
    }

    Ok(())
}

fn pack_folder(comic_foler: &PathBuf, output_folder: &str) -> Result<()> {
    if let Err(_) = fs::create_dir_all(output_folder) {};

    let comic_folder_name = comic_foler.file_name().unwrap();
    println!("开始打包: {:?}", comic_folder_name);

    if comic_folder_name.to_str().unwrap().starts_with(".") {
        return Ok(());
    }

    let out_dir_path =
        Path::new(output_folder).join(format!("{}.zip", comic_folder_name.to_str().unwrap()));
    let out_file = File::create(&out_dir_path).unwrap();

    let options = FileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    let mut zip = ZipWriter::new(out_file);

    for entry in fs::read_dir(comic_foler)? {
        let path = entry?.path();
        if path.is_file() {
            let file_name = path.file_name().unwrap().to_str().unwrap().to_owned();
            zip.start_file(file_name, options)?;
            let mut file = File::open(&path)?;
            io::copy(&mut file, &mut zip)?;
        }
    }

    zip.finish()?;

    println!("打包完成: {:?}", comic_folder_name);
    Ok(())
}
