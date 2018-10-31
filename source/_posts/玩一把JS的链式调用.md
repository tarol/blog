---
title: 玩一把JS的链式调用
date: 2016-03-30 16:00:31
tags:
  - 文章
  - JS
categories:
  - 技术
  - 前端
  - JS
---

链式调用我们平常用到很多，比如 jQuery 中的 `$(ele).show().find(child).hide()`，再比如 angularjs 中的 `$http.get(url).success(fn_s).error(fn_e)`。但这都是已经包装好的链式调用，我们只能体会链式调用带来的方便，却不知道形成这样一条函数链的原理是什么。

随着链式调用的普及，实现的方案也越来越多。最常见的，是 jQuery 直接返回 `this` 的方式，underscore 的可选式的方式，和 lodash 惰性求值的方式。我们分别来了解，并逐个完成它们的 demo。

**我们从最简单的开始**，直接返回 `this` 是最常见的方式，也是所有方式的基础。我们实现一个简单的链式运算类，首先它得有个字段保留结果。

```js
function A(num) {
  this.value = num || 0; //不做传参校验了
}
```

然后添加进行运算并返回 `this` 的方法。

```js
A.prototype.add = function(a) {
  this.value += a;
  return this;
};
A.prototype.reduce = function(a) {
  this.value -= a;
  return this;
};
```

最后为了显示正常修改两个继承的方法。

```js
A.prototype.valueOf = function() {
  return this.value;
};
A.prototype.toString = function() {
  return this.value + "";
};
```

进行验证。

```js
var a = new A(2);
alert(a.add(1).reduce(2));
```

这个 demo 应该简单到不用对任何代码进行说明，**我们快速来到第二个**，就是 underscore 中用到 chain。underscore 规定了两种调用方式，`_.forEach(arr, fn);_.map(arr, fn);` 和 `_.chain(arr).forEach(fn).map(fn)`。

我们先实现前面一种调用方式，因为这里不是讲解 underscore，所以我们只是简单实现 `forEach` 和 `map` 的功能，不对对象而仅对数组进行处理。

```js
var _ = {};
_.forEach = function(array, fn) {
  array.forEach(function(v, i, array) {
    fn.apply(v, [v, i, array]);
  });
};
_.map = function(array, fn) {
  return array.map(function(v, i, array) {
    return fn.apply(v, [v, i, array]);
  });
};
```

上面的代码很简单，直接调用 ES5 中数组原型的方法。接下来问题就来了，要实现链式调用，我们首先要做什么？我们看到第二种调用方式中，所有的操作无论是 forEach 还是 map 都是在 `_.chain(arr)` 上调用的，所以 `_.chain(arr)` 应该是返回了一个对象，这个对象上有和 `_` 上相同的方法，只是实现上传参由 2 个变成了 1 个，因为原来的第一个参数永远是 `_.chain` 中传入的参数的拷贝。

好了，确定 `_.chain(arr)` 要返回一个对象了，那这个对象的构造函数怎么写呢？我们借用一个现成的变量来保存这个构造函数，就是 `_`。函数也是对象，所以当 `_` 由对象变成函数，不会影响原来的逻辑，而这个函数要传入一个 array，并返回一个新的对象。所以上面的代码应该改成这样。

```js
var _ = function(array) {
  this._value = Array.prototype.slice.apply(array);
};
_.forEach = function(array, fn) {
  array.forEach(function(v, i, array) {
    fn.apply(v, [v, i, array]);
  });
};
_.map = function(array, fn) {
  return array.map(function(v, i, array) {
    return fn.apply(v, [v, i, array]);
  });
};
_.chain = function(array) {
  return new _(array);
};
```

新的构造函数有了，但它生成的对象除了 `_value` 就是一片空白，我们要怎么把原本 `_` 上的方法稍加修改的移植到 `_` 生成的对象上呢？代码如下：

