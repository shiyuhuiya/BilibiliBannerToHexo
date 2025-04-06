## 部署到Hexo的步骤

* download zip：下载仓库中的文件压缩包，并解压到任意位置

* 将解压后得到的文件夹：`BilibiliBannerToHexo-master`，剪切到自己博客项目根目录下的source目录中

* 打开`blog\themes\butterfly\layout\includes\header\index.pug`文件，添加如下代码，我这里使用的是butterfly主题，其他主题可能添加结构的方法有所不同。

  ```pug
  header#page-header(class=`${headerClassName + isFixedClass}` style=bg_img)
    include ./nav.pug
    div#app //这行是新加的代码
  ```

  这行代码的作用就是在`header#page-header`添加一个`id=app`的div，这个容器后续盛放我们的banner

* ok，对源码的修改到此为止

* 接下来打开博客主题的配置文件（我的主题是butterfly），注入我们编写好的css，js文件

  ```yaml
  inject:
    head:
      - <link rel="stylesheet" href="/bilibiliBanner/banner.css">
    bottom:
      - <script src="/bilibiliBanner/banner.js" defer></script>
  ```

* 然后就ok啦

## 爬取B站banner

* 下载puppeteer：

  ```bash
  npm i puppeteer -D
  ```

* 在package.json中配置：

  ```json
    "scripts": {
      .....
      "grap": "node source/bilibiliBanner/grap.js"
    },
  ```

  再运行：

  ```js
  npm run grap
  ```

  就开始爬取B站banner了。

## 主要参考文章和资料

文章：[如何用原生 JS 复刻 Bilibili 首页头图的视差交互效果最近发现 B 站首页头图的交互效果非常有趣，本文将通过 - 掘金](https://juejin.cn/post/7269385060611997711)

Github地址：[palxiao/bilibili-banner: 一键复刻 B 站首页动态 Banner，本仓库记录其历史Banner以供学习和欣赏（自2023-08-21开始）](https://github.com/palxiao/bilibili-banner)

