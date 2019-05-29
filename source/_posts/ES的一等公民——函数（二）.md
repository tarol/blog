---
title: ES的一等公民——函数（二）
date: 2019-05-28 23:39:58
tags:
---
### 前言

前一篇聊到了闭包和作用域链，最后留下了一段运行结果出人意料的代码。本篇由我娓娓道来，为什么会是这样

#### 标准流程

函数/方法调用的语法一般是这样，[obj.]method(...args)，涉及 3 个对象：调用者 obj、函数 method、参数列表 args

当解释器解释这种语法时，执行以下步骤：

1. 如果是严格模式，绑定 this 为 `obj`
2. 如果是非严格模式
   1. 当 `obj` 为 null 或 undefined 时，绑定 this 为全局对象（如例 1）
   2. 当 `obj` 为基础数据类型时，绑定 this 为其包装类对象（如例 2）
   3. 其他情况绑定 this 为 `obj`
3. 创建运行环境（可以理解为作用域） `env`
   1. 将 `词法环境` 设置为 `env`
   2. 将 `变量环境` 设置为 `env`
4. 载入函数体 `code`，作为内部属性 [[Code]]
5. 通过 `code` 和 `args` 进行变量绑定
6. 通过 `this` 和 `args` 调用函数的内部属性 [[Call]]

```js
(function () {console.log(this)}).call(null)  // global
```

```js
Number.prototype.log = function() { console.log(this) }
const a = 1
a.log() // Number {1}
```

以上，第 1、2 条比较好理解，3、4、5有点不知所云，暂且略过，最重要的是第 6 点

就像上一篇提到的内部属性 [[Scope]]，[[Call]] 是函数另一个很重要的内部属性

普通函数的 [[Call]] 的逻辑很简单，进入新的执行环境，解释上述第 4 点生成的 [[Code]] 并跳出执行环境，根据解释结果 result 选择接下来的行为：

1. 如果 `result.type` 是 `throw`，抛出 `result.value`
2. 如果 `result.type` 是 `return`，返回 `result.value`
3. 否则 `result.type` 必定是 `normal`，返回 `undefined`

以上是最常见的函数执行过程，平时我们调用自定义的函数遵循的就是这个流程，现在我们进入稍微复杂一点的区域：apply & call。鉴于 apply 和 call 的解释器算法差不多，而 call 更为简化，以下的分析都是基于 call 的

#### apply & call

```js
const p = {
  name: 'tarol'
}
function hello() {
  console.log(`hello ${this.name}`)
}
hello.call(p)
```

以上是最常见的 call 用例。从语法上来说，被调用的函数不是 `hello` 而是 `hello.call`，也就是上面的标准流程适用于 `hello.call`，而非 `hello`。

按照标准流程，现在解释器来到了 `hello.call` 的 [[Code]]，之后 [[Code]] 做了以下这些事情，让控制权由 `hello.call` 成功转移到了 `hello`：

1. 类型检查
2. 由第二个参数得到 `args`
3. 由第一个参数得到 `this`
4. 通过 `this` 和 `args` 调用 `hello` 的内部属性 [[Call]]

由此可见，`call` 的语义还是比较简单的，只是由调用 `hello` 转变为通过 `call` 调用 `hello`，这个行为在 `call` 的 [[Code]] 层面进行了定义，`call` 本身可以理解为一个普通函数的内置版（由浏览器定义）

现在我们来到大 Boss —— bind 的面前

#### bind

```js
function test() {
  console.log(this.name);
}

const a = {
  name : 'tarol',
};

test.bind(a)();
```

经过了 `call` 部分的科普，我们发现 `bind` 突然变得陌生起来，不再和 `call` 类似了。因为 `call` 的语义是：通过 `call` 的调用完成控制的转移。而 `bind` 是返回一个新的函数 `fn`，最终调用的也是这个 `fn`

按照前面所述，函数的调用应该统一遵循标准流程。那么调用 `fn` ，进行到第 6 步时，传入 [[Call]] 的 `this` 应该是 undefined 或者 global，不可能会是 a。但最后的结果却恰恰是 a，所以猫腻肯定藏在之后的某个地方，`call` 的猫腻藏在 [[Code]] 里面，而 `bind` 的猫腻则藏在 [[Call]] 里面

上面提到的 [[Call]] 的运行逻辑是普通函数的运行逻辑，而 `bind` 返回的函数不是普通函数，是 **bound function**

假设普通函数 `fn`，`fn.bind(obj, ...args)` 返回的 bound function 为 `bfn`，`bfn` 和 `fn` 存在以下不同：

1. `bfn` 多出的内部属性
   1. [[TargetFunction]]：指向了 `fn`
   2. [[BoundThis]]：指向了 `obj`
   3. [[BoundArgs]]：指向了 `args`
2. `bfn(extraArgs)` 的 [[Call]] 算法不同
   1. 将 `bfn` 的 `[[BoundArgs]]` 和 `extraArgs` 结合形成新的 args
   2. 通过 `bfn` 的 `[[BoundThis]]` 和 `args` 调用 `bfn` 的 [[TargetFunction]] 的 [[Call]]

这样讲有些抽象，我们结合上一篇最后的例子 `test.bind(a).bind(b)()`，为什么最后 `test` 绑定的 this 是 a？

这个调用链涉及 3 个函数：普通函数 test，test.bind(a) => boundA，test.bind(a).bind(b) => boundB。其中 bound function 的内部属性是这样的（我们省略掉所有的参数）

1. boundA
   1. [[TargetFunction]]：test
   2. [[BoundThis]]：a
2. boundB
   1. [[TargetFunction]]：boundA
   2. [[BoundThis]]：b

我们知道，最后被调用的是 `boundB`，即按照函数调用的标准流程执行到了 `boundB` 的 [[Call]]。遵循以上 bound function 的 [[Call]] 算法，通过 `boundB` 的 [[BoundThis]] 即 `b` 调用 `boundB` 的 [[TargetFunction]] 即 `boundA` 的 [[Call]]，现在控制权到了 `boundA`，由于它也是 bound function，所以继续遵循以上算法，通过 `boundA` 的 [[BoundThis]] 即 `a` 调用 `boundA` 的 [[TargetFunction]] 即 `test`。理所应当的，test 调用时的 this 绑定就是 a 而不是 b 了

以上内容解释了上一篇最终留下的问题，本篇的结尾处同样也会留下一个问题

随着 ES6 的发布，函数的特性再一次被扩展，最典型的就是不能被 new 的箭头函数，和不能被直接调用的类函数了

```js
const arrow = () => {}
new arrow()
```

```js
class klass {}
klass()
```

以上两个例子都会报错，而 ES5 中的自定义函数从来不会出现类似的问题，那么 ES6 中又给函数带来了哪些隐藏的特性？下一篇会给出答案
