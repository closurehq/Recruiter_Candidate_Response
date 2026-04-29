// Stub for pdf-parse used in test environments.
// pdf-parse v1 tries to read a test PDF at import time — this prevents that.
module.exports = async function pdfParse(_buffer) {
  return { text: '' }
}
