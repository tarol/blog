---
title: 私有成员语法 FAQ
date: 2018-10-28 20:58:12
tags:
  - 翻译
  - ES
categories:
  - 翻译
  - 前端
  - ES
---

## 翻译自

> [tc39/proposal-class-fields](https://github.com/tc39/proposal-class-fields/blob/master/PRIVATE_SYNTAX_FAQ.md)

> 译者按：社区一直以来有一个声音，就是反对使用 `#` 声明私有成员。但是很多质疑的声音过于浅薄，纯属人云亦云。其实 TC39 早就对此类呼声做过回应，并且归纳了一篇 FAQ。翻译这篇文章的同时，我会进行一定的扩展（有些问题的描述不够清晰），目的是让大家取得一定的共识。我认为，只有你知其然，且知其所以然，你的质疑才是有力量的。

> 译者按：首先要明确的一点是，委员会对于私有成员很多设计上的抉择是基于 ES 不存在类型检查，为此做了很多权衡和让步。这篇文章在很多地方也会提及这个不同的基本面。

## `#` 是怎么回事？

`#` 是 `_` 的替代方案。

```js
class A {
  _hidden = 0;
  m() {
    return this._hidden;
  }
}
```

之前大家习惯使用 `_` 创建类的私有成员，但这仅仅是社区共识，实际上这个成员是暴露的。

```js
class B {
  #hidden = 0;
  m() {
    return this.#hidden;
  }
}
```

现在使用 `#` 创建类的私有成员，在语言层面上对该成员进行了隐藏。

由于兼容性问题，我们不能去改变 `_` 的工作机制。

> 译者按：如果将私有成员的语义赋予 `_`，之前使用 `_` 声明公共成员的代码就出问题了；而且就算你之前使用 `_` 是用来声明私有成员的，你能保证你心中的语义和现阶段的语义完全一致么？所以为了慎重起见，将之前的一种错误语法（之前类成员以 # 开头会报语法错误，这样保证了以前不存在这样的代码）加以利用，变成私有成员语法。

## 为什么不能通过 `this.x` 访问？

> 译者按：这个问题的意思是，如果类 A 有私有成员 #x（**其中 # 是声明私有，x 才是成员名**），为什么内部不能通过 this.x 访问该成员，而一定要写成 this.#x？

> 译者按：以下是一系列问题，问题 -> 解答 -> 延伸问题 -> 解答 ...

有 `x` 这个私有成员，不意味着不能有 `x` 这个公共成员，因此访问私有成员不能是一个普通的查找。

这是 JS 的一个问题，因为它缺少静态类型。静态类型语言使用类型声明区分外部公共/内部私有的情况，而不需要标识符。但是动态类型语言没有足够的静态信息区分这些情况。

### 延伸问题 1：那么为什么这个提案允许一个类同时存在私有成员 #x 和公共成员 x ？

1. 如果私有成员和公共成员冲突，会破坏其“封装性”。

2. 私有成员很重要的一点是子类不需要知道它们。应该允许子类声明成员 `x`，即使父类有一个同名的私有成员。

> 译者按：感觉第二点有点文不对题。

其他支持私有成员的语言通常是允许的。如下是完全合法的 Java 代码：

```java
class Base {
  private int x = 0;
}

class Derived extends Base {
  public int x = 0;
}
```

> 译者按：所谓的“封装性”（encapsulation / hard private）是很重要的概念，[最底下](#encapsulation)会有说明。最简单的解释是，外部不能以任意方式获取私有成员的任何信息。假设，公共成员和私有成员冲突，而 `x` 是 `obj` 的私有成员，这时候外部存在 `obj.x`。如果公私冲突，这里将会报错，外部就嗅探到了 `obj` 存在 `x` 这个私有成员。这就违背了“封装性”。

### <a name="runtime">延伸问题 2：为什么不使用运行时检测，来决定访问的是私有成员还是公共成员？</a>

属性访问的语义已经很复杂了，我们不想仅仅为了这个特性让每次属性访问都更慢。

> 译者按：属性访问的复杂性可以从 [toFastProperties](https://github.com/sindresorhus/to-fast-properties) 和 [toFastProperties 如何使对象的属性更快](https://codeday.me/bug/20170429/11591.html) 管窥一二

它（运行时检测）还可能让类的方法被非实例（比如普通对象）欺骗，使其在非实例的字段上进行操作，从而造成私有成员的泄漏。这条[评论](https://github.com/tc39/proposal-private-fields/issues/14#issuecomment-153050837) 是一个例子。

> 译者按：如果不结合以上的例子，上面这句话其实很难理解。所以我觉得有必要扩展一下，虽然有很多人认为这个例子没有说服力。
>
> 首先我希望你了解 Java，因为我会拿 Java 的代码做对比。
>
> 其次我再明确一下，这个问题的根本在于 ES 没有静态类型检测，而 TS 就不存在此类烦恼。
>
> ```Java
> public class Main {
>     public static void  main(String[] args){
>         A a1 = new A(1);
>         A a2 = new A(2);
>         a1.swap(a2);
>         a1.say();
>         a2.say();
>     }
> }
>
> class A {
>     private int p;
>     A(int p) {
>         this.p = p;
>     }
>     public void swap(A a) {
>         int tmp = this.p;
>         this.p = a.p;
>         a.p = tmp;
>     }
>     public void say() {
>         System.out.println(this.p);
>     }
> }
> ```
>
> 以上的例子是一段正常的 Java 代码，它的逻辑很简单：声明类 A，A 存在一个公共方法，允许实例和另一个实例交换私有成员 p。
>
> 把这部分逻辑转换为 JS 代码，并且使用 private 声明
>
> ```js
> class A {
>   private p;
>   constructor(p) { this.p = p }
>   swap(a) {
>       let tmp = a.p;
>       a.p = this.p;
>       this.p = tmp;
>   }
>   say() {
>     console.log(this.p);
>   }
> }
> ```
>
> 乍一看是没有问题的，但 swap 有一个陷阱：如果传入的对象不是 A 的实例，或者说只是一个普通的对象，是不是就可以把私有成员 p 偷出来了？
>
> JS 是不能做类型检查的，那我们怎么声明传入的 a 必须是 A 的实例呢？现有的方案就是检测在函数体中是否存在对入参的私有成员的访问。比如上例中，函数中如果存在 a.#p，那么 a 就必须是 A 的实例。否则就会报 `TypeError: attempted to get private field on non-instance`
>
> 这就是为什么对私有成员的访问必须在语法层面上体现，而不能是简单的运行时检测。

### 延伸问题 3：当类中声明了私有成员 `x` 时，为什么不让 `obj.x` 总是代表对私有成员的访问？

> 译者按：这个问题的意思是当某个类声明了私有成员 `x`，那么类中所有的成员表达式 `sth.x` 都表示是对 `sth` 的私有成员 `x` 的访问。我觉得这是一个蠢问题，谁赞成？谁反对？

类方法经常操作不是实例的对象。当 `obj` 不是实例的时候，如果 `obj.x` 突然间不再指的是 `obj` 的公共字段 `x`，仅仅是因为在类的某个地方声明了私有成员 `x`，那就太奇怪了。

### 延伸问题 4：为什么不赋予 `this` 关键字特殊的语义？

> 译者按：这个问题针对前一个答案，你说 `obj.x` 不能做这种简单粗暴的处理，那么 `this.x` 可以咯？

`this` 已经是 JS 混乱的原因之一了；我们不想让它变的更糟。同时，这还存在一个严重的重构风险：如果 `const thiz = this; thiz.x` 和 `this.x` 存在不同的语义，将会带来很大的困扰。

而且除了 `this`，传入的实例的私有成员将无法访问（比如延伸问题 2 的 js 示例中传入的 a）。

### 延伸问题 5：为什么不禁止除 `this` 之外的对象对私有成员的访问？举个栗子，这样一来甚至可以使用 `x` 替代 `this.x` 表示对私有属性的访问？

> 译者按：这个问题再做了一次延伸，上面提到传入的实例的私有成员不能访问，这个问题是：不能访问就不能访问呗，有什么关系？

这个提案的目的是允许同类实例之间私有属性的互相访问。另外，使用裸标识符（即使用 `x` 代替 `this.x`）不是 JS 的常见做法（除了 `with`，而 `with` 的设计也通常被认为是一个错误）。

> 译者按：一系列延伸问题到此结束，这类问题弄懂了基本上就掌握私有成员的核心语义和设计原则了。

## 为什么 `this.#x` 可以访问私有属性，而 `this[#x]`不行？

1. 这会让属性访问的语义更复杂。

2. 动态访问违背了 `私有` 的概念。举个栗子：

```js
class Dict extends null {
  #data = something_secret;
  add(key, value) {
    this[key] = value;
  }
  get(key) {
    return this[key];
  }
}

new Dict().get("#data"); // 返回了私有属性
```

### 延伸问题 1：赋予 `this.#x` 和 `this[#x]` 不同的语义是否破坏了当前语法的稳定性？

不完全是，但这确实是个问题。不过从某个角度上来说，`this.#x` 在当前的语法中是非法的，这已经破坏了当前语法的稳定性。

另一方面，`this.#x` 和 `this[#x]` 之间的差异比你看到的还要大，这也是当前提案的不足。

## 为什么不能是 `this#x`，把 `.` 去掉？

这是可行的，但是如果我们再简化为 `#x` 就会出[问题](https://github.com/tc39/proposal-private-fields/issues/39#issuecomment-237121552)。

> 译者按：这个说法很简单，我直接列在下面
>
> 栗子：
>
> ```js
> class X {
>   #y
>   z() {
>     w()
>     #y() // 会被解析为w()#y
>   }
> }
> ```

泛言之，因为 `this.#` 的语义更为清晰，委员会基本都支持这种写法。

> 译者按：这也是被认为没有说服力的一个说辞，因为委员会把 `this#x` 极端化成了 `#x`，然后描述 `#x` 的不足，却没有直接给出 `this#x` 的不足。

## 为什么不是 `private x`？

这种声明方式是其他语言使用的(尤其是 Java)，这意味着使用 `this.x` 访问该私有成员。

假设 `obj` 是类实例，在类外部使用 `obj.x` 表达式，JS 将会静默地创建或访问公共成员，而不是抛出一个错误，这将会是 bug 的主要潜在来源。

它还使声明和访问对称，就像公共成员一样：

```js
class A {
  pub = 0;
  #priv = 1;
  m() {
    return this.pub + this.#priv;
  }
}
```

> 译者按：这里说明了为什么使用 `#` 不使用 `private` 的主要原因。我们理一下：
>
> 如果我们使用 `private`
>
> ```js
> class A {
>   private p;
>   say() {
>     console.log(this.p);
>   }
> }
> const a  = new A;
> console.log(a.p);
> a.p = 1;
> ```
>
> 例子当中，对属性的创建如果不抛错，是否就会创建一个公共字段？
> 如果创建了公共字段，调用 `a.say()` 打印的是公共字段还是私有字段？是不是打印哪个都感觉不对？
> 可能你会说，那就抛错好了？那这样就是运行时检测，这个问题在[上面](#runtime)有过描述。

## <a name="share">为什么这个提案要允许不同实例间访问私有成员？其他语言也是这样的吗？</a>

因为这个功能非常有用，举个栗子：判断 `Point` 是否相等的 `equals` 方法。

实际上，其他语言由于同样的原因也是这样设计的；举个栗子，以下是合法的 Java 代码

```java
class Point {
  private int x = 0;
  private int y = 0;
  public boolean equals(Point p) { return this.x == p.x && this.y == p.y; }
}
```

## Unicode 这么多符号，为什么恰恰是 `#` ？

没人说 `#` 是最漂亮最直观的符号，我们用的是排除法：

- `@` 是最初的选择，但是被 `decorators` 占用了。委员会考虑过交换 `decorators` 和 `private` 的符号（因为它们都还在提案阶段），但最终还是决定尊重社区的习惯。
- `_` 对现有的项目代码存在兼容问题，因为之前一直允许 `_` 作为成员变量名的开头。
- 其他之前用于中缀运算符，而非前缀运算符的。假设是可以的，比如`%`, `^`, `&`, `?`。考虑到我们的语法有点独特 —— `x.%y` 当前是非法的，所以不存在二义性。但无论如何，简写会带来问题。举个栗子，以下代码看上去像是将符号作为中缀运算福：

```js
class Foo {
  %x;
  method() {
    calculate().my().value()
    %x.print()
  }
}
```

如上，开发人员看上去像是希望调用 `this.%x` 上的 `print` 方法。但实际上，将会执行取余的操作！

- 其他不属于 ASCII 或者 IDStart 的 Unicode 字符也可以使用，但对于许多用户来说，他们很难在普通的键盘上找到对应的字符。

最后，唯一的选项是更长的符号序列，但比起单个字符似乎不太理想。

> 译者按：委员会还是举了省略分号时的例子，可是上面也说了，就算是 `#`，也同样存在问题。

## 为什么这个提案不允许外部通过一些机制用于反射/访问私有成员（比如说测试的时候）？其他语言也是这样的吗？

这样做会违反“封装性”。其他语言允许并不是一个充分的理由，尤其是在某些语言（例如 C++）中，是通过直接修改内存实现的，而且这也不是一个必需的功能。

## <a name="encapsulation">你所谓的“封装性”和“硬隐私”是什么意思？</a>

意味着私有成员是完全内部的：没有任何类外部的 JS 代码可以探测和影响到它们的存在，它们的成员名，它们的值，除非类自己选择暴露他们。（包括子类和父类之间也是完全封装的）。

意味着反射方法们，比如说 [getOwnPropertySymbols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertySymbols) 也不能暴露私有成员。

意味着如果一个类有一个私有成员 `x`，在类外部实例化类对象 `obj`，这时候通过 `obj.x` 访问的应该是公共成员 `x`，而不是访问私有成员或者抛出错误。注意这里的现象和 Java 并不一致，因为 Java 可以在编译时进行类型检查并且禁止通过成员名动态访问内容，除非是反射接口。

## 为什么这个提案会将封装性作为目的？

1. 库的作者们发现，库的使用者们开始依赖任何接口的公开部分，而非文档上的那部分（即希望使用者们关注的部分）。一般情况下，他们并不认为他们可以随意的破坏使用者的页面和应用，即使使用者没有参照他们的建议作业。因此，他们希望有真正的私有化可以隐藏实现细节。

2. 虽然使用实例闭包或者 `WeakMaps` 已经可以模拟真实的封装（[如下](#model)），但是两种方式和类结合都过于浪费，而且还涉及了内存使用的语义，也许这很让人惊讶。此外, 实例闭包的方式还禁止同类的实例间共享私有成员（[如上]](#share)），而 `WeakMaps` 的方式还存在一个暴露私有数据的潜在风险，并且运行效率更低。

3. 隐藏但不封装也可以通过使用 `Symbol` 作为属性名实现（[如下](#Symbols)）。

当前提案正在努力推进硬隐私，使 [decorators](https://github.com/tc39/proposal-private-fields/blob/master/DECORATORS.md) 或者其他机制提供给类一个可选的逃生通道。我们计划在此阶段收集反馈，以确定这是否是正确的语义。

查看这个 [issue](https://github.com/tc39/proposal-private-fields/issues/33) 了解更多。

### <a name="model">使用 `WeakMap` 如何模拟封装？</a>

```js
const Person = (function() {
  const privates = new WeakMap();
  let ids = 0;
  return class Person {
    constructor(name) {
      this.name = name;
      privates.set(this, { id: ids++ });
    }
    equals(otherPerson) {
      return privates.get(this).id === privates.get(otherPerson).id;
    }
  };
})();
let alice = new Person("Alice");
let bob = new Person("Bob");
alice.equals(bob); // false
```

然而这里还是存在一个潜在的问题。假设我们在构造时添加一个回调函数：

```js
const Person = (function() {
  const privates = new WeakMap();
  let ids = 0;
  return class Person {
    constructor(name, makeGreeting) {
      this.name = name;
      privates.set(this, { id: ids++, makeGreeting });
    }
    equals(otherPerson) {
      return privates.get(this).id === privates.get(otherPerson).id;
    }
    greet(otherPerson) {
      return privates.get(this).makeGreeting(otherPerson.name);
    }
  };
})();
let alice = new Person("Alice", name => `Hello, ${name}!`);
let bob = new Person("Bob", name => `Hi, ${name}.`);
alice.equals(bob); // false
alice.greet(bob); // === 'Hello, Bob!'
```

乍看好像没有问题，但是：

```js
let mallory = new Person("Mallory", function(name) {
  this.id = 0;
  return `o/ ${name}`;
});
mallory.greet(bob); // === 'o/ Bob'
mallory.equals(alice); // true. 错了！
```

### <a name="Symbols">你怎么使用 `Symbols` 提供隐藏但不封装的属性？</a>

```js
const Person = (function() {
  const _id = Symbol("id");
  let ids = 0;
  return class Person {
    constructor(name) {
      this.name = name;
      this[_id] = ids++;
    }
    equals(otherPerson) {
      return this[_id] === otherPerson[_id];
    }
  };
})();
let alice = new Person("Alice");
let bob = new Person("Bob");
alice.equals(bob); // false

alice[Object.getOwnPropertySymbols(alice)[0]]; // == 0，alice 的 id.
```

> 译者按：FAQ 到此结束，可能有的地方会比较晦涩，多看几遍写几个 demo 基本就懂了。我觉得技术存在 `看山是山 -> 看山不是山 -> 看山还是山` 这样一个渐进的过程，翻译这篇 FAQ 也并非为 `#` 辩护，只是现在很多质疑还停留在 `看山是山` 这样一个阶段。我希望这篇 FAQ 可以让你 `看山不是山`，最后达到 `看山还是山` 的境界：问题还是存在问题，不过是站在更全面和系统的角度去思考问题。