```js
for (var i in _) {
  //首先我们要遍历_
  if (i !== "chain") {
    //然后要去除chain
    _.prototype[i] = (function(i) {
      //把其他的方法都经过处理赋给_.prototype
      return function() {
        //i是全局变量，我们要通过闭包转化为局部变量
        var args = Array.prototype.slice.apply(arguments); //取出新方法的参数，其实就fn一个
        args.unshift(this._value); //把_value放入参数数组的第一位
        if (i === "map") {
          //当方法是map的时候，需要修改_value的值
          this._value = _[i].apply(this, args);
        } else {
          //当方法是forEach的时候，不需要修改_value的值
          _[i].apply(this, args);
        }
        return this;
      };
    })(i);
  }
}
```

最后我们模仿 underscore 使用 `value` 返回当前的 `_value`。

```js
_.prototype.value = function() {
  return this._value;
};
```

进行验证。

```js
var a = [1, 2, 3];
_.forEach(a, function(v) {
  console.log(v);
});
alert(
  _.map(a, function(v) {
    return ++v;
  })
);
alert(
  _.chain(a)
    .map(function(v) {
      return ++v;
    })
    .forEach(function(v) {
      console.log(v);
    })
    .value()
);
```

以上是 underscore 中用到的链式调用的简化版，应该不难理解。那最复杂的来了，lodash 惰性调用又是怎样的呢？首先我来解释下什么是惰性调用，比如上面的 `_.chain(arr).forEach(fn).map(fn).value()`，当执行到 `chain(arr)` 的时候，返回了一个对象，执行到 `forEach` 的时候开始轮询，轮询完再返回这个对象，执行到 `map` 的时候再次开始轮询，轮询完又返回这个对象，最后执行到 `value`，返回对象中 `_value` 的值。其中每一步都是独立的，依次进行的。而惰性调用就是，执行到 `forEach` 的时候不执行轮询的操作，而是把这个操作塞进队列，执行到 `map` 的时候，再把 `map` 的操作塞进队列。那什么时候执行呢？当某个特定的操作塞进队列的时候开始执行之前队列中所有的操作，比如当 `value` 被调用时，开始执行 `forEach`、`map` 和 `value`。

惰性调用有什么好处呢，为什么把一堆操作塞在一起反倒是更优秀的方案的？我们看传统的链式操作都是这样的格式，`obj.job1().job2().job3()`，没错整个函数链都是 job 链，如果这时候有一个简单的需求，比如连续执行 100 遍 job1-3，那么我们就要写 100 遍，或者用 for 把整个链条断开 100 次。所以传统链式操作的缺点很明显，函数链中都是 job，不存在 controller。而一旦加上 controller，比如上面的需求我们用简单的惰性调用来实现，那就是 `obj.loop(100).job1().job2().job3().end().done()`。其中 loop 是声明开启 100 次循环，end 是结束当前这次循环，done 是开始执行任务的标志，代码多么简单！

现在我们实现一下惰性链式调用，由于 lodash 就是 underscore 的威力加强版，大体架构都差不多，而上面已经有 underscore 的基本链式实现，所以我们脱离 lodash 和 underscore 的其他代码，仅仅实现一个类似的惰性调用的 demo。

首先我们要有一个构造函数，生成可供链式调用的对象。之前提到的，任何 controller 或者 job 的调用都是把它塞入任务队列，那么这个构造函数自然要有一个队列属性。有了队列，肯定要有索引指明当前执行的任务，所以要有队列索引。那么这个构造函数暂时就这样了。

```js
function Task() {
  this.queen = [];
  this.queenIndex = 0;
}
```

如果我们要实现 loop，那么还要有个 loop 的总次数和当前 loop 的次数，而如果一次 loop 结束，我们要回到任务队列哪里呢？所以还要有个属性记录 loop 开始的地方。构造函数最终的形态如此：

