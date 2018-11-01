---
title: JavaScript中你所不知道的Object（一）
date: 2015-07-23 16:27:02
tags:
---

Object 实在是 JavaScript 中很基础的东西了，在工作中，它只有那么贫瘠的几个用法，让人感觉不过尔尔，但是我们真的了解它吗？

1. 当我们习惯用

```js
var a = {
  name: "tarol",
  age: 18
};
console.log(a.age); //18
a.age = 19;
console.log(a.age); //19
```

初始化和访问对象的时候，谁会在意这种方式也是合法的：

```js
var a = {
  name: "tarol",
  _age: 18,
  set age(value) {
    this._age = value;
  },
  get age() {
    return this._age;
  }
};
console.log(a.age); //18
a.age = 19;
console.log(a.age); //19
```

2. 当我们习惯用

```js
function A() {
  this.name = "tarol";
}

var a = new A();

function B() {
  this.age = 18;
}

B.prototype = a;

var b = new B();

console.log(b.name); //tarol
```

实现继承的时候，谁会在意其实也可以这样：

```js
var a = {
  name: "tarol"
};
var b = Object.create(a);
b.age = 18;

console.log(b.name); //tarol
```

3. 当我们知道原型链以后，想恶作剧修改内置函数的原型，却发现没有办法

```js
var a = {};

Object.prototype = a;

console.log(Object.prototype === a); //false
```

如果你感兴趣，那么我从头说起：

首先，JavaScript 中的对象是什么？ES5 中只给出一句话，对象是属性的集合。它只是一个盒子，它能做什么，取决于盒子里有什么。

那么，属性是什么，一般看来，属性是一个 key, value 对，这个说法是对的吗？我们来剖析下属性。

从一个程序员的角度来说，属性分为可通过 JS 调用的的和不可通过 JS 调用的。不可调用的叫做**内部属性**，那么可调用的我们对应着叫**外部属性**吧。内部属性是 JS 解释器实现各种接口的时候使用的算法中需要调用的属性，举个栗子，有个内部属性叫[[Put]]，这是一个内部方法，传入属性名和值，它的作用就是为属性赋值。所以当我们使用 a.age = 18 的时候，实际就调用到了这个内部属性。而外部属性又分为两种，一种是数据属性，一种是访问器属性。上面的例一中，第二种方式给对象 a 添加了三个属性，其中 name、\_age 是数据属性，age 是访问器属性。当属性是数据属性的时候，属性是 key、value 对的说法好像是对的，但当属性是访问器属性的时候，这个说法好像有问题了，因为一个 key 对应的是一个 setter 和一个 getter。所以，这个说法是错的？

其实，属性不是我们看到的那样，单单就一个 key 对应一个数据或者一个 setter 加一个 getter。属性还存在其他一些状态，我们称之为特性，无论是数据属性还是访问器属性，都存在四个特性。数据属性的特性为：[[Value]]、[[Writable]]、[[Enumerable]]、[[Configuration]]，访问器属性的特性为：[[Get]]、[[Set]]、[[Enumerable]]、[[Configuration]]。其中[[Value]]、[[Get]]、[[Set]]相信已经很好理解了，[[Writable]]描述数据属性是否可被重新赋值，[[Enumerable]]描述属性是否可被 for-in 遍历，[[Configuration]]描述属性特性是否可被修改（一旦设置为 false 则不可以再修改此特性）。

JS 开放了三个接口用于设置和获取属性的特性，分别是 Object.defineProperty、Object.defineProperties 和 Object.getOwnPropertyDescriptor。

```js
var a = {
  name: "tarol",
  age: 18,
  job: "coder"
};
Object.defineProperty(a, "name", {
  value: "ctarol",
  writable: true,
  enumerable: true,
  configuration: true
});
Object.defineProperties(a, {
  age: {
    value: 19,
    writable: true,
    enumerable: true,
    configuration: true
  },
  job: {
    value: "mental",
    writable: true,
    enumerable: true,
    configuration: true
  }
});
console.log(a.name); //tarol
console.log(a.age); //19
console.log(Object.getOwnPropertyDescriptor(a, "job")); //Object {value: "mental", writable: true, enumerable: true, configurable: true}
```

总的看来，属性还是可以作为一个 key, value 对的，但这个 value 不是我们赋的值，而是整个属性特性的集合，我们称之为**属性描述**。

外部属性的问题解决了，内部属性我们还只是蜻蜓点水般浅尝辄止，所以接下来我们开始从内部属性入手，对 JS 中的对象做一个更深刻的认识。以下是内部属性的表格：

