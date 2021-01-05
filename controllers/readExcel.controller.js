const xlsx = require("xlsx");
const { rangeElements, subSchemaOfDate } =  require('../config/readexcel.config.json');

// Constantes

const FILEPATH = 'inputfiles/Consolidado Plan de Trabajo Dic 1.1_Nestle Alimentos.xlsb';
const SHEET = 'Plan de trabajo - Diciembre';
const WORKBOOK = xlsx.readFile(FILEPATH);
const WORKSHEET = WORKBOOK.Sheets[SHEET];
const RANGE_TABLE = xlsx.utils.decode_range(WORKSHEET['!ref']);
const ROW_DIFF = [0,0];

//Funciones

/**
 * Funcion para obtener los datos de un rango de un worksheet
 * @param {object} dataTable Tabla de la cual se extraera el rango
 * @param {String} name nombre del rango
 * @param {object} range { s: {c: firstCol, r: firstRow}, e: {c: endCol, r: endRow} }
 * @returns {object} 
 */
const getRange = (dataTable, name, range) => {


    const result = {
        name:name,
        data:[]
    };

    for(let R = range.s.r; R <= range.e.r; ++R) {
        let row = []
        for(let C = range.s.c; C <= range.e.c; ++C) {

          let cell_address = {c:C, r:R};
          let cell_ref = xlsx.utils.encode_cell(cell_address);
          row.push(dataTable[cell_ref]);

        }
        (row.length > 1) ? result.data.push(row):result.data.push(...row);
    }

    return result
}

/**
 * Funcion para remplazar las fechas subyacentes
 * @param {Array[object]} data datos donde se encuentran los valores
 * @returns {Array} datos con las fechas ajustadas
 */
const replaceDate = (data) => {

    let actualValue = data[0].w || undefined;
    let result = [];

    for (let i = 0; i <= data.length; i++) {
        
        result.push(actualValue);

        if(data[i+1] != undefined){
            actualValue = data[i+1].w;
        }
    }

    return result
}

/**
 * Funcion para extraer la informacion de columnas especificas
 * @param {object} worksheet hoja de excel
 * @param {object} rangeTable informacion del tamaño total de la hoja
 * @param {object} rangeElements informacion de la informacion a extraer
 * @param {String} separator separador de la informacion de la columna
 */
const getData = (worksheet, rangeTable, rangeElements, separator) => {
    let result = [];

    for (const key in rangeElements) {
        if (Object.hasOwnProperty.call(rangeElements, key)) {

            let element = rangeElements[key];
            //extraer las columnas y filas de los elementos
            let cols = element.col.replace(/ /g, '').split(`${separator}`).map((i) => parseInt(i));
            let rows = element.row.replace(/ /g, '').split(`${separator}`).map((i) => parseInt(i));

            //extraer la maxima y la minima diferencia
            ROW_DIFF[0] = (ROW_DIFF[0] > rows[0]) ? rows[0] : ROW_DIFF[0];
            ROW_DIFF[1] = (ROW_DIFF[1] < rows[0]) ? rows[0] : ROW_DIFF[1];

            //seleccionar un rango de celdas en donde se encuentra la informacion
            let cellRange = (cols.length > 1) ? { 
                                                    s: { c: cols[0], r: rows[0] } , e:{ c: cols[1], r: (rows.length > 1) ? rows[1] : rangeTable.e.r} 
                                                } 
                                                : 
                                                { 
                                                    s: { c: cols[0], r: rows[0] }, e: (rows.length > 1) ? { c: rangeTable.e.c , r: rows[1] } : rangeTable.e 
                                                };

            let data = getRange(worksheet, key, cellRange);                                                                                             
            result.push(data);
        }
    }

    return result
}

/**
 * 
 * @param {Array} dataRange todos los elementos
 * @param {Array} headOfDates informacion de las fechas de encabezado
 * @param {Array} headOfValuesInDate informacion de los encabezados subyacentes de las fechas
 * @param {Number} rowDiff diferencia entre las filas de 
 * @param {Boolean} diff si existe diferencia de columnas entre la fecha y la informacion de los id's 
 * @return {Array[Object]} matriz de cada usuario con su información
 */
const getUsersData = ( dataRange, headOfDates, headOfValuesInDate, rowDiff, diff = false ) =>{

    let sizeColumn = dataRange[0].data.length; // tamaño de los elementos de la columna
    let response = [];
 
    for (let i = 0; i < sizeColumn; i++) {
  
        // iniciar la data con la informacion de ese cliente en esa fila 
        let data = {
            "ID_FUNCIO":(dataRange[0].data[i]) ? dataRange[0].data[i].w : dataRange[0].data[i],
            "ID":(dataRange[1].data[i]) ? dataRange[1].data[i].w : dataRange[1].data[i],
        }

        let actualDate = headOfDates[0];
        let counterOfHead = 0;
        //recorrer todos los horarios de los usuarios y añadir cada horario al response
        for (let j = 0; j < headOfDates.length; j++) {
            let value = '';

            // si las columnas de id y fecha tienen diferencia
            if(diff){
                value = (dataRange[2].data[i+rowDiff][j]) ? dataRange[2].data[i+rowDiff][j].w : dataRange[2].data[i+rowDiff][j];
            }else{
                value = (dataRange[2].data[i][j]) ? dataRange[2].data[i][j].w : dataRange[2].data[i][j];
            }
            
            //añadir la caractersitica de esa fecha
            let key = (subSchemaOfDate) ? subSchemaOfDate[counterOfHead] : `${headOfValuesInDate[j]}`; //si existe la configuracion de la cabecera de los valores de la fecha
            data["FECHA"] = actualDate;
            data[key] = value;
            counterOfHead++;

            // se reinician los valores para el siguiente dia del usuario
            if(headOfDates[j+1] != headOfDates[j]){

                counterOfHead = 0;
                response.push(data);

                data = {
                    "ID_FUNCIO":(dataRange[0].data[i]) ? dataRange[0].data[i].w : dataRange[0].data[i],
                    "ID":(dataRange[1].data[i]) ? dataRange[1].data[i].w : dataRange[1].data[i],
                }

                actualDate = headOfDates[j+1]
            }
        }
    }

    return response;
}


const dataRange = getData(WORKSHEET, RANGE_TABLE, rangeElements, ":");
const headOfDates = replaceDate(dataRange[2].data[0]).slice(0,155); //no tomar las ultimas 3 filas
const headOfValuesInDate = dataRange[2].data[3].slice(0,155);
let rowDiff = ROW_DIFF[1] - ROW_DIFF[0];

const response = getUsersData(dataRange, headOfDates, headOfValuesInDate, rowDiff, true);
console.log(response)



// var range = { s: { c: 0, r: 0 }, e: { c: 0, r: 4 } };//A1:A5
// var dataRange = [];
// /* Iterate through each element in the structure */
// for (var R = range.s.r; R <= range.e.r; ++R) {
//   for (var C = range.s.c; C <= range.e.c; ++C) {
    
//   }
// }

// const data = dataset.trim().split("\n");



// data[0] = data[0].replace(/(\,{1,2})/g," ").trim().split(" ");
// data[1] = data[1].replace(/(\,{1,2})/g," ").trim().split(" ");

// if(data[0].length < data[1].length){
//     for (let index = 0; index < 6; index++) {
//         if(index%2 == 1){
//             data[0].splice(index,0,data[0][index-1])
//         }
        
//     }
// }



