# okhttp-sslunpinning

一个简单的frida脚本来过okhttp-sslpinning，主要针对被混淆过的okhttp框架，由于样本过少，就只根据手上的样本框架特征进行识别，大家可以自行添加特征点来做更好的混淆识别

# 使用方法
- frida -U -f packagename -l okhttp-sslunpining.js --no-pause
- frida -UF packagename -l okhttp-sslunpining.js

# 注意

在使用spawn模式的时候，要注意OkhttpClient已加载到内存。如果没有加载，可以先用attach模式，识别到类名，然后使用Java.use("xxx")来主动加载

