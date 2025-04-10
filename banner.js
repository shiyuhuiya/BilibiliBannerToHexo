const app = document.getElementById("app");
//header是app的父元素
//app是使用绝对定位的子元素，完全覆盖header
//nav元素也是使用了绝对定位的header的子元素，且置顶压住了app
//后续我们给header加上mousemove和mouseleave的事件监听,为什么？
//即便我们鼠标是在nav或者app上移动，mousemove事件也会冒泡到父元素header
//但如果我们只给app添加mousemove，当鼠标移动到nav上，就不会触发mousemove事件
//为此时 nav 元素挡住了 app 元素，成为实际响应鼠标事件的元素
//因为我们希望鼠标在nav或者app上移动时，banner都能动，所以我们将mousemove监听添加到父元素上
//如果我们只给app添加mouseleave监听，当鼠标移动到nav（2个元素是同级关系），
//就会触发app的mouseleave事件，播放回正动画，这样用户可交互的范围就变小了
//但如果我们给header添加mouseleave的事件监听，只要鼠标不离开headr的范围，就不会触发mouseleave
//所以我们给header添加mouseleave的事件监听
const header = document.getElementById("page-header");

(async function () {
  //如果当前页面中不存在app元素，则直接返回
  if(app===null){
    return
  }
  // 随机取一个banner来展示
  // 10表示当前有10个banner，如果爬取了更多banner，此处应该被修改
  const index = Math.floor(Math.random() * 10 + 1)
  const response = await fetch(`/bilibiliBanner/images/${index}/data.json`)
  const curBannerData = await response.json()
  let layers = []; // 所有layer的DOM集合
  let compensate = 0; // 视窗补偿值
  // 添加图片元素(进行添加dom吗，修改dom的操作)
  function init() {
    //根据窗口宽度，计算补偿值compensate，用于动态调整元素尺寸和位置
    compensate = window.innerWidth > 1650 ? window.innerWidth / 1650 : 1;
    // 进行离线操作，防止触发多次回流
    // 当一个 HTML 元素的 display 属性设置为 none 时，该元素会从文档流中完全移除，并且不会在页面上显示。
    // 尽管如此，你仍然可以通过 JavaScript 或 CSS 对该元素进行操作和修改样式
    app.style.display = "none";

    for (let i = 0; i < curBannerData.length; i++) {
      const layerChildConfig = curBannerData[i];

      //创建layer
      const layer = document.createElement("div");
      layer.classList.add("layer");

      // 创建子元素
      const child = document.createElement(layerChildConfig.tagName);
      // 如果子元素是video
      if (layerChildConfig.tagName === 'video') {
        // autoplay = true 尝试自动播放，但现代浏览器（如 Chrome 76+）会阻止有声自动播放。
        // 通过 muted = true 静音绕过此限制
        // loop = true 使视频播放结束后自动重播
        child.loop = true; child.autoplay = true; child.muted = true;
      }
      child.src = layerChildConfig.src;

      // 应用补偿值到元素的宽高
      // 根据item中的信息设置img或者video的宽高
      child.style.width = `${layerChildConfig.width * compensate}px`;
      child.style.height = `${layerChildConfig.height * compensate}px`;
      // 应用补偿值到变换矩阵的第4、5项（translateX/Y，偏移值）
      let translateX = layerChildConfig.transform.translateX * compensate
      let translateY = layerChildConfig.transform.translateY * compensate
      let rotate = layerChildConfig.transform.rotate
      let scale = layerChildConfig.transform.scale
      // 添加偏移
      child.style.transform = `translate(${translateX}px,${translateY}px) rotate(${rotate}deg) scale(${scale})`
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
  header.addEventListener('mouseenter', (e) => {
    // 计算初始位置
    initX = e.clientX;
    // 强制取消过渡
    layers.forEach(layer => {
      layer.firstChild.style.transition = ''
    })
  })
  // 计算线性插值
  lerp = (start, end, amt) => (1 - amt) * start + amt * end;

  function mouseMove(e) {
    moveX = e.clientX - initX;
    requestAnimationFrame(() => {
      //在浏览器下次重绘前，异步批量执行
      animate(moveX);
    })
  }
  // 动画执行
  function animate(moveX) {
    //如果不存在layers，直接返回
    if (layers.length <= 0) return;
    //每次鼠标在banner上移动，遍历所有layer,对每个layer中的子元素都应用变换
    for (let i = 0; i < layers.length; i++) {
      // 当前layer的子元素对应的配置信息
      const layerChildConfig = curBannerData[i];
      // 下面代码的核心就是利用moveX来计算新的样式并应用
      // 当前translateX
      let translateX = layerChildConfig.transform.translateX + moveX * (layerChildConfig.a || 0);
      // 当前scale
      let scale = layerChildConfig.transform.scale + (layerChildConfig.f || 0) * moveX
      // 当前translateY
      let translateY = layerChildConfig.transform.translateY + moveX * (layerChildConfig.g || 0);
      // 当前rotate
      let rotate = layerChildConfig.transform.rotate + moveX * (layerChildConfig.r || 0)
      // 透明度变化
      layers[i].firstChild.style.opacity = lerp(
        layerChildConfig.opacity[0],
        layerChildConfig.opacity[1],
        (moveX / window.innerWidth) * 2
      );
      // 一次性应用所有变化
      layers[i].firstChild.style.transform = `translate(${translateX}px,${translateY}px) rotate(${rotate}deg) scale(${scale})`
    }
  }
  header.addEventListener("mousemove", mouseMove);

  // 鼠标已经离开了视窗，执行回正动画
  function leave() {
    //修改一些标记量
    layers.forEach((layer, i) => {
      const child = layer.firstChild
      const layerChildConfig = curBannerData[i];
      child.addEventListener('transitionend', () => {
        child.style.transition = '';
      }, { once: true });
      requestAnimationFrame(() => {
        //回正的时候给每个layer都添加过渡
        child.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        // 应用补偿值到元素的宽高
        // 根据item中的信息设置img或者video的宽高
        child.style.width = `${layerChildConfig.width * compensate}px`;
        child.style.height = `${layerChildConfig.height * compensate}px`;
        // 应用补偿值到（translateX/Y，偏移值）
        let translateX = layerChildConfig.transform.translateX * compensate
        let translateY = layerChildConfig.transform.translateY * compensate
        let rotate = layerChildConfig.transform.rotate
        let scale = layerChildConfig.transform.scale
        // 添加偏移
        child.style.transform = `translate(${translateX}px,${translateY}px) rotate(${rotate}deg) scale(${scale})`
      })
    })
  }
  header.addEventListener("mouseleave", leave);
})()

