---
title: 从 Object 和 Function 说说JS的原型链
date: 2015-07-21 16:45:03
tags:
---

ECMAScript 规定了两个特殊的内置对象：Object 和 Function。他们的特殊性在于，他们本身既是对象又是函数，而他们同时也是对象和函数的构造器。这种自己生自己的逻辑显然违反人性，如果还停留在类的继承的思想上，那么更加无法理解。

然而 ECMAScript 是基于原型链的，所以忘掉类的继承，从原型链入手：原型链是对象的集合，每个对象都有内部属性 [[Prototype]]（注 1）指向另一个对象；当访问对象某一属性的时候，如果此属性不为此对象的自身属性（注 2），则继续去 [[Prototype]] 指向的对象上查找此属性。[[Prototype]] 形成的对象的链式集合即原型链。这里可以得出：**原型链上的所有元素都是对象**。

ECMASciprt 规定：原型链必须是有限长度（注 3），而且终点必须是 null。现在终点是唯一的，那么原型链上倒数第二个元素是不是唯一的呢？ECMAScript 没有规定，但从实现上来看，是唯一的。因为原型链上所有的元素都是对象，所以倒数第二个元素应该是所有对象的基础对象。这个对象在实现中只给出一个引用，就是 Object.prototype。这里可以得出：**原型链上有两个元素是固定的，终点是 null，倒数第二的元素是 Object.prototype 指向的对象（注 4）**。

那么倒数第三个元素是不是固定的呢？不是。从倒数第二个元素是 Object.prototype 来看，通过{}字面量和 new Object()创建的对象都在倒数第三这个位置，即 POJO 都在倒数第三。另外还有两个特例，一个是除内置函数之外的内置对象，如 Math、JSON；一个是除 Object 之外的内置函数的 prototype 属性指向的对象，如 Function.prototype。这里可以得出：**原型链上倒数第三的元素一般是 POJO+Math/JSON+(Function/Array/String/Boolean/Number/Date/RegExp/Error).prototype**。

倒数第三的位置出现了这么多的 prototype，那么倒数第四的位置就好推测了，所有除 Object 之外的内置函数作为构造器调用（注 5）时生成的实例对象都在倒数第四。其中需要注意的是，所有的内置函数本身是 Function 作为构造器调用生成的实例对象，所以都在这个位置。这里可以得出：**原型链上倒数第四的元素一般是(Function/Array/String/Boolean/Number/Date/RegExp/Error)实例，其中包括（Object/Function/Array/String/Boolean/Number/Date/RegExp/Error），注意这个括号里面 Object 回来了**。

原型链基本结构如下图：

![1](/assets/image/proto/1.png)

从图上看来：

1. array 等非 POJO 对象在原型链上和他们的构造器属于同一级别
2. POJO 在原型链上比他的构造器还靠后一个级别

参考文档：[ES5](https://www.w3.org/html/ig/zh/wiki/ES5)

注：

1. 内部属性是不开放给 JS 访问的属性，但现代浏览器已经可以通过**proto**属性访问和设置[[Prototype]]
2. own property，即直接设置在此对象上的属性
3. 执行以下代码感受下：

```js
var a = {};
a.__proto__ = a;
```

4. Object.prototype 和基础对象的关系好比快捷方式和应用程序，本身没有任何关系，现在可以指向基础对象，以后也可以指向其他对象。当然原则上是不允许的，基础对象没有引用内存会被回收，所以 ECMAScript 规定 Object 下的 prototype 属性的 writable 和 configuration 特性都是 false（特性的问题以后另起一篇）
5. 假设 func 为一个函数，func()即作为函数调用（调用内部函数属性[[Call]]），new func()即作为构造器调用（调用内部函数属性[[Construct]]）
