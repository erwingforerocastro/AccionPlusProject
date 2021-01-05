const fs = require("fs");
const stream = fs.createReadStream('inputfiles/Consolidado Plan de Trabajo Dic 1.1_Nestle Alimentos.xlsb', { encoding: 'utf-8'});

stream.on("data", function(data) {
    var chunk = data.toString();
    console.log(chunk);
});