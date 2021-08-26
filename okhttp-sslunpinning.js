var classesNames = new Array()
var OkhttpClientClassName = ""
var CertificatePinnerClassName = ""
var prefix = ""

function initConsole(){
    var Color = {RESET: "\x1b[39;49;00m", Black: "0;01", Blue: "4;01", Cyan: "6;01", Gray: "7;11", "Green": "2;01", Purple: "5;01", Yellow: "3;01",  Red: "1;01"}
    var LightColor = {RESET: "\x1b[39;49;00m", Black: "0;11", Blue: "4;11", Cyan: "6;11", Gray: "7;01", "Green": "2;11", Purple: "5;11", Red: "1;11", Yellow: "3;11"}
    var colorPrefix = '\x1b[3'
    var colorSuffix = 'm'
    Object.keys(Color).forEach(function(c){
        if (c  == "RESET") 
            return
        console[c] = function(message){
            console.log(colorPrefix + Color[c] + colorSuffix + message + Color.RESET)
        }
        console["Light" + c] = function(message){
            console.log(colorPrefix + LightColor[c] + colorSuffix + message + Color.RESET)
        }
    })
}

function loadOkhttpClient(){
    Java.perform(function (){
        try{
            Java.use("okhttp3.OkHttpClient")
        }catch(e){
            //console.error(e)
        }
    })
    
}

function loadClasses(){
    Java.perform(function (){
        Java.enumerateLoadedClasses({
            onMatch: function(clsName, handle){
                classesNames.push(clsName)
            },
            onComplete: function(){
                console.Green("Search Class Completed!")
            }
        })
    })
}

function findOkhttpClass(){
    Java.perform(function (){
        var Modifier = Java.use("java.lang.reflect.Modifier")
        function isOkhttpClient(clsName){
            if(clsName.split('.').length != 2){
                return false;
            }
            
            try{
                var cls = Java.use(clsName)
                var interfaces = cls.class.getInterfaces()
                const count = interfaces.length
                if(count < 2){
                    return false
                }
                var flag = false
                for(var i = 0; i < count; i++){
                    var interface_ = interfaces[i]
                    var interface_name = interface_.getName()
                    
                    if(interface_name.indexOf("Cloneable") > 0){
                        flag = true
                    }else{
                        if(interface_name.indexOf("$") <= 0){
                            return false
                        }
                    }
                }
                if(!flag) return false;
                
                if(cls.class.getDeclaredClasses().length < 1){
                    return false
                }

                if(cls.class.getSuperclass().getName() != 'java.lang.Object'){
                    return false
                }
                
            }catch(e){
                return false
            }
            return true;
        }

        function isCertificatePinner(clsName,prefix){
            
            if(!clsName.startsWith(prefix)){
                return false
            }

            if(clsName.indexOf("$") > 0){
                return false
            }
            
            if(clsName.split('.').length != 2){
                return false;
            }

            var cls = Java.use(clsName)
            if(cls.class.isInterface()){
                return false
            }

            
            if(cls.class.getInterfaces().length > 0){
                return false
            }

         
            if(cls.class.getDeclaredClasses().length < 1){
                return false
            }
            
            if(cls.class.getSuperclass().getName() != "java.lang.Object"){
                return false
            }

            if(!Modifier.isFinal(cls.class.getModifiers())){
                return false
            }
            var flag = false
            var methods = cls.class.getDeclaredMethods()
            for(var i = 0; i < methods.length; i++){
                var method = methods[i]
                if(method.getParameterCount() < 1){
                    continue
                }
                if(method.getParameterTypes()[0].getName() == "java.security.cert.Certificate"){
                    flag = true
                    break
                }
            }
            if(!flag) return false

            flag = false
            var fields = cls.class.getDeclaredFields()
            for(var k = 0; k < fields.length; k++){
                var field = fields[k];
                if(field.getType().getName() == "java.util.Set"){
                    flag = true
                    break
                }
            }
            if(!flag) return false
            return true
        }
    
        for(var i = 0; i < classesNames.length; i++){
            if(isOkhttpClient(classesNames[i])){
                OkhttpClientClassName = classesNames[i]
                var prefix = classesNames[i].split('.')[0]+'.'
            }
        }
        
        for(var i = 0; i < classesNames.length; i++){
            if(isCertificatePinner(classesNames[i],prefix)){
                CertificatePinnerClassName = classesNames[i]
           }
        }

        var printOut
        if(OkhttpClientClassName == "" || CertificatePinnerClassName == "" || prefix == ""){
            printOut = console.Red
            printOut("Can't find the okhttp class")
        }else{
            printOut = console.Green
        }
        printOut("Found Class: "+classesNames.length)
        printOut("Okhttp's package prefix: "+prefix)
        printOut("Found the OkhttpClient: "+OkhttpClientClassName)
        printOut("Found the OkhttpCertificatePinner: "+CertificatePinnerClassName)
    })
}

