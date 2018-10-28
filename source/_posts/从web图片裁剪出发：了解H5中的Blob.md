---
title: 从web图片裁剪出发：了解H5中的Blob
date: 2016-04-15 16:11:00
tags:
  - 文章
  - H5
categories:
  - 技术
  - 前端
  - H5
---

刚开始做前端的时候，有个功能卡住我了，就是裁剪并上传头像。当时两个方案摆在我面前，一个是 flash，我不会。另一个是通过 iframe 上传图片，然后再上传坐标由后端裁剪，而我最终的选择是后者。有人会疑惑，为什么不用 H5 的 Canvas 和 FormData，第一要考虑 ie8 的兼容性，第二那时候眼界没到，这种新东西光是听听都怕。

后来随着 Mobile 项目越做越多，类似的功能开发得也越来越多，Canvas+FormData 成为了标配方案。但做的多了却一直没有静下心来研究，浏览器怎么使用 H5 的方式裁剪并把文件发送出去，回过头看都是知其然不知其所以然。这篇随笔先做个初步的拆解，就是当通过 input 选择一张图片后，这张图片在浏览器里是怎样的一个存在。

文件操作一直是早期浏览器的痛点，全封闭式，不给 JS 操作的空间，而随着 H5 一系列新接口的推出，这个壁垒被打破。对，是一系列接口，以下会涉及到如下概念：Blob、File、FileReader、ArrayBuffer、ArrayBufferView、DataURL 等，其他如 FormData、XMLHttpRequest、Canvas 等暂不深入。

我们先创建一个简单的页面，只有一个 input[type=file]。

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Document</title>
</head>
<body>
  <input type="file">
</body>
</html>
```

然后我们在 JS 中获取这个元素

```js
var input = document.querySelector("input[type=file]");
```

可以看到这个元素有个属性 files，它的类型是 FileList。这个类不做过多介绍，就是一个类数组，由浏览器通过用户行为往里面添加或删除元素，JS 只有访问其元素的接口，无法对其进行操作。而 files 的元素就是 File 类型，File 是 blob 的子类，比 blob 主要多出一个 name 的属性。

现在我们选取一个文件，**这里问题来了，这个元素是文件在浏览器的完整备份，还是一个指向文件系统的引用？**答案是后者，我们选定文件，然后修改文件名，再上传文件，浏览器报错了。

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Document</title>
</head>
<body>
  <form name='test'>
    <input type="file">
    <input type="submit" value="提交">
  </form>
  <script>
    var input = document.querySelector('input[type=file]'),
        form = document.test;
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var file = input.files[0],
            fd = new FormData(),
            xhr = new XMLHttpRequest();
      fd.append('file', file);
      xhr.open('post', '/upload');
      xhr.send(fd);
    });
  </script>
</body>
</html>
```

![1](/assets/image/blob/1.png)

使用 chrome 打开 chrome://blob-internals/，可以看到一条这样的记录

![2](/assets/image/blob/2.png)

可见这仅仅是一条引用。**第二个问题来了，如果我们要对图片进行处理，那么只拿到引用是不行的，肯定要在浏览器有一份数据的备份，那么怎么获取这个备份呢？**答案就是 FileReader，FileReader 的对象主要有 readAsArrayBuffer、readAsBinaryString、readAsDataURL、readAsText 等方法，它们的入参都是 Blob 对象或是 File 对象，结果对应最终获取的数据类型。这几个方法是异步的，读取过程中会抛出对应的事件，其中读取完毕的事件为 load，所以数据的处理要放在 onload 下。我先给一个简单的 example：

```js
input.addEventListener("change", function() {
  var file = this.files[0],
    fr = new FileReader(),
    blob;
  fr.onload = function() {
    blob = new Blob([this.result]);
  };
  fr.readAsArrayBuffer(file);
});
```

当用户选取图片时，调用 FileReader 的 readAsArrayBuffer 把图片数据读出来，然后生成新的 blob 对象保存在浏览器中。查看 chrome://blob-internals/，可以注意到这一项：

![3](/assets/image/blob/3.png)

对应的就是刚才的 blob，可以对比 length 和图片本身的大小。上面那个 demo 很突兀，完全没有解释什么是 ArrayBuffer，为什么创建 blob 要传入一个 ArrayBuffer。**那么第三个问题来了，什么是 ArrayBuffer、BinaryString、DataURL、Text，它们有什么联系和不同，Blob 类到底是个什么东西？**首先，图片是个二进制文件，它的内容也是由 0 和 1 组成的。用户肯定是看不懂 0 和 1 的组合的，能看懂的只有最终展示的图片，而程序员也看不懂 0 和 1，但程序员能看懂另外几种 0 和 1 变换后的组合。它们就是以上的 4 种：ArrayBuffer、BinaryString、DataURL 和 Text。

其中 ArrayBuffer 是最接近二进制数据的表现的，可以理解为它就是二进制数据的存储器，这也是为什么二进制文件的 Blob 需要传入 ArrayBuffer。正因为它的内部是二进制数据，所以我们是不可以直接操作的。这时候就需要一个代理者帮助我们读或写，这个代理者就是 ArrayBufferView。

ArrayBufferView 不是一个类，而是一个类的集合，包括：Int8Array、Uint8Array、Uint8ClampedArray、Int16Array、Uint16Array、Int32Array、Uint32Array、Float32Array、Float64Array 和 DataView，分别表示以 8 位、16 位、32 位、64 位数字为元素对 ArrayBuffer 内的二进制数据进行展现，它们都有统一的属性 buffer 指向对应的 ArrayBuffer。栗子暂时不举，之后会用到。

