// Ponto de entrada para a Vercel, que procura o app Express em index.js na raiz.
// No computador continue usando "npm start" (server/index.js).
require("express");
module.exports = require("./server/index.js");
