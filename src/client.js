const path = require('path');
const PROTO_PATH = path.join(__dirname,'proto','TTSController.proto');
console.info(PROTO_PATH);
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    }
)
const ttsProto = grpc.loadPackageDefinition(packageDefinition)

const makeTTSService = (port) => {
  // @ts-ignore
  return new ttsProto.ttscontroller.TTSService('localhost:'+port, grpc.credentials.createInsecure())
}

const talk = text => {
  return new Promise((resolve, reject) => {
    makeTTSService("5001")
    .talk({
      LibraryName: "ついな",
      EngineName: "VOICEROID64",
      Body: text,
      OutputPath: ""
    }, (error, response) => {
      if (!error && response.IsSuccess) {
        console.log(response.message) //こんにちわ ID:1太郎
        resolve(text);
      } else {
        console.error(error);
        reject(error);
      }
    })
  })
}

const getLibraryList = text => {
  return new Promise((resolve, reject) => {
    makeTTSService("5001")
    .getSpeechEngineDetail({
      EngineName: "ついな",
    }, (error, response) => {
      if (!error ) {
        // console.log(response.message) //こんにちわ ID:1太郎
        resolve(response.detailItem);
      } else {
        console.error(error);
        reject(error);
      }
    })
  })
}

module.exports = {
  getLibraryList,
  talk
}