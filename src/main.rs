use std::fs;

mod vol;

const PATH: &str = "./dist";
const CACHE_FOLDER: &str = "./dist/cache";
const OUTPUT_FOLDER: &str = "./dist/output";

fn main() {
    // 开始重命名文件
    match vol::suffix_change("epub", "zip", "./dist") {
        Ok(_) => println!("OK"),
        Err(err) => println!("Err: {}", err),
    }
    //开始提取图片
    match vol::classfy_comic(PATH, CACHE_FOLDER) {
        Ok(_) => println!("提取OK"),
        Err(err) => println!("Err: {}", err),
    }
    // 开始打包图片
    match vol::pack_comic(CACHE_FOLDER, OUTPUT_FOLDER) {
        Ok(_) => println!("打包OK"),
        Err(err) => println!("Err: {}", err),
    }
    // 清理换成文件
    match fs::remove_dir_all(CACHE_FOLDER) {
        Ok(_) => println!("清理完成!"),
        Err(e) => println!("Err: {}", e),
    }
}
