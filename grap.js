const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

//提示用户
console.log('正在下载资源中...');
//计算images文件夹内的目录数
function countDirectories(dirPath) {
  let folderCount = 0;
  const files = fs.readdirSync(dirPath);
  files.forEach(() => {
    folderCount++;
  });
  return folderCount;
}
//自定义睡眠函数，立即返回一个promise对象，立即开启一个定时器，在指定的时间后修改promise对象的状态
function sleep(timeout) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}
let cnts = countDirectories(path.resolve(__dirname, './images'))

const folderPath = path.resolve(__dirname, "./images/" + (cnts + 1));
//创建目录
fs.mkdirSync(folderPath, { recursive: true });

//初始化data数组（后续数组中的元素都是对象），用来存储banner中每个layer的信息
const data = [];
//下面是一个立即执行函数，里面书写了许多代码
(async () => {
  // 启动无头浏览器
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  // 创建新标签页
  const page = await browser.newPage();
  // 设置视口尺寸
  page.setViewport({
    width: 1650,
    height: 800
  })
  //开始进行爬取工作
  try {
    // 导航到B站首页
    await page.goto("https://www.bilibili.com/", {
      waitUntil: "domcontentloaded",
    });
    // 并等待动画横幅加载
    await page.waitForSelector(".animated-banner");
    //等待3s
    await sleep(3000);

    // 使用page.$$()获取所有 ".layer" 元素（图层元素）
    // 类似document.querySelectorAll的效果, layerElements是一个伪数组
    let layerElements = await page.$$(".animated-banner .layer");
    // 遍历图层提取样式数据
    for (let i = 0; i < layerElements.length; i++) {
      // 分析page.evaluate(el=>{},element):
      // Puppeteer会将element转换为浏览器环境中的 DOM 元素句柄（ElementHandle）
      // 映射到回调函数的参数 el上
      const layerFirstChild = await page.evaluate(async (el) => {
        // 关于下面正则表达式如果不理解，建议去复习js的正则表达式
        // 匹配初始transform属性中的translate值，精准捕获X/Y轴位移像素值。
        const pattern = /translate\(([-.\d]+)px, ([-.\d]+)px\)/;
        // 匹配初始transform属性中的rotate值
        const pattern2 = /rotate\(([-.\d]+)deg\)/
        // 匹配初始transform属性中的scale值
        const pattern3 = /scale\(([.\d]+)\)/
        // 记录初始偏移值，缩放值，旋转角度
        const init = {}
        // el.firstElementChild就是每个layer中的img或者video元素
        const { width, height, src, style, tagName } = el.firstElementChild;
        // 调用字符串的match方法，传入一个正则表达式
        const matches = style.transform.match(pattern);//匹配translate的结果
        init.translateX = +matches.slice(1)[0]
        init.translateY = +matches.slice(1)[1]
        const matches2 = style.transform.match(pattern2)//匹配rotate的结果
        const deg = +matches2[1]
        init.rotate = deg
        const matches3 = style.transform.match(pattern3)//匹配scale的结果
        const scale = +matches3[1]
        init.scale = scale
        // 传入的回调函数的返回值，最终会赋值给layerFirstChild
        return { tagName: tagName.toLowerCase(), opacity: [style.opacity], transform: init, width, height, src };
      }, layerElements[i]);
      // 下载并保存数据
      await download(layerFirstChild) 
    }

    // 完成后模拟偏移banner
    // 选择器获取"横幅容器元素"
    let element = await page.$('.animated-banner')
    // boundingBox()获取其视口坐标
    let { x, y } = await element.boundingBox()
    // 先垂直偏移50px，是触发悬停效果
    await page.mouse.move(x + 0, y + 50)
    // 瞬间水平滑动1000px，steps:1表示无中间过渡帧，模拟快速拖拽
    await page.mouse.move(x + 1000, y, { steps: 1 })
    await sleep(1200);

    // 动画结束后DOM可能更新，需重新获取.layer元素句柄，避免引用失效
    layerElements = await page.$$(".animated-banner .layer"); // 重新获取
    for (let i = 0; i < layerElements.length; i++) {
      const arr = await page.evaluate(async (el) => {
        // 匹配偏移后transform属性中的translate值，精准捕获X/Y轴位移像素值。
        const pattern = /translate\(([-.\d]+)px, ([-.\d]+)px\)/;
        // 匹配偏移后transform属性中的rotate值
        const pattern2 = /rotate\(([-.\d]+)deg\)/
        // 匹配偏移后transform属性中的scale值
        const pattern3 = /scale\(([.\d]+)\)/
        //解构出style
        const { style } = el.firstElementChild
        const matches = style.transform.match(pattern);//匹配banner移动后 translate的值
        const matches2 = style.transform.match(pattern2)//匹配banner移动后rotate的值
        const deg = + matches2[1]
        const matches3 = style.transform.match(pattern3)//匹配banner移动后scale的值
        const scale = + matches3[1]
        return [...matches.slice(1).map(x => +x), deg, scale, style.opacity]
      }, layerElements[i]);

      // 计算得到x轴上的'速度'a，其实就是一个比例关系
      data[i].a = (arr[0] - data[i].transform.translateX) / 1000
      // 计算得到y轴上的'速度'g，其实就是一个比例关系
      data[i].g = (arr[1] - data[i].transform.translateY) / 1000
      // 计算旋转的'速度'r
      data[i].r = (arr[2] - data[i].transform.rotate) / 1000
      // 计算缩放的'速度's
      data[i].f = (arr[3] - data[i].transform.scale) / 1000
      // 补充滑动1000px后的透明度
      data[i].opacity.push(arr[4])
    }
  } catch (error) {
    console.error("Error:", error);
  }

  //传入的item是一个对象
  async function download(item) {
    const fileArr = item.src.split("/");
    // fileArr[fileArr.length - 1]被用来获取最后一个'/'后的内容，也就是文件名
    const filename = fileArr[fileArr.length - 1]
    // 得到图片的存储路径
    const fileSavePath = `${folderPath}/${filename}`

    // 使用fetch下载图片
    const content = await page.evaluate(async (url) => {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      return { buffer: Array.from(new Uint8Array(buffer)) };
    }, item.src);
    // 得到图片数据
    const fileData = Buffer.from(content.buffer);
    // 异步写入
    fs.promises.writeFile(fileSavePath, fileData).catch(console.error);
    // 将每个layer中的firstChild的信息对象，push到data数组
    // 下载好图片后，修改图片src为本地下载路径，而不是网络路径
    data.push({ ...item, ...{ src: `/bilibiliBanner/images/${cnts + 1}/${filename}` } });
  }


  // 同时把data数组以json的格式，保存到data.json文件中
  fs.writeFileSync(`${folderPath}/data.json`, JSON.stringify(data, null, 2));
  console.log('正在写入本地文件...');
  await sleep(300)
  await browser.close();
  console.log('banner 下载完毕');
})();
