# mox.moe 转换脚本

漫画网站 [mox.moe](http://mox.moe/)原 vol.moe 仅提供 epub 和 kindle 下载，并没有图片压缩包。在部分漫画阅读软件中打开图片会混乱。因此写了一个简单的脚本将下载下来的 epub 文件转换为顺序的 jpg 文件压缩包

## 安装
### 克隆此项目
```
git clone https://github.com/GeeKaven/vol-moe-comic-scirpt.git
cd vol-moe-comic-scirpt
```

### 安装依赖
`npm install` or `pnpm install` or `yarn install`

### 运行命令
漫画文件已原文件名为准 例如：`[Mox.moe][死亡筆記(全彩版)]卷01.kepub.epub`
```shell
node vol.js --path='漫画 epub 文件所在文件夹路径'
```

处理后的文件会输出在 output 文件夹中
