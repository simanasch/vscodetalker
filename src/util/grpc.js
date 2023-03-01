function makeTtsRequest(text, libraryName, engineName, path="", layer=0) {
  return {
    LibraryName: libraryName,
    EngineName: engineName,
    Body: text,
    OutputPath: path,
    AviutlLayer: layer
  };
}

module.exports = {
  makeTtsRequest
}