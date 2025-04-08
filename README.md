## 部署到Hexo的步骤

* download zip：下载仓库中的文件压缩包，并解压到任意位置

* 将解压后得到的文件夹：`BilibiliBannerToHexo-master`，剪切到自己博客项目根目录下的source目录中

* 打开`blog\themes\butterfly\layout\includes\header\index.pug`文件，添加如下代码，我这里使用的是butterfly主题，其他主题添加结构的方法可能有所不同。

  ```pug
  header#page-header(class=`${headerClassName + isFixedClass}` style=bg_img)
    include ./nav.pug
  +  if is_home()
  +  	div#app 
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

## 更新记录

* 2025/4/7：

  * 修改`banner.js`文件：

    * 删除原作者使用`矩阵`来做样式变换的做法，使用原生css动画中的`translate，rotate，scale`，让代码更容易理解；

    * 同时删除了不必要的深拷贝代码，让代码内存占用更小。

    * 使用`requestAnimationFrame`包裹leave之后触发的回正动画，确保回正动画能触发，个人理解：`mousemove`和`mouseleave`的转变几乎就在一瞬间，且二者操作的都是所有layer的样式，对于`mousemove`触发的样式修改操作，我们使用了`requestAnimationFrame` 来包装，这就意味着样式修改是**异步执行**的，那么对于`mouseleave`触发的样式修改操作，也应该使用`requestAnimationFrame`来包裹，将回正样式修改操作放入帧级任务队列，否则就是同步执行的，可能会被异步执行的样式修改操作**覆盖**。关于`requestAnimationFrame`的介绍可参考：[hexo博客搭建的一些思考 | 三叶的博客](https://www.sanye.blog/posts/72ebd24d.html)
  
    * 移除isBacking，解决banner卡死的问题
  
    * 重新添加了mouseenter事件的监听，mouseenter触发的时候，修改 initX ，并强制取消过渡。
  
  * 新增`fix.js`文件，用来修改先前爬取的banner中的`data.json`文件，修改了transform属性：
  
    原先的值：
  
    ```json
    "transform": [
        1,
        0,
        0,
        1,
        600,
        35
    ]
    ```
  
    现在的值：
  
    ```json
    "transform": {
       "translateX": 600,
       "translateY": 35,
       "rotate": 0,
       "scale": 1
    },
    ```
  
  * 修改`grap.js`文件，捕获了更多样式：`旋转的速度r，缩放的速度f`，同时也修改了输出的`data.json`文件的格式，让代码效果更接近B站原生Banner。
  
    

## 主要参考文章和资料

文章：[如何用原生 JS 复刻 Bilibili 首页头图的视差交互效果最近发现 B 站首页头图的交互效果非常有趣，本文将通过 - 掘金](https://juejin.cn/post/7269385060611997711)

Github地址：[palxiao/bilibili-banner: 一键复刻 B 站首页动态 Banner，本仓库记录其历史Banner以供学习和欣赏（自2023-08-21开始）](https://github.com/palxiao/bilibili-banner)

