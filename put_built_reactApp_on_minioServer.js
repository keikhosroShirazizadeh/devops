var Minio = require("minio")
var Fs = require('fs')
var mimeType = require('mime-types')
var Minio = require('minio');
var path=require('path')


var minioClient = new Minio.Client({
    endPoint: 'server ip address',
    port: 5000,
    useSSL: false,
    accessKey: 'access_Token',
    secretKey: 'secret_key'
});
// directory path
const dir = 'build/';

//read directory files
const readAllFiles = (dir) => {
    let files = new Map()

    try {
        const currentFiles = Fs.readdirSync(dir)

        currentFiles.forEach(file => {
            let currentFilePath = dir + file
            // console.log("currentFilepath : ", currentFilePath)
            // console.log("current file : "+file)
            let fileStat = Fs.statSync(currentFilePath)
            if (fileStat.isDirectory()) {
                currentFilePath += "/"
                let res = readAllFiles(currentFilePath)
                // console.log(res)
                for ( const w of res) {
                    // console.log("key of the file ",w[0])
                    // console.log("value of the file ",w[1])
                    files.set(w[0],w[1])
                }
            } else {
                files.set(currentFilePath, file)

            }
        })

    } catch (err) {
        console.log(err);
    }
    return files
}
//read directory files
const filesMap = readAllFiles(dir)
// console.log(filesMap)
const fileMap2 = new Map()
const objlist=[]



// //update maps and delete update files from bucket
const getListOfObjects=async ()=>{
    let promise=new Promise((resolve,reject)=>{
        let objects=minioClient.listObjects("bucketName",(err,objectsInfo)=>{
            if(err){
                reject(err)
            }
            resolve(objectsInfo)
        })
    })
    return await promise
}

var stream = minioClient.listObjects('bucketName', '', true)
stream.on('data',function(obj){
    objlist.push(obj)
})

stream.on('end',function(){
    filesMap.forEach((value, key) => {
        let find=false;
        for(obj of objlist) {

            let baseName1 = obj.name.substr(0, obj.name.indexOf("."))
            let baseName2 = key.substr(6, key.indexOf(".")-6)
            console.log("baseName1: ",baseName1," : baseName2: ",baseName2)
            if (baseName2 == baseName1 && mimeType.lookup(value) == mimeType.lookup(obj.name)) {
                if (key.substr(6, key.length) != obj.name) {
                    minioClient.removeObject('digimellatfront', obj.name, (err) => {
                        if(err){
                            console.log(err);
                        }else {
                            console.log("this object deleted successfully", obj.name)
                        }
                    })

                }else{
                    find=true
                    break

                }
            }
        }
        if(find==false){
            // console.log(key.substr(6,key.length) , "value of current key", value)
            fileMap2.set(key.substr(6,key.length),value)
        }
    })
    console.log(fileMap2)

    //put new files
    try{
        for(file of fileMap2.keys()){
            console.log("current file :"+ file)
            // console.log(path.resolve())
            let fileStream = Fs.createReadStream("./build/"+file)
            console.log("path to create stream and read file stat: ","./build/"+file)
            let fileStat = Fs.statSync("./build/"+file)
            const ctype=mimeType.lookup(file)

            let metaData = {
                'Content-Type': ctype
            }
            console.log("file and path in bucket: ", file.substr(6,file.length))
            if(path.extname(file)!=".map"){
                minioClient.putObject('bucketName', file, fileStream, fileStat.size, metaData, function (err, etag) {
                    if (err == null) {
                        console.log(file + " put on bucket succesfully");
                    }
                    return console.log(err, etag) // err should be null

                })
            }


        }
    }catch(err){
        console.log("error on putting files on bucket ",err );

    }


})

