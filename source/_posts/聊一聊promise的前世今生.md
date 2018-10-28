---
title: 聊一聊promise的前世今生
date: 2018-05-22 21:56:55
tags:
  - 文章
  - ES
categories:
  - 技术
  - 前端
  - ES
---

&emsp;&emsp;promise 的概念已经出现很久了，浏览器、nodejs 都已经全部实现 promise 了。现在来聊，是不是有点过时了？

&emsp;&emsp;确实，如果不扯淡，这篇随笔根本不会有太多内容。所以，我就尽可能的，多扯一扯，聊一聊 promise 的另一面。

&emsp;&emsp;大家应该都知道怎么创建一个 promise

```js
var promise = new Promise(resolve => {
  setTimeout(() => resolve("tarol"), 3000);
});
```

&emsp;&emsp;如果从业时间长一点，会知道以前的 promise 不是这么创建的。比如如果你用过 jquery，jquery 在 1.5 引入 deferred 的概念，里面是这样创建 promise 的

```js
var defer = $.Deferred();
var promise = defer.promise();
```

&emsp;&emsp;如果你用过 angular，里面有个 promise service 叫$q，它又是这么创建 promise 的

```js
var defer = $q.defer();
var promise = defer.promise;
```

&emsp;&emsp;好了，这里已经有三种创建 promise 的方式了。其中第一种是现在最常见的，第二种和第三种看上去很像，但却有细微的差别。比如 jquery 里面是通过执行函数 promise()返回 promise，而 angular 中 defer 的属性就是 promise。如果你还有兴趣，那么我从头开始讲。

&emsp;&emsp;promise 的引入是为了规范化异步操作，随着前端的逻辑越来越复杂，异步操作的问题越来越亟待解决。首先大量的异步操作形成了 N 级的大括号，俗称“回调地狱”；其次 callback 的写法没有标准，nodejs 里面的 callback 一般是(err, data) => {...}，jquery 里面的 success callback 又是 data => {...}。在这种场景下，很多异步流程控制的类库应运而生。

&emsp;&emsp;作为前端，一般最早接触 promise 的概念是在 jquery 的 1.5 版本发布的 deferred objects。但是前端最早引入 promise 的概念的却不是 jquery，而是 dojo，而且 promise 之所以叫 promise 也是因为 dojo。Promises/A 标准的撰写者 KrisZyp 于 09 年在 google 的 CommonJS 讨论组发了一个贴子，讨论了 promise API 的设计思路。他声称想将这类 API 命名为 future，但是 dojo 已经实现的 deferred 机制中用到了 promise 这个术语，所以还是继续使用 promise 为此机制命名。之后便有了 CommonJS 社区的这个 proposal，即 Promises/A。如果你对什么是 deferred，什么是 promise 还存在疑问，不要急，先跳过，后面会讲到。

&emsp;&emsp;Promises/A 是一个非常简单的 proposal，它只阐述了 promise 的基本运行规则

1. promise 对象存在三种状态：unfulfilled, fulfilled 和 failed
2. 一旦 promise 由 unfulfilled 切换为 fulfilled 或者 failed 状态，它的状态不可再改变
3. proposal 没有定义如何创建 promise
4. promise 对象必须包含 then 方法：then(fulfilledHandler, errorHandler, progressHandler)
5. 交互式 promise 对象作为 promise 对象的扩展，需要包含 get 方法和 call 方法：get(propertyName)、call(functionName, arg1, arg2, ...)

&emsp;&emsp;如果你研究过现在浏览器或 nodejs 的 promise，你会发现 Promises/A 好像处处相似，但又处处不同。比如三种状态是这个叫法吗？progressHandler 没见过啊！get、call 又是什么鬼？前面两个问题可以先放一放，因为后面会做出解答。第三个问题这里解释下，什么是 get，什么是 call，它们的设计初衷是什么，应用场景是什么？虽然现在你轻易见不到它们了，但是了解它们有助于理解后面的部分内容。

&emsp;&emsp;一般来说，promise 调用链存在两条管道，一条是 promise 链，就是下图一中的多个 promise，一条是回调函数中的值链，就是下图二中的多个 value 或 reason。

