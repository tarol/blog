---
title: JSONP的实现流程
date: 2015-01-04 19:26:36
tags:
  - 文章
  - H5
categories:
  - 技术
  - 前端
  - H5
---

&emsp;&emsp;在进行 AJAX 的时候会经常产生这样一个报错：

![1](/assets/image/jsonp/1.png)

&emsp;&emsp;看红字，这是浏览器的同源策略，使跨域进行的 AJAX 无效。注意，不是不发送 AJAX 请求（其实就是 HTTP 请求），而是请求了，也返回了，但浏览器‘咔擦’一声，下面没有了。对比下 fiddler 和浏览器抓的包的异同：

<center>fiddler</center>
![2](/assets/image/jsonp/2.png)

<center>chrome</center>
![3](/assets/image/jsonp/3.png)
![4](/assets/image/jsonp/4.png)

&emsp;&emsp;简而言之，浏览器这边就是头（response header）给看，身体（response body）不给看。

&emsp;&emsp;什么是同源策略？为什么会有同源策略？这一点在吴翰清老师著的《白帽子讲 Web 安全》一书中由阐述，这里就不赘述了。下面要做的，就是使用 JSONP 让上面的报错消失，按正确的流程进行下去。

&emsp;&emsp;首先介绍下我这里的环境，两个 Web 服务器，Tomcat 监听 8081，Node 监听 3000，Tomcat 这边实现一个处理 AJAX 的 JSP 文件，很简单，返回一个 JSON

```jsp
<%@ page contentType="application/json; charset=utf-8" %>
{"status": true}
```

&emsp;&emsp;Tomcat 的页面对这个 URL 发出 AJAX 请求，并打印出了返回值

![5](/assets/image/jsonp/5.png)

&emsp;&emsp;但 Node 的页面发出 AJAX 请求，则像上面那样报错了，因为 AJAX 有同源策略保护。怎么绕过这个保护呢？平时我们页面引入的 CSS、JS 可能是从其他的服务器比如静态服务器、CDN 获取内容，都在不同的域，可知页面内的标签引入 JS 是没有同源策略一说的，而且也是进行 request 和处理 response，于是我们把这个 AJAX 请求改为如下代码：

```javascript
var script = document.createElement("script");
script.src = "http://localhost:8081/test/true.jsp";
document.body.insertBefore(script, document.body.lastChild);
```

&emsp;&emsp;但还是残忍的报错了

![6](/assets/image/jsonp/6.png)

&emsp;&emsp;因为返回的 JSON({"status": true})成为了一个独立的 js 片段，而这个片段明显是不符合语法的，如果返回的是符合语法规范的处理 JSON 的 js 片段而不仅仅是 JSON 就好了。比如我们将服务器端的代码改成这样：

```jsp
<%@ page contentType="application/javascript; charset=utf-8" %>
console.log({"status": true});
```

&emsp;&emsp;再在 Node 的页面进行 AJAX

![7](/assets/image/jsonp/7.png)

&emsp;&emsp;目的是达到了，但问题是，这个 AJAX 的 servlet 不仅返回了数据，还返回了行为，难道我要把处理 DOM 的 js 写在这里面吗？页面重构了又跑到这里来修改？问题太美不敢想，所以请求成功的方法必须写在页面的 js 里面，比如这样

```javascript
function callback(data) {
  console.log(data);
}
var script = document.createElement("script");
script.src = "http://localhost:8081/test/true.jsp";
document.body.insertBefore(script, document.body.lastChild);
```

&emsp;&emsp;而服务器返回的 js 片段直接调用这个 function 就行了，这个就叫回调函数了

```jsp
<%@ page contentType="application/javascript; charset=utf-8" %>
callback({"status": true});
```

&emsp;&emsp;可以看到，这个方案比之前好多了，servlet 和请求页面的耦合度低了很多，但没完全解决，比如 callback 这个回调函数的名字，如果把这个名字放在请求的 parameter 中，比如这样

```javascript
function callback(data) {
  console.log(data);
}
var script = document.createElement("script");
script.src = "http://localhost:8081/test/true.jsp?cb=callback";
document.body.insertBefore(script, document.body.lastChild);
```

&emsp;&emsp;服务器对这个 parameter 进行处理

```jsp
<%@ page contentType="application/javascript; charset=utf-8" %>
<%= request.getParameter("cb") %>({"status": true});
```

&emsp;&emsp;优化一下，对没有 cb 参数的请求仅返回 JSON

```jsp
<%
    String callback = request.getParameter("cb");
    if(null == callback) {
        response.setContentType("application/json; charset=utf-8");
%>
    {"status": true}
<%
    }else {
        response.setContentType("application/javascript; charset=utf-8");
%>
    <%= callback %>({"status": true})
<%
    }
%>
```

&emsp;&emsp;那么整个 JSONP 的功能就实现了。但还有一点瑕疵，代码执行完 html 中留下了一个 script 标签，强迫症能忍？处女座能忍？

&emsp;&emsp;解决方法：可以使用 jQuery 的方法，jQuery 会清除掉留下的 script 标签。

```javascript
$.ajax({
  url: "http://localhost:8081/test/true.jsp",
  dataType: "jsonp",
  jsonp: "cb",
  success: function(data) {
    console.log(data);
  }
});
```

&emsp;&emsp;也可以自己实现一个，我抛个砖，在 js 加载完成后删除节点。

```javascript
function callback(data) {
  console.log(data);
}
var script = document.createElement("script");
script.src = "http://localhost:8081/test/true.jsp?cb=callback";
document.body.insertBefore(script, document.body.lastChild);
script.onload = function() {
  this.parentNode.removeChild(this);
};
```

&emsp;&emsp;至此，不知道有人发现没有，JSONP 这种方式有一个致命的缺陷：就是由于它是通过引入 script 节点实现的，所以只支持 GET 方法。如果你任性，你无理取闹，你一定要用 post 跨域，那么只能考虑使用 CORS 了。

&emsp;&emsp;JSONP 的东西就到此结束了，其实做完才发现，实际上这是个很简单的概念，取了个比较唬人的名字而已。
