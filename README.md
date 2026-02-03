# JLCEDA SCH&PCB Comparer

## 项目介绍

本项目是国产编辑器嘉立创EDA Pro 3.0的第三方插件，由wuyuhanzijin开发，开发初衷是解决元件在原理图里和PCB里面不一致导致SMT下单时带来不必要的麻法的插件，使用本插件能一键排查出不一致的元件，用户可以随后自行修改，也可以导出csv。

![alt text](https://github.com/wuyuhanzijin/jlceda-sch-pcb-comparer/blob/branch/images/1.png?raw=true)

![alt text](https://github.com/wuyuhanzijin/jlceda-sch-pcb-comparer/blob/branch/images/2.png?raw=true)

## 注意事项

使用本插件打开窗口后需要在设计图打开状态下才能读取设计图的元件，切换到别的页面也就读取不到了，此外使用过程中不要关闭窗口，否则数据会丢失，建议提前打开设计图和PCB文件，然后点开对应的文件去读取

## 问题反馈

发现漏洞请及时向我汇报，请前往GitHub创建Issue，我看到之后会处理（不过可能需要一段时间，响应没那么即时，本人高中牲），如果有什么相关的New features也请在Issues里面反馈，反馈时请注意礼貌，谢谢

## 贡献

您可以随意修改本项目或者提交PR申请，只要不违反开源协议
（小声说：应该也没人给我写PR的吧 啊对）

构建本项目请使用`npm run build`，在此之前请下载依赖库