![1](/assets/image/promise/1.png)

&emsp;&emsp;现在我们都知道，值链中前一个 callback（callback1）的返回值是后一个 callback（callback2）的入参（这里仅讨论简单值类型的 fulfilled 的情况）。但是如果我 callback1 返回的是 a，而 callback2 的入参我希望是 a.b 呢？或许你可以说那我 callback1 返回 a.b 就是了，那如果 callback1 和 callback2 都是固定的业务算法，它们的入参和返回都是固定的，不能随便修改，那又怎么办呢？如果 promise 只支持 then，那么我们需要在两个 then 之间插入一个新的 then：promise.then(callback1).then(a => a.b).then(callback2)。而 get 解决的就是这个问题，有了 get 后，可以这么写：promise.then(callback1).get('b').then(callback2)，这样 promise 链条中就可以减少一些奇怪的东西。同理，当 a.b 是一个函数，而 callback2 期望的入参是 a.b(c)，那么可以这样写：promise.then(callback1).call('b', c).then(callback2)。

&emsp;&emsp;我们回到之前的话题，现在常见的 promise 和 Promise/A 到底是什么关系，为什么会有花非花雾非雾的感觉？原因很简单，常见的 promise 是参照 Promises/A 的进阶版——Promises/A+定义的。

&emsp;&emsp;Promises/A 存在一些很明显的问题，如果你了解 TC39 process 或者 RFC 等标准审核流程，你会发现：

1. 首先 Promise/A 里面用语不规范，尤其是对术语的使用
2. 只描述 API 的用途，没有详细的算法