function hook(){
    Java.perform(function (){
        var Modifier = Java.use("java.lang.reflect.Modifier")
        //TrustAllManager
        var TrustAllManagerClass = Java.registerClass({
            name: "TrustAllManager",
            implements:[Java.use("javax.net.ssl.X509TrustManager")],
            methods: {
                checkClientTrusted(chain, authType) {
                    console.Cyan("checkClientTrusted Called!!")
                },
                checkServerTrusted(chain, authType) {
                    console.Cyan("checkServerTrusted Called!!")
                },
                getAcceptedIssuers() {
                  return [];
                },
              }
        })
        var trustAllManagerHandle = TrustAllManagerClass.$new()

        var sslContext = Java.use("javax.net.ssl.SSLContext").getInstance("TLS")
        sslContext.init(null,Java.array("Ljavax.net.ssl.X509TrustManager;",[trustAllManagerHandle]),null)
        var sslSocketFactory = sslContext.getSocketFactory()

        //HostnameVerify
        var MyHostnameVerify = Java.registerClass({
            name: "MyHostnameVerify",
            implements:[Java.use("javax.net.ssl.HostnameVerifier")],
            methods: {
                verify(hostname, session){
                    console.log(hostname)
                    return true
                }
            }
        })
        var myHostnameVerifyHandle = MyHostnameVerify.$new()

        var internalOkhttpClientClasses = Java.use(OkhttpClientClassName).class.getDeclaredClasses()
        internalOkhttpClientClasses.forEach(function (internalClass) {
            var methods = internalClass.getDeclaredMethods()
            methods.forEach(function(method) {
                 if(method.getParameterCount() < 1){
                    return
                }
                var firstParameterTypeName = method.getParameterTypes()[0].getName()

                if(firstParameterTypeName == "javax.net.ssl.SSLSocketFactory"){
                    var Builder = Java.use(internalClass.getName())
                    var sslSocketFacotryMethodName  = method.getName()
                    Builder[sslSocketFacotryMethodName].overloads.forEach(function(overload){
                        overload.implementation = function(SSLSocketFactory){
                            arguments[0] = sslSocketFactory
                            return this[sslSocketFacotryMethodName].apply(this,arguments)
                        }
                        console.Blue(sslSocketFacotryMethodName+"  Hooked!")
                    });
                    
                }
                if(firstParameterTypeName == "javax.net.ssl.HostnameVerifier"){
                    var Builder = Java.use(internalClass.getName())
                    var hostnameVerifierMethodName = method.getName()
                    Builder[hostnameVerifierMethodName].overloads.forEach(function(overload){
                        overload.implementation = function(hostnameVerifier){
                            arguments[0] = myHostnameVerifyHandle
                            return this[hostnameVerifierMethodName].apply(this,arguments)
                        }
                        console.Yellow(hostnameVerifierMethodName+"  Hooked!")
                    });
                }

                if(firstParameterTypeName == CertificatePinnerClassName){
                    var Builder = Java.use(internalClass.getName())
                    var certificatePinnerMethodName = method.getName()

                    Builder[certificatePinnerMethodName].overloads.forEach(function(overload){
                        overload.implementation = function(certificatePinner){
                            return Java.retain(this)
                        }
                        console.Purple(certificatePinnerMethodName+"  Hooked!")
                    });
                   
                }
            })
        });
        
        var CertificatePinnerClass = Java.use(CertificatePinnerClassName)
        var methods = CertificatePinnerClass.class.getDeclaredMethods()
        methods.forEach(function (method){
            if(method.getReturnType().getName() == 'void'){
                var methodName = method.getName()
                console.Cyan(methodName+" Hooked!")
                CertificatePinnerClass[methodName].overloads.forEach(function (overload){
                    if(overload.returnType.name == 'V'){
                        overload.implementation = function(){
                            console.Cyan("certificatePinner check called!")
                        }   
                    }
                })
            }
        })
    })
}

function main(){
    initConsole()
    loadOkhttpClient()
    loadClasses()
    findOkhttpClass()
    hook()
}
setImmediate(main)