ArrayBuffer 简单介绍了，那什么是 BinaryString 呢？是二进制数据直接以 byte 的形式展现的字符串，比如 1100001，用 Uint8 表示就是 97，用 BinaryString 表示就是'a'。对，前者是 charCode，后者是 char，所以 BinaryString 和 Uint8Array 之间是可以自由转换的。

接下来是 DataURL 了，这是一个经过 base64 编码的字符串，它的组成如下：
**data:[mimeType];base64,[base64(binaryString)]**

除了固定的字符串部分，它主要包含两个重要信息即中括号括起的部分，mimeType 和 base64 编码后的 binaryString，从它里面我们可以这样取到这两个信息。

```js
var binaryString = atob(dataUrl.split(",")[1]),
  mimeType = dataUrl.split(",")[0].match(/:(.\*?);/)[1];
```

最后，Text 是什么呢？在 ftp 上，文本传输和二进制传输的区别是什么，那 Text 类型和 BinaryString 类型的区别就是什么了，也就是 Text 类型是经过一定转换的 BinaryString，对于图片来说，这个类型是用不到的。

好了，现在我们了解了一张图片在浏览器里以数据的形式可以表现为 ArrayBuffer、BinaryString、DataURL，**那么第四个问题来了，它们各有实际用途呢？**我们从应用场景出发，回到文章开头的问题，图片的裁剪和上传。图片的裁剪我们要倚仗牛逼的 canvas，而 canvas 的 context 有这么一个方法 toDataURL，就是把 canvas 的内容转换为图片数据，而数据的表现形式就是 DataURL！图片的上传我们用的是 FormData，它可以添加 Blob 类型的对象进去，那 Blob 类型除了从 input[type=file]中直接获取，还能靠什么生成呢？自然是 ArrayBuffer！好了，裁剪图片的功能要用到 DataURL，上传图片的功能要用到 ArrayBuffer，那怎么从 DataURL 转换为 ArrayBuffer 呢？我们知道 DataURL 很重要的组成部分就是经过 base64 编码的 BinaryString，那么很显然我们可以从 DataURL 中提取 BinaryString，而 BinaryString 就是 ArrayBuffer 对应的 Uint8Array 的字符形式的表现，所以可以由 BinaryString 生成 ArrayBuffer，那么 DataURL 到 ArrayBuffer 之间的桥就是 BinaryString！

到现在为止，我们说了很多概念，然而这并没有什么卵用，验证概念的方法不是提出新的概念，而是建立一个 example。以下的 example 就是把图片数据从 input 中取出，然后以 DataURL 的格式进行预览，提交时把预览生成图片上传的整个流程。

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
  <img src="" alt="">
  <script>
    var img = document.querySelector('img'),
        preview;
    document.test.file.addEventListener('change', function() {
      var fr = new FileReader();
      fr.onload = function() {
        preview = this.result;
        img.src = preview;
      };
      fr.readAsDataURL(this.files[0]);
    })
    document.test.addEventListener('submit', function(e) {
      e.preventDefault();
      var binaryString = atob(preview.split(',')[1]),
          mimeType = preview.split(',')[0].match(/:(.*?);/)[1],
          length = binaryString.length,
          u8arr = new Uint8Array(length),
          blob,
          fd = new FormData(),
          xhr = new XMLHttpRequest();
      while(length--) {
        u8arr[length] = binaryString.charCodeAt(length);
      }
      blob = new Blob([u8arr.buffer], {type: mimeType});
      fd.append('file', blob);
      xhr.open('post', '/upload');
      xhr.send(fd);
    })
  </script>
</body>
</html>
```

现在图片已经被我们发射出去了，**那么图片在协议包里是以怎样的数据形式存在的呢？**当然是以二进制的形式，我们抓一下包，发现在 fiddler 里面这个二进制串会转换为字符串，即上面的 binaryString。

既然通过发送的 blob 到最后在数据包里都是以 binaryString 的形式展示，**那么是否可以直接使用 xhr.send(binaryString)发送图片呢？**貌似是可以的，但我们试一下就会发现问题，服务器获取到的信息不能生成一张图片，说明数据被破坏了。那么数据是谁破坏的呢？这个罪魁祸首就是 send，**当 send 的参数是字符串的时候，会对字符串进行 utf8 编码。**我们看下相同的图片通过 blob 发送出去和通过 binaryString 直接发送出去的数据会有什么不同。这里我们用 wireshark 抓包，因为 wireshark 会自动对数据块进行分割，可以比较直观的看到图片所对应的数据。PS: 这张图片一张 1px 白色的 png。

![4](/assets/image/blob/4.png)
![5](/assets/image/blob/5.png)

前面是正常的图片数据，后面是经过了 utf8 编码的图片数据。我们可以看到数据确实被破坏了，当然在知道元数据是 binaryString 的情况下，这种破坏是可以恢复的，不过不是这里讨论的范畴了，感兴趣的可以跳转阮老师的博客 [《字符编码笔记:ASCII，Unicode 和 UTF-8》](http://www.ruanyifeng.com/blog/2007/10/ascii_unicode_and_utf-8.html)。

好了，整个图片在浏览器端的拆解到此结束。理解了这些，就走完了写出牛逼的客户端图片裁剪工具的第一步。