| 属性名                | 用途                       | 属性类型                     | 方法返回值（仅适用方法） | 他处引用（仅适用数据）                                                                                    | 他处赋值（仅适用数据） | 他处调用（仅适用方法）                                                             | 调用其他（仅适用方法）                                                             |
| --------------------- | -------------------------- | ---------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [[Prototype]]         | 对象原型                   | Object                       |                          | __proto__ etc.                                                                                            |                        |                                                                                    |                                                                                    |
| [[Class]]             | 对象类型                   | String                       |                          | Object.prototype.toString()                                                                               |                        |                                                                                    |                                                                                    |
| [[Extensible]]        | 可否添加属性               | Boolean                      |                          | Object.seal(obj) --> false <br> Object.freeze(obj) --> false <br> Object.preventExtensions(obj) --> false |                        |                                                                                    |                                                                                    |
| [[GetOwnProperty]]    | 返回自身指定的属性描述     | func('prop')                 | 属性描述                 |                                                                                                           |                        | Object.getOwnPropertyDescriptor(obj, 'prop') <br> [[GetProperty]]                  |                                                                                    |
| [[GetProperty]]       | 返回原型链上指定的属性描述 | func('prop')                 | 属性描述                 |                                                                                                           |                        |                                                                                    | [[GetOwnProperty]]                                                                 |
| [[HasProperty]]       | 返回原型链上是否有指定属性 | func('prop')                 | Boolean                  |                                                                                                           |                        |                                                                                    | [[GetProperty]]                                                                    |
| [[DefineOwnProperty]] | 创建或修改自身的属性描述   | func('prop', desc, Boolean)  | Boolean                  |                                                                                                           |                        | Object.defineProperty(obj, 'prop', desc) <br> Object.defineProperties(obj,  descs) |                                                                                    |
| [[DefaultValue]]      | 将对象转换为对应的基础类型 | func(String/Number)          | String / Number          |                                                                                                           |                        |                                                                                    | toString() <br> valueOf()                                                          |
| [[Delete]]            | 删除对象的属性             | func('prop', Boolean)        | Boolean                  |                                                                                                           |                        |                                                                                    | [[GetOwnProperty]]                                                                 |
| [[CanPut]]            | 可否设置属性的值           | func('prop')                 | Boolean                  |                                                                                                           |                        |                                                                                    | [[GetOwnProperty]] <br> [[GetProperty]] <br> [[Extensible]]                        |
| [[Get]]               | 获取属性的值               | func('prop')                 | mixin                    |                                                                                                           |                        |                                                                                    | [[GetProperty]]                                                                    |
| [[Put]]               | 设置属性的值               | func('prop', mixin, Boolean) | Boolean                  |                                                                                                           |                        |                                                                                    | [[CanPut]] <br> [[GetOwnProperty]] <br> [[GetProperty]] <br> [[DefineOwnProperty]] |

上面的表格稍显晦涩，看不懂不要紧，我们来分下类。内部属性中除了 [[Class]]、[[DefaultValue]] 用于展示信息以外，其他都是用来操作外部属性的，可见对象的核心就是属性。其中我列出 [[CanPut]] 和 [[Put]] 的算法实现，因为这两个方法的实现涵盖了基本所有的属性操作和思想。

[[CanPut]]:

![1](/assets/image/object/1.png)

[[Put]]:

![2](/assets/image/object/2.png)

前面提到过，我们使用 `a.age = 18` 进行赋值的时候，调用的就是 [[Put]] 这个内部方法。由上图算法可知，当对属性赋值时，只要这个属性不是原型链上的访问器属性，那么就会修改或产生自身的数据属性，即不存在一种情况，就是修改原型链上的数据属性。我们测试下：

```js
var a = {
  name: 'tarol',
  _age: 18,
  set age(value) {
    this._age = value;
  },
  get age() {
    return this._age;
  }
};
var b = Object.create(a);
console.log(b.hasOwnProperty('name'));  //false
console.log(b.hasOwnProperty('_age'));  //false
console.log(b.hasOwnProperty('age'));  //false
b.name = 'okal';
b.age = 19;
console.log(b.hasOwnProperty('name'));  //true
console.log(b.hasOwnProperty('_age'));  //true
console.log(b.hasOwnProperty('age'));  //false
console.log(a.name);  //tarol
console.log(a.age);  //18
```

由结果可知，我们在对 name 这个原型链上的数据属性进行赋值时，实际上是重新创建了一个自身属性，对原型上的数据属性是没有影响的。而调用访问器属性 age 的 [[Set]] 方法的时候，传入的 this 也是当前的对象而不是访问器属性的拥有者，所以在当前对象上创建了一个自身属性 _age。

好了，上面说的是通用的内部属性，即 Object 类型的内部属性，而像 Boolean、Date、Number、String、Function 等拥有更多的内部属性，就留到下一篇再说。