```js
function Task() {
  this.queen = [];
  this.queenIndex = 0;
  this.loopCount = 0;
  this.loopIndex = 0;
  this.loopStart = 0;
}
```

现在我们开始实现 controller 和 job，比如上面这个例子中说到的：job()、loop()、end()、done()。它们应该都包含两种形态，一种是本来的业务逻辑，比如 job 的业务就是 do something，而 loop 的控制逻辑就是记录 loopCount 和 loopStart，end 的控制逻辑就是 loopIndex+1 和检查 loopIndex 看是否需要回到 loopStart 的位置再次遍历。而另一种形态是不管业务逻辑是什么，把业务逻辑对应的代码统一塞进任务队列，这种形态可以称之为第一种形态的包装器。

如果我们最终的调用格式是 `new Task().loop(100).job().end().done()`，那么方法链上的方法肯定是包装器，这些方法自然应该放在 Task.prototype 上，那第一种形态的方法何去何从呢？那就放在 `Task.prototype.__proto__` 上吧。我们这样写

```js
var _task_proto = {
  loop: function(num) {
    this.loopStart = this.queenIndex;
    this.loopCount = num;
  },
  job: function(str) {
    console.log(str);
  },
  end: function() {
    this.loopIndex++;
    if (this.loopIndex < this.loopCount) {
      this.queenIndex = this.loopStart;
    } else {
      this.loopIndex = 0;
    }
  },
  done: function() {
    console.log("done");
  }
};
Task.prototype.__proto__ = _task_proto;
```

然后在遍历 `_task_proto` 在 `Task.prototype` 上生成包装器，并让每个包装器返回 `this` 以供链式调用（看见没，其实每一种链式调用的方式都要这么做）

```js
for (var i in _task_proto) {
  (function(i) {
    var raw = Task.prototype[i];
    Task.prototype[i] = function() {
      this.queen.push({
        name: i,
        fn: raw,
        args: arguments
      }); //保存具体的实现方法、名字和参数到任务队列
      return this;
    };
  })(i);
}
```

现在问题来了，我们什么时候开始执行具体的任务，又怎样让任务有条不紊的执行和跳转呢？这时候我们要在 `Task.prototype` 上定义一个新的方法，这个方法专门用来控制任务的执行的，因为任务队列是依次执行并由索引定位的，跟迭代器有那么一点相像，我们定义这个新的方法叫 `next`

```js
Task.prototype.next = function() {
  var task = this.queen[this.queenIndex]; //取出新的任务
  task.fn.apply(this, task.args); //执行任务中指向的具体的实现方法，并传入之前保存的参数
  if (task.name !== "done") {
    this.queenIndex++;
    this.next(); //如果没执行完，任务索引+1并再次调用next
  } else {
    this.queen = [];
    this.queenIndex = 0; //如果执行完了，清空任务队列，重置任务索引
  }
};
```

添加了 `next`，我们需要在 `done` 的包装器上加点东西以便让任务队列开始执行，修改之前生成包装器的代码

```js
for (var i in _task_proto) {
  (function(i) {
    var raw = Task.prototype[i];
    Task.prototype[i] = function() {
      this.queen.push({
        name: i,
        fn: raw,
        args: arguments
      }); //保存具体的实现方法、名字和参数到任务队列
      if (i === "done") {
        this.next();
      }
      return this;
    };
  })(i);
}
```

最后我们进行验证。

```js
var t = new Task();
console.log("1");
t.job("fuck")
  .loop(3)
  .job("world")
  .end()
  .loop(3)
  .job("world")
  .end()
  .job("!")
  .done();
console.log("2");
t.job("fuck")
  .loop(3)
  .job("world")
  .job("!")
  .end()
  .done();
console.log("3");
t.job("fuck")
  .loop(3)
  .job("world")
  .job("!")
  .end()
  .job("!");
```

好了，链式调用玩到这里了。这几个 demo 尤其是惰性调用稍加改造后，功能可以大大加强，但是这里就不再讨论了。
