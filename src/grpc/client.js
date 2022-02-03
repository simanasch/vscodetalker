// grpcを利用し、各種ttsの操作をするバックエンド(c#)部分を呼ぶ処理類
const path = require('path');
const PROTO_PATH = path.join(__dirname,'../','proto','TTSController.proto');
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
const ttsService = makeTTSService("5001");

// 利用可能なライブラリ取得のgrpc service call
const getLibraryList = () => {
  return new Promise((resolve, reject) => {
    ttsService
    .getSpeechEngineDetail({
    }, (error, response) => {
      if(error) reject(error);
      resolve(response.detailItem);
    })
  })
}

// 音声再生のgrpc service call
const talk = (request) => {

  return new Promise((resolve, reject) => {
   ttsService.talk(
      request,
      (error) => {
        if(error) reject(error);
        resolve(request.Body);
      })
    }
  )
}

// 音声録音のgrpc service call
const record = (request) => {
  return new Promise((resolve, reject) => {
    ttsService.record(
      request,
      (error, response) => {
        if(error) reject(error);
        resolve(response);
      }
    )
  })
}

module.exports = {
  getLibraryList,
  talk,
  record
}