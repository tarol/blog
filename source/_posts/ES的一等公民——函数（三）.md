---
title: ES的一等公民——函数（三）
date: 2019-05-29 23:00:26
tags:
---
### 前言

前一篇聊到了不同函数之间调用时行为的不同，在进入正题之前，要补充一下同一个函数使用不同调用方式时行为的不同。这句话有点绕，体现在语法上就是，同一个函数 `fn`，可以以函数的方式调用 `fn()`，也可以以构造器的方式调用 `new fn()`，这两者在语义上有什么不同呢？

跟以作为函数调用不同的是，作为构造器调用时没有 `this 绑定` 这一过程，调用内部属性 [[Call]] 也变成了调用内部属性 [[Construct]]，普通函数的 [[Construct]] 又是怎样的运行逻辑呢？

1. 创建原生对象 `obj`，相当于 {}
2. 初始化 `obj` 的各个内部属性、原型链等
3. 通过 `obj` 作为 `this`，及调用时传入的 `args` 调用 fn 的 [[Call]]
4. 如果 [[Call]] 返回的 `result` 是对象，那么 `result` 就是 `new fn()` 的结果
5. 如果 `result` 不是对象，那么 `obj` 就是 `new fn()` 的结果

可见，当一个函数作为函数调用时，和作为构造器调用时，`this 绑定` 的时机是不同的，前者是在进入内部属性 [[Call]] 之前，后者是在进入内部属性 [[Constructor]] 之后，进入 [[Call]] 之前

前面聊完了普通函数作为函数调用，普通函数作为构造器调用，bound函数作为函数调用，有心的同学就会问了，bound函数作为构造器调用会怎么样？比如以下这种情况

```js

const obj = {
  name: 'okal'
}

function fn() {
  this.name = 'tarol'
}

const boundFn = fn.bind(obj)

new boundFn()

console.log(obj.name) // 'okal'

```

如果 `boundFn` 的 [[Constructor]] 逻辑和普通函数一致，那么在 [[Constructor]] 中会新建一个空对象并作为 this 调用 `boundFn` 的 [[Call]]，而在 `boundFn` 的 [[Call]] 中会重新修改 `this` 指向 `obj` 再调用 `fn`，那么最终的结果就是 `tarol` 而非我们看到的 `okal`

可以得出 `bound 函数` 的 [[Constructor]] 和普通函数也是不一致的，这种不一致体现在 `bound 函数` 的 [[Constructor]] 不调用自身的 [[Call]]，而是在组合 [[BoundArgs]] 后直接调用 [[BoundTarget]] 的 [[Constructor]]，所以就有了以上这种现象

而到了 ES6 当中，函数的特性又被扩展了，开放了两个新的函数类型——只能作为构造器调用的类函数、只能作为函数调用的箭头函数。它们和函数之间有用什么不同和联系呢？

#### 类函数

类在 ES6 中引入后，在新的 spec 中不停的被丰富，但我们这里只聊 ES6 中的类

ES6 中的类很简单，因为以下几点：

1. 没有接口声明，只有类声明
2. 没有类字段，没有类访问器，只有类方法
3. 没有私有成员，没有保护成员，没有静态成员，只有公共成员
4. 没有类装饰器，没有类方法、类字段装饰器

而以上提到的大部分特性，都会在三年之类发布并跟大家见面，所以，颤抖吧！

正因为 ES6 中的类语法特别简单，所以很多人认为这不过是构造函数的语法糖。我们说到语法糖，一般是指产生式（production）之间可以进行简单的转换（transform），比如 `obj.func.bind(a)` <=> `::obj.func`，而 ES6 中的类虽然语法简单，但实际上包含很大的一部分特性，这些特性是什么呢？