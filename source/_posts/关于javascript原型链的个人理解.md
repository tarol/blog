---
title: 关于 javascript 原型链的个人理解
date: 2015-02-09 16:31:13
tags:
  - 文章
  - ES
categories:
  - 技术
  - 前端
  - ES
---

首先 js 是一种面对对象的语言，虽然大多数时候是以面对过程的形式展现出来。先来看一段代码：

```js
function Base() {
  this.name = "tarol";
}
function Sub() {
  this.age = 18;
}
var b = new Base();
Sub.prototype = b;
var s = new Sub();
console.log(s.name); //'tarol'
```

结果相信都知道，但是实现的原理却不明，于是逐行解析：

```js
Sub.prototype = b;
```

prototype 是函数对象（函数也是对象）的特有属性，普通对象是不存在这个属性的，该属性默认为{}。这个属性的作用就是，将这个属性赋予给、使用此函数作为构造函数进行实例化的对象、作为该对象[[Propertype]]的内部属性。所谓内部属性就是通过 js 不能访问的属性，庆幸的是现代浏览器开放了这个属性的访问，一般属性名为 `__proto__`。所以：

```js
var s = new Sub();
```

这一段（也可以说每个 new 操作）可以展开：

```js
var s = {};
s.__proto__ = Sub.prototype;
Sub.call(s);
```

可见，对象实例化后，与构造函数的耦合在于前者的 `__proto__` 属性和后者的 prototype 属性为同一个对象的引用。

然后 `__proto__` 这个内部属性是用来做什么的呢，是用来实现 js 中的“继承”的。这个“继承”之所以打引号是用来区别 c++ 和 java 中的类式继承的思想，这种方式称之为原型继承。

原型继承的原理是：每个对象都保有一个指向其他对象的引用（也就是 `__proto__` 即原型），这条引用最终指向 null（null 也是对象），当访问这个对象的任一属性时，如果在本对象中没有找到，则向其 `__proto__` 指向的对象中寻找，直到原型链的尽头 null。需要注意的是：原型链中的所有元素都是实例化的对象。

现在回到上面的代码，当访问对象 s 的属性 name 时，在 `s` 中没有找到，于是跑到 `s` 的 `__proto__` 指向的 Base 的实例对象中寻找，找到了 name 为'tarol'。

但如果访问 s 的属性 gender 时，在 s 和 `s.__proto__` 中都没有找到，于是继续向 `s.__proto__.__proto__` 中寻找。由 `s.__proto__ === new Base`，可知 `s.__proto__.__proto__ === Base.prototype`（即`(new Constructor()).__proto__ === Constructor.prototype`）。上面说到，prototype 默认是{}，于是继续在 `Base.prototype.__proto__` 中找，即 `(new Object()).__proto__ === Object.prototype`。如果没有添加一些自定义的属性，`Object.prototype` 同样是{}，这样看来，似乎要陷入无限的循环当中，但其实到这里原型链就走向了尽头，因为浏览器会定义 `Object.prototype.__proto__ = null`。用下面的流程梳理下，-->代表原型链上的传递，===代表对象不同引用间的替换。

```
s.gender --> s.__proto__.gender === Sub.prototype.gender === b.gender --> b.__proto__.gender === Base.prototype.gender === (new Object()).gender --> (new Object()).__proto__.gender === Object.prototype.gender --> Object.prototype.__proto__ === null
```

`Object.prototype.__proto__`也是所有对象原型链的尽头，包括 Function（函数的构造函数本身也是对象）、Date（普通对象）、Math（单体内置对象），因为 Function.prototype 是默认的{}，即进入上面流程中 (new Object()).gender 这一阶段。

最后举个栗子：

```js
function Class() {}
var a = new Class();
Class.prototype = new Class();
var b = new Class();
console.log(b.__proto__.__proto__ === a.__proto__);
```

其中最让人困惑的估计是

```js
Class.prototype = new Class();
```

如果用类式继承来理解，会误以为这句代码会陷入死循环调用当中，但注意上面红字标明那句话：原型链中的所有元素都是实例化的对象。也就是，这里只是将一个对象插入 Class 对象的原型链最前端（除对象本身外），至于这个对象是 new Class 还是 new Glass（见第一段红字，这句代码修改了构造函数的引用，使 \_\_proto\_\_ 和 prototype 之间的耦合解除了，可以说这个对象和构造函数“分家”了），都不影响调用的过程。所以，这句代码的目的是修改了 Class 构造函数，让其实例化的对象的原型链长度+1。

写的有些凌乱，如果过段时间我看不懂了再回来改一改。

参考：

- [《理解 JavaScript 面向对象的思路》](http://www.cnblogs.com/winter-cn/archive/2009/05/16/1458390.html) By 温神

- 《关于\_\_proto\_\_和 prototype 的一些理解》By TonyCoolZhu

- 《JavaScript 高级程序设计》By Nicholas C.Zakas
