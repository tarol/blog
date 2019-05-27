---
title: ES的一等公民——函数（一）
date: 2019-05-27 23:27:37
tags:
  - 文章
  - ES
categories:
  - 技术
  - 前端
  - ES
---

### 前言

众所周知的是，函数是 ES 的一等公民，尤其是 ES6 发布后，随着箭头函数和类的加入，函数的 feature 日趋复杂。而现在，在 TC39 的 [proposals](https://github.com/tc39/proposals) 中，越来越多的 feature 是基于函数的，比如 [decorators](https://github.com/tc39/proposal-decorators)、 [partial-application](https://github.com/tc39/proposal-partial-application)、 [Pipeline Operator](https://github.com/tc39/proposal-pipeline-operator) 等

我们从头到尾缕一遍函数的特性，包括最早的闭包，ES5 的 call、apply、bind，ES6 的箭头函数和类

#### 闭包

闭包其实是一个 PL 的概念，如果某个编程语言不支持闭包，那将是很严重的事情。我们一步步来理解这句话

```html
<button>1</button>
<button>2</button>
<button>3</button>
<button>4</button>
<button>5</button>
```

```js
const btns = document.querySelectorAll('button')
for(var i = 0; i < btns.length; i++) {
  btns[i].onclick = function() {
    console.log(i)
  }
}
```

这是最典型的引入闭包的例子，各种教材都有提到，如果你想打印的是 0 - 4，那么这种写法是错的。为什么是错的呢？因为任何一个监听函数触发的时候，打印的 i 都是父级作用域的 i，而这时候父级作用域的 i 已经变成了 5，所以任何监听函数触发后打印的都是 5

要解决这个问题，就要引入闭包，将代码改造为：

```js
btns[i].onclick = (function(i) {
  return function() {
    console.log(i)
  }
})(i)
```

很多人知道怎么改，但还是不理解，怎么就闭包了，哪一部分就闭包了？

我们说理解一个概念最重要的一点在于举一反三，现在我举另一个例子：

```js

const name = 'tarol'

function fn1() {
  console.log(name)
}

function fn2() {
  const name = 'okal'
  fn1()
}

fn2() // tarol or okal ?
```

这个问题很大一部分人会陷入迷糊，尤其是在聊闭包的时候抛出来。因为例 1 中模糊了一个概念，因为 onclick 是由外部行为触发的，所以很少有人关注到：当返回的闭包函数执行时，i 的值到底是由定义函数时的环境决定的，还是运行函数时的环境决定的，还是他们之间有一个先后顺序，就像原型链一样，运行时的作用域不存在 i，就追溯定义时的作用域？

例 2 的答案是 `tarol`，原因很简单，就是闭包的核心概念：当一个函数**运行**时，它可以访问**定义**函数时所在的作用域

为什么可以访问呢？因为函数在定义时，把当前的作用域作为内部属性（不开放给外部访问）固化在了这个函数的实例中，当函数运行的时候，把这个内部属性拿过来，用这个作用域作为父作用域，生成一个新的作用域链

为什么要这么设计呢？为什么不能像前面猜测的一样，使用运行时的作用域来生成作用域链呢？

我们看到例 2 迷糊还有个很重要的原因是例 2 这种代码在平常基本看不到，太抽象了，我们要理解它必须用概念来解构，不能用经验来推断。现在我们来改造一下，把例子中两个函数的定义分开

```js
// a.js
const name = 'tarol'

export function fn1() {
  console.log(name)
}
```

```js
// b.js
import { fn1 } from './a.js'

function fn2() {
  const name = 'okal'
  fn1()
}

fn2()
```

这样一拆分，是不是凭经验就可以推断出打印的肯定是 `tarol` 了，我们再改造下

```js
// sdk.js
const version = '1.0.0'

export function getVersion() {
  return version
}
```

```js
// page.js
import { getVersion } from './sdk.js'

function printVersions() {
  const version = '0.0.1'
  const sdkVersion = getVersion()
  console.log(`app version: ${version}`)
  console.log(`sdk version: ${sdkVersion}`)
}

printVersions()
```

这样一来，是不是跟我们平时写的业务代码很相似了？同时你也可以看到，如果父级作用域是在运行时确定的，那么我们在调用任何第三方库的时候，都要去了解第三方库，确保当前作用域的变量声明和第三方库中没有命名冲突。这样的编程体验，对于编程语言来说，岂不是一种灾难？

好了，闭包大概就聊到这里。刚才提到过，运行函数代码前很重要的一步是创建作用域链，但实际是这里漏了一步，就是 `this 绑定`。ES5 中针对这一过程添加了一系列特性，比如 Function.prototype.call/apply/bind，也许你会说，这几个方法你都用的很熟练了，下面我举个栗子，让它们重新陌生起来

```js
function test() {
  console.log(this.name);
}

const a = {
  name : 'tarol',
};

const b = {
  name : 'okal',
};

test.bind(a).bind(b)();
```

以上代码的运行结果是 `tarol`，哪怕代码是 `test.bind(a).bind(b).call(b)`，或者 `test.bind(a).bind(b).apply(b)`，运行结果都是 `tarol`

要解释这个现象，必须深入分析函数运行的整个过程，下一篇会详细阐述这部分内容