&emsp;&emsp;Promises/A+就是基于这样的问题产生的，要说明的是 Promises/A+的维护者不再是前面提到的 KrisZyp，而是由一个[组织](https://github.com/orgs/promises-aplus/people)维护的。

&emsp;&emsp;组织的成员如下，其中圈出来的另一个 Kris 需要留意一下，之后还会提到他。

![2](/assets/image/promise/2.png)

&emsp;&emsp;Promises/A+在 Promises/A 的基础上做了如下几点修正：

1. 移除了 then 的第三个入参 progressHandler，所以你见不到了
2. 移除了交互式 promise 的 API：get 和 call，所以你用不了了
3. 规定 promise2 = promise1.then(...)中允许 promise1 === promise2，但是文档必须对此情况进行说明
4. promise 的三种状态术语化：pending，fulfilled，rejected
5. 规定 fulfilled 传递的参数叫 value，rejected 传递的参数叫 reason
6. 严格区分 thenable 和 promise，thenable 作为 promise 的鸭子类型存在，thenable 是什么、鸭子类型是什么，下面会解释
7. 使用正式且标准的语言描述了 then 方法的逻辑算法，promises-aplus 还提供了验证实现的 test case

&emsp;&emsp;Promises/A+没有新增任何 API，而且删掉了 Promises/A 的部分冗余设计。这样一来，Promises/A+其实只规定了，promise 对象必须包含指定算法的方法 then。接下来我会归整下所谓的 then 算法，以及它存在哪些不常见的调用方式。

&emsp;&emsp;then 的基本调用方式：promise.then(onFulfilled, onRejected)，我默认你已经掌握了基础的 then 调用，所以常见的场景以下不做举例。

1. onFulfilled 和 onRejected 都是可选的，如果省略了或者类型不是函数，前面流过来的 value 或者 reason 直接流到下一个 callback，我们举两个极端的例子

```js
Promise.resolve("resolve")
  .then()
  .then(value => console.log(value)); // resolve
Promise.reject("reject")
  .then()
  .then(void 0, reason => console.log(reason)); //reason
```

&emsp;&emsp;&emsp;这个特性决定了我们现在可以这样写异常处理

```js
Promise.reject("reason")
  .then(v => v)
  .then(v => v)
  .then(v => v)
  .catch(reason => console.log(reason)); //reason
```

&emsp;&emsp;&emsp;但是如果你在 then 链条中，插入一个空的 onRejected，reason 就流不到 catch 了。因为 onRejected 返回了 undefined，下一个 promise 处于 fulfilled 态

```js
Promise.reject("reason")
  .then(v => v)
  .then(v => v)
  .then(v => v, () => {})
  .catch(reason => console.log(reason));
```

2. onFulfilled 或 onRejected 只能调用一次，且只能以函数的形式被调用，对应的是不能以属性方法的方式被调用，比如

```js
var name = "tarol";
var person = {
  name: "okal",
  say: function() {
    console.log(this.name);
  }
};
person.say(); //okal
Promise.resolve("value").then(person.say); //tarol
```

&emsp;&emsp;&emsp;如果你想第二行还是打印出'okal'，请使用 bind

```js
Promise.resolve("value").then(person.say.bind(person)); //okal
```

3. onFulfilled 或者 onRejected 中抛出异常，则 promise2 状态置为 rejected

```js
var promise2 = promise1.then(onFulfilled, onRejected);
```

4.  上面的例子中，onFulfilled 或者 onRejected 如果返回了任意值 x（如果不存在 return 语句，则是返回 undefined），则进入解析过程[[Resolve]](promise2, x)，解析过程[[Resolve]](promise2, x)算法如下：

    1.  如果 x 是 promise，则 promise2 的状态取决于 x 的状态
    2.  那么你会想，如果 x === promise2 呢？promise2 的状态取决于本身的状态？这就像把 obj 的原型设置为自身一样肯定是不允许的。所以其实在第一条规则之前，还有一条：如果 x === promise2，抛出 TypeError。之所以把这条规则放到下面，是用前一条规则引出这条规则的必要性
    3.  如果 x 不是对象，promise2 置为 fulfilled，value 为 x
    4.  如果 x 是对象

        1. 访问 x.then 时，如果抛出异常，则 promise2 置为 rejected，reason 为抛出的异常

        ```js
        var obj = {
          get then() {
            throw "err";
          }
        };
        Promise.resolve("value")
          .then(v => obj)
          .catch(reason => console.log(reason)); // err
        ```

        2. 如果 then 不是函数，则同 3

        ```js
        Promise.resolve("value")
          .then(v => {
            return {
              name: "tarol",
              then: void 0
            };
          })
          .then(v => console.log(v.name)); //tarol
        ```

        &emsp;&emsp;&emsp;如果 then 是函数，那么 x 就是一个 thenable，then 会被立即调用，传入参数 resolve 和 reject，并绑定 x 作为 this。

        1. 如果执行过程中调用了 resolve(y)，那么进入下一个解析过程[[Resolve]](promise2, y)，可以看出解析过程实际上是一个递归函数
        2. 如果调用了 reject(r)，那么 promise2 置为 rejected，reason 为 r
        3. 调用 resolve 或 reject 后，后面的代码依然会运行

        ```js
        Promise.resolve("value")
          .then(v => {
            return {
              then: (resolve, reject) => {
                resolve(v);
                console.log("continue"); //  continue
              }
            };
          })
          .then(v => console.log(v)); // value
        ```

        4. 如果既调用了 resolve、又调用了 reject，仅第一个调用有效

        ```js
        Promise.resolve("value")
          .then(v => {
            return {
              then: (resolve, reject) => {
                resolve("resolve");
                reject("reject");
              }
            };
          })
          .then(v => console.log(v), r => console.log(r)); //  resolve
        ```

        5. 如果抛出了异常，而抛出的时机在 resolve 或 reject 前，promise2 置为 rejected，reason 为异常本身。如果抛出的时机在 resolve 或 reject 之后，则忽略这个异常。以下 case 在 chrome 66 上运行失败，promise 处于 pending 状态不切换，但是在 nodejs v8.11.1 上运行成功

        ```js
        Promise.resolve("value")
          .then(v => {
            return {
              then: (resolve, reject) => {
                resolve("resolve");
                throw "err";
              }
            };
          })
          .then(v => console.log(v), r => console.log(r)); //  resolve
        ```

        ```js
        Promise.resolve("value")
          .then(v => {
            return {
              then: (resolve, reject) => {
                throw "err";
                resolve("resolve");
              }
            };
          })
          .then(v => console.log(v), r => console.log(r)); //  err
        ```

&emsp;&emsp;上面的例子中涉及到一个重要的概念，就是 thenable。简单的说，thenable 是 promise 的鸭子类型。什么是鸭子类型？搜索引擎可以告诉你更详尽的解释，长话短说就是“行为像鸭子那么它就是鸭子”，即类型的判断取决于对象的行为（对象暴露的方法）。放到 promise 中就是，一个对象如果存在 then 方法，那么它就是 thenable 对象，可以作为特殊类型（promise 和 thenable）进入 promise 的值链。

&emsp;&emsp;promise 和 thenble 如此相像，但是为什么在解析过程[[Resolve]](promise2, x)中交由不同的分支处理？那是因为虽然 promise 和 thenable 开放的接口一样，但过程角色不一样。promise 中 then 的实现是由 Promises/A+规定的（见 then 算法），入参 onFulfilled 和 onRejected 是由开发者实现的。而 thenable 中 then 是由开发者实现的，入参 resolve 和 reject 的实现是由 Promises/A+规定的（见 then 算法 3.3.3）。thenable 的提出其实是为了可扩展性，其他的类库只要实现了符合 Promises/A+规定的 thenable，都可以无缝衔接到 Promises/A+的实现库中。

&emsp;&emsp;Promises/A+先介绍到这里了。如果你细心，你会发现前面漏掉了一个关键的内容，就是之前反复提到的如何创建 promise。Promise/A+中并没有提及，而在当下来说，new Promise(resolver)的创建方式仿佛再正常不过了，普及程度让人忘了还有 deferred.promise 这种方式。那么 Promise 构造器又是谁提出来的，它为什么击败了 deferred 成为了 promise 的主流创建方式？

&emsp;&emsp;首先提出 Promise 构造器的标准大名鼎鼎，就是 es6。现在你见到的 promise，一般都是 es6 的实现。es6 不仅规定了 Promise 构造函数，还规定了 Promise.all、Promise.race、Promise.reject、Promise.resolve、Promise.prototype.catch、Promise.prototype.then 一系列耳熟能详的 API（Promise.try、Promise.prototype.finally 尚未正式成为 es 标准），其中 then 的算法就是将 Promises/A+的算法使用 es 的标准写法规范了下来，即将 Promises/A+的逻辑算法转化为了 es 中基于解释器 API 的具体算法。

&emsp;&emsp;那么为什么 es6 放弃了大行其道的 deferred，最终敲定了 Promise 构造器的创建方式呢？我们写两个 demo 感受下不同

```js
var Q = require("q");

var deferred = Q.defer();

deferred.promise.then(v => console.log(v));

setTimeout(() => deferred.resolve("tarol"), 3000);
```

```js
var p = new Promise(resolve => {
  setTimeout(() => resolve("tarol"), 3000);
});

p.then(v => console.log(v));
```

&emsp;&emsp;前者是 deferred 方式，需要依赖类库 Q；后者是 es6 方式，可以在 nodejs 环境直接运行。

&emsp;&emsp;如果你习惯使用 deferred，你会觉得 es6 的方式非常不合理：

&emsp;&emsp;首先，promise 的产生的原因之一是为了解决回调地狱的问题，而 Promise 构造器的方式在构造函数中直接注入了一个函数，如果这个函数在复杂点，同样存在一堆大括号。

&emsp;&emsp;其次，promise 基于订阅发布模式实现，deferred.resolve/reject 可以理解为发布器/触发器（trigger），deferred.promise.then 可以理解为订阅器（on）。在多模块编程时，我可以在一个公共模块创建 deferred，然后在 A 模块引用公共模块的触发器触发状态的切换，在 B 模块引用公共模块使用订阅器添加监听者，这样很方便的实现了两个没有联系的模块间互相通信。而 es6 的方式，触发器在 promise 构造时就生成了并且立即进入触发阶段（即创建 promise 到 promise 被 fulfill 或者 reject 之间的过程），自由度减少了很多。

&emsp;&emsp;我一度很反感这种创建方式，认为这是一种束缚，直到我看到了 bluebird（Promise/A+的实现库）讨论组中某个[帖子](https://groups.google.com/forum/#!topic/bluebird-js/mUiX2-vXW2s)的解释。大概说一下，回帖人的意思是，promise 首先应该是一个异步流程控制的解决方案，流程控制包括了正常的数据流和异常流程处理。而 deferred 的方式存在一个致命的缺陷，就是 promise 链的第一个 promise（deferred.promise）的触发阶段抛出的异常是不交由 promise 自动处理的。我写几个 demo 解释下这句话

```js
var Q = require("q");

var deferred = Q.defer();

deferred.promise
  .then(v => {
    throw "err";
  })
  .catch(reason => console.log(reason)); // err
setTimeout(() => deferred.resolve("tarol"));
```

&emsp;&emsp;以上是一个正常的异常流程处理，在值链中抛出了异常，自动触发下一个 promise 的 onRejected。但是如果在 deferred.promise 触发阶段的业务流程中抛出了异常呢？

```js
var Q = require("q");

var deferred = Q.defer();

deferred.promise.catch(reason => console.log(reason)); // 不触发
setTimeout(() => {
  throw "err";
  deferred.resolve("tarol");
});
```

&emsp;&emsp;这个异常将抛出到最外层，而不是由 promise 进行流程控制，如果想让 promise 处理抛出的异常，必须这么写

```js
var Q = require("q");

var deferred = Q.defer();

deferred.promise.catch(reason => console.log(reason)); // err

setTimeout(() => {
  try {
    throw "err";
  } catch (e) {
    deferred.reject(e);
  }
});
```

&emsp;&emsp;deferred 的问题就在这里了，在 deferred.promise 触发阶段抛出的异常，不会自动交由 promise 链进行控制。而 es6 的方式就简单了

```js
var p = new Promise(() => {
  throw "err";
});

p.catch(r => console.log(r)); // err
```

&emsp;&emsp;可见，TC39 在设计 Promise 接口时，首先考虑的是将 Promise 看作一个异步流程控制的工具，而非一个订阅发布的事件模块，所以最终定下了 new Promise(resolver)这样一种创建方式。

&emsp;&emsp;但是如果你说：我不听，我不听，deferred 就是比 new Promise 好，而且我的 promise 在触发阶段是不会抛出异常的。那好，还有另外一套标准满足你，那就是 Promises/B 和 Promises/D。其中 Promises/D 可以看做 Promises/B 的升级版，就如同 Promises/A+之于 Promises/A。这两个标准的撰写者都是同一个人，就是上面 Promises/A+组织中圈起来的大胡子，他不仅维护了这两个标准，还写了一个实现库，就是上面提到的 Q，同时 angular 中的$q 也是参照 Q 实现的。

[Promises/B](http://wiki.commonjs.org/wiki/Promises/B) 和 [Promises/D](http://wiki.commonjs.org/wiki/Promises/D)（以下统称为 Promises/B）都位于 CommonJS 社区，但是由于没有被社区采用，处于废弃的状态。而 Q 却是一个长期维护的类库，所以 Q 的实现和两个标准已经有所脱离，请知悉。

&emsp;&emsp;Promises/B 和 es6 可以说是 Promises/A+的两个分支，基于不同的设计理念在 Promises/A+的基础上设计了两套不同的 promise 规则。鉴于 Promises/A+在创建 promise 上的空白，Promises/B 同样提供了创建 promise 的方法，而且是大量创建 promise 的方法。以下这些方法都由实现 Promises/B 的模块提供，而不是 Promises/B 中 promise 对象的方法。

1. when(value, callback, errback_opt)：类似于 es6 中 Promise.resolve(value).then(callback, errback_opt)
2. asap(value, callback, errback_opt)：基本逻辑同 when，但是 when 中 callback 的调用会放在 setTimeout(callback, 0)中，而 asap 中 callback 是直接调用，该接口在 Q 中已经废弃
3. enqueue(task Function)：将一个 callback 插入队列并执行，其实就是 fn => setTimeout(fn, 0)，该接口在 Q 中已经废弃
4. get(object, name)：类似于 Promise.resolve(object[name])
5. post(object, name, args)：类似于 Promise.resolve(object[name].apply(object, args))
6. put(object, name, value)：类似于 Promise.resolve({then: resolve => object[name] = value; resolve()})，该接口在 Q 中重命名为 set
7. del(object, name)：类似于 Promise.resolve({then: resolve => delete object[name]; resolve()})，该接口在 Q 中 alias 为 delete
8. makePromise：创建一个流程控制类的 promise，并自定义其 verbs 方法，verbs 方法指以上的 get、post、put、del
9. defer：创建一个 deferred，包含一个延时类的 promise
10. reject：创建一个 rejected 的流程控制类 promise
11. ref：创建一个 resolve 的流程控制类 promise，该接口在 Q 中重命名为 fulfill
12. isPromise：判断一个对象是否是 promise
13. method：传入 verbs 返回对应的函数，如 method('get')即是上面 4 中的 get，已废弃

&emsp;&emsp;不知道以上 API 的应用场景和具体用法不要紧，我们先总结一下。Promises/B 和 es6 理念上最大的出入在于，es6 更多的把 promise 定义为一个异步流程控制的模块，而 Promises/B 更多的把 promise 作为一个流程控制的模块。所以 Promises/B 在创建一个 promise 的时候，可以选择使用 makePromise 创建一个纯粹的操作数据的流程控制的 promise，而 get、post、put、del、reject、ref 等都是通过调用 makePromise 实现的，是 makePromise 的上层 API；也可以使用 defer 创建一个 deferred，包含 promise 这个属性，对应一个延时类的 promise。

&emsp;&emsp;延时类的 promise 经过前面的解释基本都了解用法和场景，那对数据进行流程控制的 promise 呢？在上面 Promises/A 部分说明了 get 和 call 两个 API 的用法和场景，Promises/B 的 get 对应的就是 Promises/A 的 get，call 对应的是 post。put/set 是 Promises/B 新增的，和前二者一样，在操作数据时进行流程控制。比如在严格模式下，如果对象 a 的属性 b 的 writable 是 false。这时对 a.b 赋值，是会抛出异常的，如果异常未被捕获，那么会影响后续代码的运行。

```js
"use strict";
var a = {};

Object.defineProperty(a, "name", {
  value: "tarol",
  writable: false
});

a.name = "okay";

console.log("end"); // 不运行
```

&emsp;&emsp;这时候如果使用 Q 的 put 进行流程控制，就可以把赋值这部分独立开来，不影响后续代码的运行。

```js
"use strict";
var Q = require("q");

var a = {};

Object.defineProperty(a, "name", {
  value: "tarol",
  writable: false
});

Q.set(a, "name", "okay").then(
  () => console.log("success"),
  () => console.log("fail") // fail
);

console.log("end"); // end
```

&emsp;&emsp;这部分的应用场景是否有价值呢？答案就是见仁见智了，好在 Q 还提供了 makePromise 这个底层 API，自定义 promise 可以实现比增删改查这些 verbs 更强大的功能。比如当我做数据校验的时候可以这样写

```js
var Q = require("q");

var p = Q.makePromise({
  isNumber: function(v) {
    if (isNaN(v)) {
      throw new Error(`${v} is not a number`);
    } else {
      return v;
    }
  }
});

p.dispatch("isNumber", ["1a"])
  .then(v => console.log(`number is ${v}`))
  .catch(err => console.log("err", err)); // 1a is not a number
p.dispatch("isNumber", ["1"])
  .then(v => console.log(`number is ${v}`)) // number is 1
  .catch(err => console.log("err", err));
```

&emsp;&emsp;以上不涉及任何异步操作，只是用 Q 对某个业务功能做流程梳理而已。

&emsp;&emsp;而且 Q 并未和 es6 分家，而是在后续的版本中兼容了 es6 的规范（Q.Promise 对应 es6 中的全局 Promise），成为了 es6 的父集，加之 Q 也兼容了 Promises/A 中被 A+抛弃的部分，如 progressHandler、get、call（post）。所以对于 Q，你可以理解为 promise 规范的集大成者，整体来说是值得一用的。

&emsp;&emsp;最后要提到的是最为式微的 promise 规范——[Promises/KISS](http://wiki.commonjs.org/wiki/Promises/KISS)，它的实现库直接用 [futures](https://github.com/FuturesJS/FuturesJS) 命名，实现了 KrisZyp 未竟的心愿。如果比较 github 上的 star，KISS 甚至不如我没有提及的 [then.js](https://github.com/teambition/then.js) 和 [when](https://github.com/cujojs/when)。但是鉴于和 Q 一样，是有一定实践经验后 CommonJS 社区 promise 规范的提案，所以花少量的篇幅介绍一下。

&emsp;&emsp;Promises/KISS 不将 Promises/A 作为子集，所以它没有提供 then 作为订阅器，代之的是 when 和 whenever 两个订阅器。触发器也不是常见的 resolve、reject，而是 callback、errback 和 fulfill。其中 callback 类似于 notify，即 progressHandler 的触发器，errback 类似于 reject，fulfill 类似于 resolve。

&emsp;&emsp;为什么会有两个订阅器呢？因为 KISS 不像 Promises/A，A 中的 then 中是传入三个监听器，其中 progressHandler 还可以多次触发。但是 KISS 中的 when 和 whenever 一次只能传入一个监听器，所以它要解决的是，同一种订阅方式，怎么订阅三种不同的监听器？

&emsp;&emsp;首先，怎么区分 fulfilledHandler 和 errorHandler 呢？KISS 借鉴了 nodejs 的回调函数方式，第一个参数是 err，第二个参数是 data。所以 fulfilledHandler 和 errorHandler 在一个监听器里这样进行区分：

```js
function(err, data) {
  if (err) {...}    // errorHandler
  else {...}    // fulfilledHandler
}
```

&emsp;&emsp;那怎么区分多次调用的 progressHandler 呢？使用 when 注册的监听器只能调用一次，使用 whenever 注册的监听器可以调用多次。我们写个 demo 区分 Q 和 KISS 的 API 的不同：

```js
var Q = require("q");
var defer = Q.defer();
defer.promise.then(
  v => console.log("fulfill", v),
  err => console.log("reject", err),
  progress => console.log("progress", progress)
);
defer.notify(20); // progress 20
defer.notify(30); // progress 30
defer.notify(50); // progress 50
defer.resolve("ok"); // fulfill ok
```

```js
var future = require("future");

var p = new future();
var progressHandler = function(err, progress) {
  if (err) {
    console.log("err", err);
  } else {
    console.log("progress", progress);
  }
};
p.whenever(progressHandler);
p.callback(20); // progress 20
p.callback(30); // progress 30
p.callback(50); // progress 50
p.removeCallback(progressHandler); // 需要移除监听器，不然fulfill时也会触发
p.when(function(err, v) {
  // 需要在callback调用后注册fulfill的监听器，不然callback会触发
  if (err) {
    console.log("reject", err);
  } else {
    console.log("fulfill", v);
  }
});
p.fulfill(void 0, "ok"); // fulfill ok
```

&emsp;&emsp;可见，实现同样的需求，使用 future 会更麻烦，而且还存在先后顺序的陷阱（我一向认为简单类库的应用代码如果存在严重的先后顺序，是设计的不合格），习惯使用 es6 的 promise 的童鞋还是不建议使用 KISS 标准的 future。

&emsp;&emsp;整篇文章就到这里，前面提到的 then.js 和 when 不再花篇幅介绍了。因为 promise 的实现大同小异，都是订阅发布+特定的流程控制，只是各个标准的出发点和侧重点不同，导致一些语法和接口的不同。而随着 es 标准的越来越完善，其他 promise 的标准要么慢慢消亡（如 future、then.js），要么给后续的 es 标准铺路（如 bluebird、Q）。所以如果你没有什么执念的话，乖乖的跟随 es 标准是最省事的做法。而这边随笔的目的，一是借机整理一下自己使用各个 promise 库时长期存在的疑惑；二是告诉自己，很多现在看来尘埃落地的技术并非天生如此，沿着前路走过来会比站在终点看到更精彩的世界。
