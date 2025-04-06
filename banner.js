const app = document.getElementById("app");
//header是app的父元素
//app是使用绝对定位的子元素，完全覆盖header
//nav元素也是使用了绝对定位的header的子元素，且置顶压住了app
//后续我们给header加上mousemove和mouseleave的事件监听,为什么？
//即便我们鼠标是在nav或者app上移动，mousemove事件也会冒泡到父元素header
//因为我们希望鼠标在nav或者app上移动时，banner都能动，所以我们将mousemove监听添加到父元素上
//如果我们给app添加mouseleave监听，当鼠标移动到nav（2个元素是同级关系），
//就会触发app的mouseleave事件，播放回正动画这样用户可交互的范围就变小了
//如果子元素完全在父元素内，当鼠标从父元素移动到子元素时，不会触发父元素的 mouseleave 事件。
//所以我们给header添加mouseleave的事件监听
const header = document.getElementById("page-header");

(async function () {
  //随机取一个banner来展示
  //10表示当前有10个banner
  const index = Math.floor(Math.random() * 10 + 1)
  const response = await fetch(`/bilibiliBanner/images/${index}/data.json`)
  const curBannerData = await response.json()
  // 预计算基础矩阵
  // 目的是防止每次执行animate都创建一次初始变换矩阵
  let baseMatrices = curBannerData.map(config => {
    return new DOMMatrix(config.transform);
  });

  let layers = []; // 所有layer的DOM集合
  let compensate = 0; // 视窗补偿值
  // 添加图片元素(进行添加dom吗，修改dom的操作)
  function init() {
    //根据窗口宽度，计算补偿值compensate，用于动态调整元素尺寸和位置
    compensate = window.innerWidth > 1650 ? window.innerWidth / 1650 : 1;
    //使用序列化和反序列化进行一次深拷贝，不影响原始数据
    const cloneBannerData = JSON.parse(JSON.stringify(curBannerData))

    //进行离线操作，防止触发多次回流
    app.style.display = "none";

    for (let i = 0; i < cloneBannerData.length; i++) {
      const layerChildConfig = cloneBannerData[i];

      //创建layer
      const layer = document.createElement("div");
      layer.classList.add("layer");

      // 创建子元素
      const child = document.createElement(layerChildConfig.tagName);
      // 如果子元素是video
      if (layerChildConfig.tagName === 'video') {
        // autoplay=true 尝试自动播放，但现代浏览器（如 Chrome 76+）会阻止有声自动播放。
        // 通过 muted=true 静音绕过此限制
        // loop=true 使视频播放结束后自动重播
        child.loop = true; child.autoplay = true; child.muted = true;
      }
      child.src = layerChildConfig.src;
      // 设置模糊值
      child.style.filter = `blur(${layerChildConfig.blur}px)`;
      // 应用补偿值到元素的宽高
      // 根据item中的信息设置img或者video的宽高
      child.style.width = `${layerChildConfig.width * compensate}px`;
      child.style.height = `${layerChildConfig.height * compensate}px`;
      // 应用补偿值到变换矩阵的第4、5项（translateX/Y，偏移值）
      // 因为原数据在此处修改了，这就是我们使用深拷贝的原因
      layerChildConfig.transform[4] = layerChildConfig.transform[4] * compensate
      layerChildConfig.transform[5] = layerChildConfig.transform[5] * compensate
      // 添加偏移
      child.style.transform = new DOMMatrix(layerChildConfig.transform)

      // 将img或者video添加到div.layer
      layer.appendChild(child);
      // 将div.layer添加到div.app
      app.appendChild(layer);
    }
    // 显示app，进行一次批量的回流
    app.style.display = "";
    // 所有layer都添加完毕后，重新捕获layer，给layers赋值
    layers = document.querySelectorAll("#app .layer");
  }
  // 页面加载的时候，进行一次初始化操作，创建对应的layer结构，并初始化样式
  init()

  //鼠标在banner上的初始x坐标
  let initX = 0;
  //鼠标在banner上，在x轴方向移动的距离
  let moveX = 0;

  // 计算线性插值
  lerp = (start, end, amt) => (1 - amt) * start + amt * end;
  // 动画执行
  function animate() {
    //如果不存在layers，直接返回
    if (layers.length <= 0) return;

    //每次鼠标在banner上移动，遍历所有layer,对每个layer中的子元素都应用变换
    for (let i = 0; i < layers.length; i++) {
      // 当前layer的子元素对应的配置信息
      const layerChildConfig = curBannerData[i];
      // 提取出基础变换矩阵
      let base = baseMatrices[i];
      // translateX
      // layerChildConfig.a是x轴方向的加速度
      let translateX = moveX * layerChildConfig.a;
      // 放大比例 Scale
      // 如果layerChildConfig中不存在f属性，则放大比例就为1，否则是layerChildConfig.f * moveX+1
      let scale = layerChildConfig.f ? layerChildConfig.f * moveX + 1 : 1;
      // translateY
      // 如果layerChildConfig.g为不存在，则在y轴上不偏移
      let translateY = moveX * (layerChildConfig.g || 0);

      // 创建一个的新的变换矩阵，与基础变换矩阵m进行相乘，矩阵运算并不会改变原来的矩阵
      // 所以我们不用担心基础矩阵会改变
      base = base.multiply(new DOMMatrix([base.a * scale, base.b, base.c, base.d * scale, translateX, translateY]));
      // 如果layerChildConfig中还包含旋转角度
      if (layerChildConfig.deg) {
        // 有旋转角度
        const deg = layerChildConfig.deg * moveX;
        // 再次修改变换矩阵，累加变换操作
        base = base.multiply(
          new DOMMatrix([
            Math.cos(deg),
            Math.sin(deg),
            -Math.sin(deg),
            Math.cos(deg),
            0,
            0,
          ])
        );
      }
      // 如果有透明度变化
      if (layerChildConfig.opacity) {
        layers[i].firstChild.style.opacity = lerp(
          layerChildConfig.opacity[0],
          layerChildConfig.opacity[1],
          (moveX / window.innerWidth) * 2
        );
      }
      // 一次性应用所有变化
      // 使用translate3d，强制启用GPU加速
      layers[i].firstChild.style.transform = `translate3d(0,0,0) ${base}`
    }
  }

  let isAnimating = false;
  let enter = false // 鼠标是否已经进入

  function mouseMove(e) {
    // 如果还处于回正动画，直接返回
    if (isBacking) return
    // 如果上一次requestAnimationFrame的回调未触发，则直接返回
    if (isAnimating) return;
    //如果是初次滑动，则记录初始坐标
    if (!enter) {
      initX = e.pageX;
      enter = true
    }
    isAnimating = true;
    requestAnimationFrame(() => {
      //计算x轴方向偏移值
      moveX = e.pageX - initX;
      //重绘每个layer中的子元素
      animate();
      isAnimating = false;
    });
  }
  header.addEventListener("mousemove", mouseMove);

  // 鼠标已经离开了视窗，执行回正动画
  let isBacking = false
  function leave() {
    //修改一些标记量
    enter = false
    isBacking = true

    const cloneBannerData = JSON.parse(JSON.stringify(curBannerData))
    layers.forEach((layer, i) => {
      const child = layer.firstChild
      const layerChildConfig = cloneBannerData[i];
      child.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      child.addEventListener('transitionend', () => {
        child.style.transition = '';
        if (isBacking) {
          isBacking = false
        }
      }, { once: true });
      // 应用补偿值到元素的宽高
      // 根据item中的信息设置img或者video的宽高
      child.style.width = `${layerChildConfig.width * compensate}px`;
      child.style.height = `${layerChildConfig.height * compensate}px`;
      // 应用补偿值到变换矩阵的第4、5项（translateX/Y，偏移值）
      layerChildConfig.transform[4] = layerChildConfig.transform[4] * compensate
      layerChildConfig.transform[5] = layerChildConfig.transform[5] * compensate
      // 添加偏移
      child.style.transform = new DOMMatrix(layerChildConfig.transform)
    })
  }
  header.addEventListener("mouseleave", leave);
})()

