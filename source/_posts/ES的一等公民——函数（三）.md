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

可以得出 `bound 函数` 的 [[Constructor]] 和普通函数也是不一致的
