/**
 * @param {String} text
 * @param {String} libraryName
 * @param {String} engineName
 */
function makeTtsRequest(text, libraryName, engineName, path="", aviutlConfig = {}) {
  return {
    LibraryName: libraryName,
    EngineName: engineName,
    Body: text,
    OutputPath: path,
    Config: aviutlConfig
  };
}

module.exports = {
  makeTtsRequest
}