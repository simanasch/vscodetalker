const path = require('path');
const PROTO_PATH = path.join(__dirname,'proto','TTSController.proto');
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

const talk = (text, libraryName, engineName) => {

  return new Promise((resolve, reject) => {
   ttsService.talk(
      {
        LibraryName: libraryName,
        EngineName: engineName,
        Body: text,
        OutputPath: ""
      },
      (error, response) => {
        if(error) reject(error);
        resolve(text);
      })
    }
  )
}

const getLibraryList = () => {
  return new Promise((resolve, reject) => {
    ttsService
    .getSpeechEngineDetail({
      EngineName: "ついな",
    }, (error, response) => {
      if(error) reject(error);
      resolve(response.detailItem);
    })
  })
}

const record = (text, LibraryName, EngineName, path) => {
  return new Promise((resolve, reject) => {
    ttsService
    .record({
      LibraryName: LibraryName,
      EngineName: EngineName,
      Body: text,
      OutputPath: path
    },
    (error, response) => {
      if(error) reject(error);
      resolve(response);
    })
  })
}

module.exports = {
  getLibraryList,
  talk,
  record
}