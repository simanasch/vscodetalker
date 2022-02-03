function makeTtsRequest(text, libraryName, engineName, path="") {
  return {
    LibraryName: libraryName,
    EngineName: engineName,
    Body: text,
    OutputPath: path
  };
}

module.exports = {
  makeTtsRequest
}