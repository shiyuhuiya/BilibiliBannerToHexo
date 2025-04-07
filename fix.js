//这个文件的作用是用来修改先前爬取的每个banner的data.json的数据格式
const fs = require("fs");
const path = require("path");

// 定义 images 文件夹的绝对路径
const imagesDir = path.resolve(__dirname, "./images");

// 遍历 images 文件夹中的所有子目录
fs.readdirSync(imagesDir).forEach((dir) => {
  //当前子目录的绝对路径
  const dirPath = path.join(imagesDir, dir);

  // 检查是否是目录
  if (fs.statSync(dirPath).isDirectory()) {
    // 得到当前子目录下的data.json文件绝对路径
    const jsonFilePath = path.join(dirPath, "data.json");

    // 检查是否存在 data.json 文件
    if (fs.existsSync(jsonFilePath)) {
      // 读取 JSON 文件内容
      const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, "utf-8"));

      // 遍历 JSON 数组，修改 transform 属性
      jsonData.forEach((item) => {
        if (Array.isArray(item.transform) && item.transform.length === 6) {
          const [/* a */, /* b */, /* c */, /* d */, translateX, translateY] = item.transform;

          // 构建新的 transform 对象
          item.transform = {
            translateX: translateX || 0,
            translateY: translateY || 0,
            rotate: 0, // 默认旋转角度为 0
            scale: 1  // 默认缩放比例为 1
          };
        }
      });

      // 将修改后的数据写回文件
      fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2));
      console.log(`Updated ${jsonFilePath}`);
    }
  }
});