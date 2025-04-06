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

let cnts = countDirectories(path.resolve(__dirname,'./images'))

const folderPath = path.resolve(__dirname,"./images/" + (cnts+1));
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
    // 获取并下载保存数据
    // 遍历图层提取transform样式数据（包含translate坐标解析）
    for (let i = 0; i < layerElements.length; i++) {
      // 分析page.evaluate(el=>{},element):
      // Puppeteer会将element转换为浏览器环境中的 DOM 元素句柄（ElementHandle），映射到回调函数的参数 el上
      // 传入的回调函数的返回值，最终会赋值给layerFirstChild
      const layerFirstChild = await page.evaluate(async (el) => {
        // 使用正则匹配transform属性中的translate值，精准捕获X/Y轴位移像素值。
        const pattern = /translate\(([-.\d]+px), ([-.\d]+px)\)/;
        // el.firstElementChild就是每个layer中的img或者video元素
        // 解构获取这个元素的各个属性值
        const { width, height, src, style, tagName } = el.firstElementChild;
        // 调用字符串的match方法，传入一个正则表达式
        // 例如 translate(100px, 50px)会提取["100px", "50px"]。
        const matches = style.transform.match(pattern);
        // 将匹配结果转换为二维变换矩阵
        // match()方法返回的数组matches结构为：["translate(100px,50px)","100px","50px"]
        // 第0项：完整匹配结果，第1项：第一个捕获组（X轴值），第2项：第二个捕获组（Y轴值）
        // map(x => +x.replace('px', '')做的事情就是将字符串转换成数字
        const transform = [1, 0, 0, 1, ...matches.slice(1).map(x => +x.replace('px', ''))]
        return { tagName: tagName.toLowerCase(), opacity: [style.opacity, style.opacity], transform, width, height, src, a: 0.01 };
      }, layerElements[i]);
      // data.push(layerFirstChild);
      await download(layerFirstChild) // 下载并保存数据（下载的就是回调函数return的对象）
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
    // 偏移后计算每个图层的相对位置，并得出加速度
    layerElements = await page.$$(".animated-banner .layer"); // 重新获取
    for (let i = 0; i < layerElements.length; i++) {
      const arr = await page.evaluate(async (el) => {
        //定义正则表达式
        const pattern = /translate\(([-.\d]+px), ([-.\d]+px)\)/;
        //解构出style
        const { style } = el.firstElementChild
        const matches = style.transform.match(pattern);
        return matches.slice(1).map(x => +x.replace('px', ''))
      }, layerElements[i]);
      // x是当前layer中的第一个元素的x轴偏移量
      // data[i].transform[4]是当前layer中的第一个元素的x轴初始偏移量
      // 计算得到x轴上的加速度a
      data[i].a = (arr[0] - data[i].transform[4]) / 1000
      // 计算得到y轴上的加速度g
      data[i].g = (arr[1] - data[i].transform[5]) / 1000
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
    const fileData = Buffer.from(content.buffer);
    // 异步写入更安全
    fs.promises.writeFile(fileSavePath, fileData).catch(console.error);
    // 将每个layer中的第一个元素的信息对象，push到data数组
    data.push({ ...item, ...{ src: `/bilibiliBanner/images/${cnts+1}/${filename}` } });
  }
  // 同时把data数组以json的格式，保存到data.json文件中
  fs.writeFileSync(`${folderPath}/data.json`, JSON.stringify(data, null, 2));
  console.log('正在写入本地文件...');
  await sleep(300)
  await browser.close();
  console.log('banner 下载完毕');
})();

//自定义睡眠函数，立即返回一个promise对象，立即开启一个定时器，在指定的时间后修改promise对象的状态
function sleep(timeout) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}
