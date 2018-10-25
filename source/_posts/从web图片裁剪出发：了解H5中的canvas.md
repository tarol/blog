---
title: 从web图片裁剪出发：了解H5中的canvas
date: 2016-04-21 17:42:00
tags:
  - 文章
  - H5
categories:
  - 技术
  - 前端
  - H5
---

&emsp;&emsp;<font color=#E21918>本篇内容不针对 canvas 文档对每个 api 进行逐个的详解！</font>

&emsp;&emsp;<font color=#E21918>本篇内容不针对 canvas 文档对每个 api 进行逐个的详解！</font>

&emsp;&emsp;<font color=#E21918>本篇内容不针对 canvas 文档对每个 api 进行逐个的详解！</font>

&emsp;&emsp;重说三，好了，现在进入正文。在上一回《从 web 图片裁剪出发：了解 H5 中的 blob》中我解释了图片在浏览器中以怎样的形式留存，并且在最后一个 example 中演示了选择图片、预览最后提交的过程。然而这个预览并没有起到什么卵用，因为只能预览不能处理，原图片还是原图片，预览变得可有可无。这一篇我们就在预览这一步里做点手脚，加入处理图片的功能。

&emsp;&emsp;我们先修改之前的 example，既然要处理图片，肯定要引入 canvas，所以我们把原来 img 这个标签去掉，取而代之的是 canvas，并在 js 中加入对应的修改。

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Document</title>
</head>
<body>
  <form name='test'>
    <input type="file" name='file'>
    <input type="submit" value="提交">
  </form>
  <canvas width="0" height="0"></canvas>
  <script>
    var canvas = document.querySelector('canvas'),
        ctx = canvas.getContext('2d'),
        preview = new Image();
    document.test.file.addEventListener('change', function() {
      var fr = new FileReader();
      fr.onload = function() {
        preview.src = this.result;
        canvas.width = preview.width;
        canvas.height = preview.height;
        drawImage();
      };
      fr.readAsDataURL(this.files[0]);
    })
    function drawImage() {
      ctx.drawImage(preview, 0, 0); //把图片绘制到canvas上
    }
    document.test.addEventListener('submit', function(e) {
      e.preventDefault();
      var formData = new FormData(),
          xhr = new XMLHttpRequest(),
          mime = 'image/jpeg',
          dataUrl = canvas.toDataURL(mime, 0.8),  //取出base64
          data = atob(dataUrl.split(',')[1]),
          n = data.length,
          uInt8 = new Uint8Array(n),
          blob;
      while(n--) {
        uInt8[n] = data.charCodeAt(n);
      }
      blob = new Blob([uInt8.buffer], {type: mime});
      formData.append('file', blob, 'test.jpg');
      xhr.open('post', '/upload');
      xhr.send(formData);
    })
  </script>
</body>
</html>
```

&emsp;&emsp;之前 example 的 canvas 版实现了，现在我们加入处理图片的功能。首先我们加入裁剪的功能，裁剪的引入必须先引入橡皮筋功能，就是一个选取框。一般我们见过的选取框是这样的。

<img src="/assets/image/canvas/1.png" width="200" height="200" />
<center>预览的样子</center>
<img src="/assets/image/canvas/2.png" width="200" height="200" />
<center>选取的样子</center>

&emsp;&emsp;**我们来分析下实现这样一个功能需要做什么**。首先选取框有个开始点和结束点，在鼠标按下去的时候确定开始点，在松开的时候确定结束点，在移动的时候还要不停的绘制。**那么绘制一个有选取框的内容分几步呢？**第一步是绘制底图，第二步是绘制阴影，第三部还是绘制底图，但是只作用于选取框内部。**最后想取消选取框怎么办**，我们还要有个方法重置开始点和结束点，并且只绘制底图。

&emsp;&emsp;我们一步一步来，首先确定开始点和结束点。

```javascript
var sPoint = {},
  ePoint = {};
