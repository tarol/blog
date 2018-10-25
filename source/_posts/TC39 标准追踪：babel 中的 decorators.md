---
title: TC39 标准追踪：babel 中的 decorators
date: 2018-10-25 20:10:42
tags:
  - 翻译
  - ES
categories:
  - 翻译
  - 前端
  - ES
---

&emsp;&emsp;Babel 7.1.0 终于支持了新的 decorators 提案：你可以通过使用[@babel/plugin-proposal-decorators](https://babeljs.io/docs/en/babel-plugin-proposal-decorators) 进行体验。

## 历史的进程

&emsp;&emsp;decorators 的[第一个方案](https://github.com/wycats/javascript-decorators)是由[Yehuda Katz](https://github.com/wycats)在三年前提出的。TypeScript 也在[1.5 版本（2015）](https://github.com/Microsoft/TypeScript/wiki/What%27s-new-in-TypeScript#typescript-15)与 ES6 特性一起发布了 decorators。一些主流的前端框架，比如 angular 和 MobX，也开始用 decorators 加强开发体验：这让 decorators 更加流行，却让社区误以为 decorators 是一个稳定的特性。

&emsp;&emsp;Babel 在[5.0 版本](https://github.com/babel/babel/blob/master/.github/CHANGELOG-v5.md#500)实现了 decorators。但是在 Babel 6 移除了它，因为它并不稳定。为此 [Logan Smyth](https://github.com/loganfsmyth) 创建了非官方插件 [babel-plugin-transform-decorators-legacy](https://github.com/loganfsmyth/babel-plugin-transform-decorators-legacy)，这个插件的实现和 Babel 5 保持一致。直到 [Babel 7 alpha](https://github.com/babel/babel/tree/v7.0.0-alpha.1/packages/babel-plugin-transform-decorators) 发布，这个插件才重新回到 Babel 的官方库中。该插件仍然使用旧提案的语义，因为新的语义还不够明确。

&emsp;&emsp;从那时候开始，[Daniel Ehrenberg](https://github.com/littledan) 和 [Brian Terlson](https://github.com/bterlson) 开始协助 [Yehuda Katz](https://github.com/wycats) 整理新的 decorators 提案，他们几乎重写了这份提案。但即便如此，仍然无法保证面面俱到，迄今为止的实现方式还是不够兼容。

&emsp;&emsp;Babel 7.0.0 为 `@babel/plugin-proposal-decorators` 引入了一个配置项：`legacy`，但是当时它只存在 `true` 这一个合法的值。这个突破性的变化用于日后新旧版本的平滑过渡。

&emsp;&emsp;Babel 7.1.0 提供了对新提案的支持，而且 `@babel/plugin-proposal-decorators` 默认启用新的实现。

&emsp;&emsp;新提案同时支持对私有成员和私有方法进行装饰，但这些特性在 Babel 中尚未实现，或许很快就会实现了。

## 新提案有哪些变化？

&emsp;&emsp;虽然新提案看上去和旧提案很像，但几个关键的差别导致了两者的不兼容。

### 语法

&emsp;&emsp;旧提案支持任意的左值表达式作为 decorators 的 body（即@后面的内容）。举个例子，这是合法的代码：

```javascript
class MyClass {
  @getDecorators().methods[name]
  foo() {}

  @decorator
  [bar]() {}
}
```

&emsp;&emsp;这个语法有个问题：[...] 符号同时作为 decorators body 中的属性访问符（即 `methods[name]` 中的 `[name]` ）和类方法的计算属性名（即 `[bar]() {}` 中的 `[bar]` ）。为了防止语义模糊，新提案中只允许 `.` 作为属性访问符。如果你想实现诸如`@getDecorators().methods[name]`的功能，需要借助圆括号：

```javascript
class MyClass {
  @(getDecorators().methods[name])
  foo() {}

  @decorator
  [bar]() {}
}
```

> 译者按：以上的例子我按个人的理解做了调整。而且据我测试，第一个例子中的第二个 decorator 的写法在旧提案中是错误的。因为 [bar] 会作为 decorators body 的 token 而非 class method 的 name。那么 class method 就不存在 name，会报 unexpected token 的语法错误。

### 对象 decorators

&emsp;&emsp;旧提案除了支持类 decorators、类成员 decorators，还支持对象 decorators：

```javascript
const myObj = {
  @dec1
  foo: 3,
  @dec2
  bar() {}
};
```

&emsp;&emsp;鉴于当前的对象 decorators 语义存在不兼容性，该特性从提案从被移除了。如果你在代码中使用了此特性，请保持关注，因为在后续的 [提案](https://github.com/tc39/proposal-decorators/issues/119) 中可能被再次引入。

### decorators 参数

&emsp;&emsp;第三个关键的改动是 decorators 的参数列表

&emsp;&emsp;在旧提案中，类成员 decorators 接收三个参数，target（类的原型）、key（成员名）、property descriptor（属性描述符）—— 类似于 `Object.defineProperty` 的参数列表。而类 decorators 仅接收 `constructor` 这一个参数。

&emsp;&emsp;新提案在这点上要强大的多：成员 decorators 接收一个对象，这个对象包含以下属性，你可以对其进行任意的修改：`descriptor`(原 descriptor)、`key`(成员名)、`placement`(属性的位置，`static`、`prototype`、`own`)、`kind`(属性的类型，`field`、`method`)。

&emsp;&emsp;类 decorators 同样接收一个对象，通过这个对象可以访问到所有的类成员 decorators 的入参，这个特性确保了在创建类之前还可以对类成员做进一步的修改。

> 译者按：这部分才是最重大的修改，也是不兼容的核心原因。如果要一一列出比较,应该独立成一篇 blog，所以此处不做赘述。

### 升级方式

&emsp;&emsp;由于不兼容，如果项目中采用了新提案，就不能使用旧的 decorators：因为现存的库（MobX， Angular 等）都没有引入新特性，这会导致迁移过程非常慢。鉴于这个问题，我们发布了一个工具包，你可以在你的代码中使用它包装原有的 decorators 作为变通的方案。先运行这个工具包，然后你就可以在 Babel 的 config 中配置新提案了。

&emsp;&emsp;你可以这样更新你的文件

```shell
npm install wrap-legacy-decorators -D
npx wrap-legacy-decorators src/file-with-decorators.js --decorators-before-export --write
```

&emsp;&emsp;如果你的代码运行在 node 环境，或者你使用 webpack 或者 rollup 打包你的代码，你可以引入外部依赖而不是在每个文件中都注入工具包提供的包装函数。

```shell
npm install decorators-compat
npx wrap-legacy-decorators src/file-with-decorators.js --decorators-before-export --external-helpers --write
```

&emsp;&emsp;更多的信息，你可以参考这个[文档](https://github.com/nicolo-ribaudo/legacy-decorators-migration-utility)。

## 已知问题

&emsp;&emsp;新提案并非是面面俱到的：decorators 是个非常大的特性，要完整的定义它非常的复杂。

### Exported Classes 的 decorators 应该放在哪里？

> [tc39/proposal-decorators#69](https://github.com/tc39/proposal-decorators/issues/69)

&emsp;&emsp;decorators 提案在这个问题上反复摇摆：decorators 应该放在关键字 `export` 的前面还是后面？

```javascript
export @decorator class MyClass {}

// or

@decorator
export class MyClass {}
```

&emsp;&emsp;这里潜在的一个问题是：`export` 关键字是类的一部分还是一个“包装器”。第一个例子中，因为 decorators 必须放在声明的开头，所以它应该放在 decorators 后面；第二个例子中，因为 decorators 是声明的一部分，所以它应该放在 decorators 前面。

### 对于私有成员，decorators 应该采用怎样的安全策略？

&emsp;&emsp;decorators 引发了一个重要的安全问题：如果私有成员可以被装饰，那么成员名会泄露。这里需要考虑不同的安全等级：

1. decorators 不能泄露私有成员名，不然恶意代码可以从 decorators 中窃取此信息
2. 私有成员的 decorators 是可信的，类 decorators 是不可信的？
3. [硬隐私](https://github.com/tc39/proposal-private-fields/issues/33) 意味着私有成员只能在类内部访问：那么 decorators 应该访问私有成员名吗？还是只能装饰公有成员？

&emsp;&emsp;这些问题在解决前需要进一步讨论，这也是 Babel 的意义所在。

## Babel 充当的角色

&emsp;&emsp;随着 Babel 7 的发布，我们开始利用我们在 JS 生态中的地位，通过让开发人员对于不同版本的提案进行体验和给予反馈以帮助提案作者进行决策。

&emsp;&emsp;出于这个原因，更新 `@babel/plugin-proposal-decorators` 之后，我们引入了新的选项：`decoratorsBeforeExport`。通过这个选项，你可以尝试切换 `export @decorator class C {}` 和 `@decorator export default class` 这两种不同的语法。

&emsp;&emsp;我们还将引入另一个选项来自定义隐私策略。这些选项是必填项，直到 TC39 做出最终的决定，而这个决定将成为默认项。

&emsp;&emsp;如果你是直接使用我们的解析器（`@babel/parser`，以前的 `babylon`），你也可以在版本 `7.0.0` 中使用 `decoratorsBeforeExport` 这个选项。

```javascript
const ast = babylon.parse(code, {
  plugins: [["decorators", { decoratorsBeforeExport: true }]]
});
```

### 使用方式

```shell
npm install @babel/plugin-proposal-decorators -D
```

```json
{
  "plugins": [
    "@babel/plugin-proposal-decorators",
    { "decoratorsBeforeExport": true }
  ]
}
```

&emsp;&emsp;查看 [@babel/plugin-proposal-decorators](https://babeljs.io/docs/en/babel-plugin-proposal-decorators) 了解更多的选项。

## 你的角色

&emsp;&emsp;作为一个 JS 开发人员，你可以和我们一起勾勒这个语言的未来。你可以尝试 decorators 提供的各种各样的语义，并给予提案作者一定的反馈。我们需要知道它用于真实项目的情况！你也可以通过阅读 [提案仓库](https://github.com/tc39/proposal-decorators) 中的讨论和会议纪要了解为何这样设计。

&emsp;&emsp;如果你现在就想体验 decorators，你可以在我们的 [线上解释器](https://babeljs.io/repl/build/master) 通过设置不同的 presets 选项体验它。

## 翻译自：
> [TC39 Standards Track Decorators in Babel](https://babeljs.io/blog/2018/09/17/decorators)