canvas.addEventListener("mousedown", function(e) {
  if (e.button === 0) {
    sPoint.x = e.offsetX;
    sPoint.y = e.offsetY;
    sPoint.drag = true;
  }
});
```

&emsp;&emsp;然后我们确定绘制阴影的的方法，并且在鼠标按下去移动的时候不停的绘制。

```javascript
function drawCover() {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}
canvas.addEventListener("mousemove", function(e) {
  if (e.button === 0 && sPoint.drag) {
    var nPoint = {
      x: e.offsetX,
      y: e.offsetY
    };
    ctx.save(); //clip要通过restore回复
    ctx.clearRect(0, 0, canvas.width, canvas.height); //画布全清
    drawImage(); //绘制底图
    drawCover(); //绘制阴影
    ctx.beginPath(); //开始路径
    ctx.rect(sPoint.x, sPoint.y, nPoint.x - sPoint.x, nPoint.y - sPoint.y); //设置路径为选取框
    ctx.clip(); //截取路径内为新的作用区域
    drawImage(); //在选取框内绘制底图
    ctx.restore(); //恢复clip截取的作用范围
  }
});
```

&emsp;&emsp;最后我们添加松开鼠标的事件监听，松开左键为拖动结束，松开右键为复原

```javascript
canvas.addEventListener("mouseup", function(e) {
  if (e.button === 0) {
    sPoint.drag = false;
    ePoint.x = e.offsetX;
    ePoint.y = e.offsetY;
  } else if (e.button === 2) {
    restore();
  }
});
function restore() {
  sPoint = {};
  ePoint = {};
  drawImage();
}
```

&emsp;&emsp;由于右键会出现恶心的浏览器自带菜单栏，影响体验，我们屏蔽它。

````javascript
document.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      e.stopPropagation();
    });
    ```
````

&emsp;&emsp;现在选取框有了，我们要开始截取了。新添加一个按钮，然后添加点击监听。

```html
<form name='test'>
  <input type="file" name='file'>
  <button id="clip">裁剪</button>
  <input type="submit" value="提交">
</form>
```

```javascript
var clip = document.querySelector("#clip");
clip.addEventListener("click", function(e) {
  e.preventDefault(); //阻止默认事件，不然会触发form的submit
  if (sPoint.x !== undefined && ePoint.x !== undefined) {
    var imgData = ctx.getImageData(
      sPoint.x,
      sPoint.y,
      ePoint.x - sPoint.x,
      ePoint.y - sPoint.y
    ); //把裁剪区域的图片信息提取出来
    ctx.clearRect(0, 0, canvas.width, canvas.height); //清空画布
    canvas.width = Math.abs(ePoint.x - sPoint.x); //重置canvas的大小为新图的大小
    canvas.height = Math.abs(ePoint.y - sPoint.y);
    ctx.putImageData(imgData, 0, 0); //把提取出来的图片信息放进canvas中
    preview.src = canvas.toDataURL(); //裁剪后我们用新图替换底图，方便继续处理
  } else {
    alert("没有选择区域");
  }
});
```

&emsp;&emsp;现在我们裁剪后选择提交，会发现服务器生成的是裁剪后的图片

<img src="/assets/image/canvas/3.png" width="200" height="200" />

&emsp;&emsp;裁剪的功能完成了，我们在来实现第二个功能：灰度。如果说裁剪的功能在于 clip 的用法，那么灰度的实现是基于 getImageData 返回的对象的认识。这个对象中有一个属性叫 data，这是一个数组，以 4 个为一组，分别存储了一个像素 red、green、blue、opacity 四个数据。也就是当你的 canvas 尺寸为 1\*1 时，它的 ImageData.data 元素为 4 个。

&emsp;&emsp;废话不多说，直接给出实现的代码。

```html
<form name='test'>
  <input type="file" name='file'>
  <button id="clip">裁剪</button>
  <button id="grey">灰度</button>
  <input type="submit" value="提交">
</form>
```

```javascript
var grey = document.querySelector("#grey");
grey.addEventListener("click", function(e) {
  e.preventDefault();
  var startX = 0,
    startY = 0,
    width = canvas.width,
    height = canvas.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height); //一如既往的先清空画布，不然会处理含有选取框的图片内容
  drawImage(); //绘制底图
  var imgData = ctx.getImageData(startX, startY, width, height); //把整个底图的图片内容取出来
  for (var i = 0; i < imgData.data.length; ) {
    var red = imgData.data[i],
      green = imgData.data[i + 1],
      blue = imgData.data[i + 2],
      opacity = imgData.data[i + 3], //不处理，可以省去这一行，占位说明这一位是透明度
      average = (red + green + blue) / 3; //所谓灰度其实是取三种颜色的平均值
    imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = average; //三个颜色设为一样即是对应的灰色
    i += 4;
  }
  ctx.putImageData(imgData, startX, startY, 0, 0, width, height); //把处理过的imagedata放回canvas中
  preview.src = canvas.toDataURL(); //保存图片信息方便再进行处理
});
```

&emsp;&emsp;选择灰度并提交，我们看服务器上生成的图片

<img src="/assets/image/canvas/4.png" width="200" height="200" />

&emsp;&emsp;最后我们结合裁剪和灰度，一起处理一张图片再提交。

<img src="/assets/image/canvas/5.png" width="200" height="200" />

&emsp;&emsp;好了，简单的两个图片处理的方式就介绍到这，至于复杂的，你可以拿到每一个像素的信息，还担心实现不了其他的功能么。
