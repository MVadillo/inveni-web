/* eslint-disable camelcase */
const connectionPool = require('../config/database_config').connectionPool

exports.getAll = (userId) => {
  const statement = 'show full tables'

  return connectionPool.query(statement, [userId])
}

exports.getTablesDetail = async (tableNameAndType) => {
  const result = []
  for (let i = 0; i < tableNameAndType.length; i++) {
    const table = tableNameAndType[i].tableName
    const type = tableNameAndType[i].tableType
    const conteo = await connectionPool.query('select count(*) conteo from `' + table + '`')

    result.push({
      name: table,
      conteo: conteo[0].conteo,
      type: type
    })
  }

  return result
}

exports.getTablesCount = async (table) => {
  return await connectionPool.query('select count(*) conteo from `' + table + '`')
}

exports.getOne = async (tableName) => {
  return await connectionPool.query('select * from `' + tableName + '`')
}

exports.getOneTitles = async (tableName) => {
  return await connectionPool.query('describe `' + tableName + '`')
}

exports.create = (tableName, nombreColumnas) => {
  nombreColumnas = nombreColumnas.split(',')

  let statement = 'create table if not exists `' + tableName + '` ( '

  for (let i = 0; i < nombreColumnas.length; i++) {
    const columna = nombreColumnas[i]

    statement += ' `' + columna + '` VARCHAR(120)'
    if (i + 1 < nombreColumnas.length) {
      // Si no es la ultima columna se le agrega una coma.
      statement += ', '
    }
  }

  statement += ')  ENGINE=INNODB COLLATE=utf8_general_ci CHARSET=utf8'

  return connectionPool.query(statement)
}

exports.createControlTable = (tableName) => {
  let statement = 'create table if not exists `' + tableName + '_control` ( id INT AUTO_INCREMENT PRIMARY KEY, '
  statement += 'user_id int, allowed tinyint, access_limit int, access_count int, columnas varchar(200) DEFAULT "NOMBRE,DOMICILIO,COLONIA,CP,TELEFONO,COMPANIA,RFC,CURP,FECHA_NACIMIENTO,PLACA,NUM_SERIE,MODELO,MARCA,LINEA,SALARIO,EMPRESA,ANO,GIRO,NUM_PATRON,NUM_AFILIACION,CONYUGUE,ESTADO,MUNICIPIO", '
  statement += 'no_consultas int DEFAULT 0, limite_consultas int DEFAULT 20 )'
  statement += ' ENGINE=INNODB COLLATE=utf8_general_ci CHARSET=utf8'

  return connectionPool.query(statement)
}

exports.delete = (tableName) => {
  const statement = 'drop table `' + tableName + '`'

  return connectionPool.query(statement)
}

exports.deleteView = (tableName) => {
  const statement = 'drop view `' + tableName + '`'

  return connectionPool.query(statement)
}

exports.deleteControlTable = (tableName) => {
  const statement = 'drop table if exists `' + tableName + '_control`'

  return connectionPool.query(statement)
}

exports.truncate = (tableName) => {
  const statement = 'truncate table `' + tableName + '`'

  return connectionPool.query(statement)
}

exports.insert = async (tableName, row) => {
  // Los datos tienen que ser insertados en el mismo orden que tienen las columnas en la tabla.
  // Tiene que tener secuencia.
  if (row !== undefined) {
    let statement = 'Insert into `' + tableName + '` values (NULL' // Null en vez del id para que se autoincremente
    for (let i = 0; i < row.length; i++) {
      const element = row[i]
      statement += `, '${element}'`
    }
    statement += ')'

    return connectionPool.query(statement)
  } else {
    return 'Hubo un error con el registro, por favor intentelo de nuevo'
  }
}

exports.getPermisosOnTableByClientId = async (tableNames, client_id) => {
  const returnData = []
  for (let i = 0; i < tableNames.length; i++) {
    const table = tableNames[i]
    let result = await connectionPool.query('select * from `' + table + '` where user_id = ' + client_id)

    if (result.length === 0) {
      await connectionPool.query('Insert into `' + table + '` (id, user_id, allowed, access_limit, access_count) ' +
        'values (null, ' + client_id + ', 0, 0, 0) ')

      result = await connectionPool.query('select * from `' + table + '` where user_id = ' + client_id)
    }

    returnData.push({
      name: table,
      result: result[0]
    })
  }

  return returnData
}

exports.grant = (table, id) => {
  const statement = 'update `' + table + '_control` set allowed = 1 where id = ' + id

  return connectionPool.query(statement)
}

exports.revoke = (table, id) => {
  const statement = 'update `' + table + '_control` set allowed = 0 where id = ' + id

  return connectionPool.query(statement)
}

exports.limite = (table, valor, id) => {
  const statement = 'update `' + table + '_control` set access_limit = ' + valor + ' where id = ' + id

  return connectionPool.query(statement)
}

exports.accesos = (table, valor, id) => {
  const statement = 'update `' + table + '_control` set access_count = ' + valor + ' where id = ' + id

  return connectionPool.query(statement)
}

exports.isUserAllowedOnTable = async (tableName, clientId) => {
  return connectionPool.query('select * from `' + tableName + '_control` where user_id = ' + clientId + '')
}

exports.incrementTableAccessCountForUser = async (table, clientId) => {
  return connectionPool.query('UPDATE `' + table + '_control` SET `access_count` = `access_count` + 1 where user_id = ' + clientId + '')
}

exports.checkAccessCountForUser = async (table, clientId) => {
  return connectionPool.query('select * from `' + table + '_control` where user_id = ' + clientId + '')
}

exports.checkAccessCountAllTablesForUser = async (clientId) => {
  const allTables = await connectionPool.query('show tables')
  return allTables
}

/**
 *
 * @param {*} json
 * @returns query result
 * Construye y ejecuta un query simple.
 */
exports.serverSide = (json) => {
  let statement = 'SELECT '
  // concatena las columnas.

  // SELECT `nombre`, `telefono`...
  for (let i = 0; i < json.columns.length; i++) {
    const column = json.columns[i].data
    statement += '`' + column + '`'
    if (i + 1 < json.columns.length) {
      // Si no es la ultima columna se le agrega una coma.
      statement += ', '
    }
  }
  statement += ' FROM `' + json.table + '` '
  statement += ' WHERE '
  for (let i = 0; i < json.columns.length; i++) {
    const column = json.columns[i].data
    let searchCriteria = json.columns[i].search.value
    if (searchCriteria === '') {
      searchCriteria = '%'
    }
    statement += ' `' + column + '` LIKE "' + searchCriteria + '"'
    if (i + 1 < json.columns.length) {
      statement += ' AND '
    }
  }
  statement += ' ORDER BY `' + json.columns[json.order[0].column].data + '` ' + json.order[0].dir + ' '
  statement += ' LIMIT ' + json.length + ' OFFSET ' + json.start

  return connectionPool.query(statement)
}

/**
 *
 * @param {*} json
 * @returns conteo de registros.
 * Construye y ejecuta un conteo de los registros que regresaria el query simple.
 */
exports.getTablesCountWhereClause = async (json) => {
  let statement = 'SELECT count(*) conteo FROM `' + json.table + '` '
  statement += ' WHERE '
  for (let i = 0; i < json.columns.length; i++) {
    const column = json.columns[i].data
    let searchCriteria = json.columns[i].search.value
    if (searchCriteria === '') {
      searchCriteria = '%'
    }
    statement += ' `' + column + '` LIKE "' + searchCriteria + '"'
    if (i + 1 < json.columns.length) {
      statement += ' AND '
    }
  }

  return await connectionPool.query(statement)
}

exports.serverSideMercadotecnia = async (json, comparisonColumn, previousQueryColumnData) => {
  let statement = 'SELECT '
  for (let i = 0; i < json.columns.length; i++) {
    const column = json.columns[i].data
    statement += '`' + column + '`'
    if (i + 1 < json.columns.length) {
      statement += ', '
    }
  }
  statement += ' FROM `' + json.table + '` '
  statement += ' WHERE `' + comparisonColumn + '` in ("' + previousQueryColumnData.join('", "') + '") AND'
  for (let i = 0; i < json.columns.length; i++) {
    const column = json.columns[i].data
    let searchCriteria = json.columns[i].search.value
    if (searchCriteria === '') {
      searchCriteria = '%'
    }
    statement += ' `' + column + '` LIKE "' + searchCriteria + '"'
    if (i + 1 < json.columns.length) {
      statement += ' AND '
    }
  }

  statement += ' ORDER BY `' + json.columns[json.order[0].column].data + '` ' + json.order[0].dir + ' '
  statement += ' LIMIT ' + json.length + ' OFFSET ' + json.start

  return connectionPool.query(statement)
}

exports.getTablesCountWhereClauseMercadotecnia = async (json, comparisonColumn, previousQueryColumnData) => {
  let statement = 'SELECT count(*) conteo FROM `' + json.table + '` '
  statement += ' WHERE `' + comparisonColumn + '` in ("' + previousQueryColumnData.join('", "') + '") AND'
  for (let i = 0; i < json.columns.length; i++) {
    const column = json.columns[i].data
    let searchCriteria = json.columns[i].search.value
    if (searchCriteria === '') {
      searchCriteria = '%'
    }
    statement += ' `' + column + '` LIKE "' + searchCriteria + '"'
    if (i + 1 < json.columns.length) {
      statement += ' AND '
    }
  }

  return await connectionPool.query(statement)
}

exports.getTablesDetail = async (tableNameAndType) => {
  const result = []
  for (let i = 0; i < tableNameAndType.length; i++) {
    const table = tableNameAndType[i].tableName
    const type = tableNameAndType[i].tableType
    const conteo = await connectionPool.query('select count(*) conteo from `' + table + '`')

    result.push({
      name: table,
      conteo: conteo[0].conteo,
      type: type
    })
  }

  return result
}

/* exports.createView = async (nombreVista, tabla, columnsList, municipios, estados) => {
  let statement = 'CREATE VIEW `' + nombreVista + '`'

  if (columnsList.length > 0) {
    statement += ' AS SELECT `' + columnsList.join('`, `') + '`'
  } else {
    statement += ' AS SELECT * '
  }

  statement += ' FROM `' + tabla + '`'

  if (estados.length > 0 || municipios.length > 0) {
    statement += ' WHERE '
  }

  if (estados.length > 0) {
    statement += ' `estado` in ("' + estados.join('", "') + '")'

    if (municipios.length > 0) {
      statement += ' AND '
    }
  }

  if (municipios.length > 0) {
    statement += ' `municipio` in ("' + municipios.join('", "') + '")'
  }

  console.log(statement)
  return connectionPool.query(statement)
} */

exports.createTablaCombinadaConsulta = async (nombre, tablas, columnas, municipios, estados) => {
  let statement = 'CREATE TABLE `' + nombre + '_CONSULTA` AS '
  statement += ' SELECT * '
  statement += ' from ( '
  for (let i = 0; i < tablas.length; i++) {
    statement += 'select "' + tablas[i] + '" as `BASE DE DATOS`, '
    if (columnas.length > 0) {
      statement += ' `NOMBRE`, '
      statement += ' `' + columnas.join('`, `') + '`'
    } else {
      statement += '`' + tablas[i] + '`.* '
    }
    statement += ' from `' + tablas[i] + '`'
    if (estados.length > 0 || municipios.length > 0) { statement += ' WHERE ' }
    if (estados.length > 0) {
      statement += ' `estado` in ("' + estados.join('", "') + '")'
      if (municipios.length > 0) { statement += ' AND ' }
    }
    if (municipios.length > 0) { statement += ' `municipio` in ("' + municipios.join('", "') + '")' }
    if (i + 1 < tablas.length) { statement += ' UNION ' }
  }
  statement += ' ) alias '

  console.log(statement)
  return connectionPool.query(statement)
}

exports.createTablaCombinadaMercadotecnia = async (nombre, tablas, columnas, municipios, estados) => {
  let statement = 'CREATE TABLE `' + nombre + '_MERCADOTECNIA` AS select NOMBRE, '
  if (columnas.length === 0) {
    // eslint-disable-next-line no-multi-str
    statement += 'group_concat(DISTINCT `DOMICILIO` SEPARATOR ",") `DOMICILIO`, \
    group_concat(DISTINCT `COLONIA` SEPARATOR ",") `COLONIA`, \
    group_concat(DISTINCT `CP` SEPARATOR ",") `CP`, \
    group_concat(DISTINCT `TELEFONO` SEPARATOR ",") `TELEFONO`, \
    group_concat(DISTINCT `COMPANIA` SEPARATOR ",") `COMPANIA`, \
    group_concat(DISTINCT `RFC` SEPARATOR ",") `RFC`, \
    group_concat(DISTINCT `CURP` SEPARATOR ",") `CURP`, \
    group_concat(DISTINCT `FECHA_NACIMIENTO` SEPARATOR ",") `FECHA_NACIMIENTO`, \
    group_concat(DISTINCT `PLACA` SEPARATOR ",") `PLACA`, \
    group_concat(DISTINCT `NUM_SERIE` SEPARATOR ",") `NUM_SERIE`, \
    group_concat(DISTINCT `MODELO` SEPARATOR ",") `MODELO`, \
    group_concat(DISTINCT `MARCA` SEPARATOR ",") `MARCA`, \
    group_concat(DISTINCT `LINEA` SEPARATOR ",") `LINEA`, \
    group_concat(DISTINCT `SALARIO` SEPARATOR ",") `SALARIO`, \
    group_concat(DISTINCT `EMPRESA` SEPARATOR ",") `EMPRESA`, \
    group_concat(DISTINCT `ANO` SEPARATOR ",") `ANO`, \
    group_concat(DISTINCT `GIRO` SEPARATOR ",") `GIRO`, \
    group_concat(DISTINCT `NUM_PATRON` SEPARATOR ",") `NUM_PATRON`, \
    group_concat(DISTINCT `NUM_AFILIACION` SEPARATOR ",") `NUM_AFILIACION`, \
    group_concat(DISTINCT `CONYUGUE` SEPARATOR ",") `CONYUGUE`, \
    group_concat(DISTINCT `ESTADO` SEPARATOR ",") `ESTADO`,\
    group_concat(DISTINCT `MUNICIPIO` SEPARATOR ",") `MUNICIPIO` '
  }
  for (let i = 0; i < columnas.length; i++) {
    statement += ' group_concat(DISTINCT `' + columnas[i] + '` SEPARATOR ",") ` ' + columnas[i] + '`'
    if (i + 1 < columnas.length) { statement += ', ' }
  }
  statement += ' from ('
  for (let i = 0; i < tablas.length; i++) {
    if (columnas.length > 0) {
      statement += ' SELECT `NOMBRE`, `' + columnas.join('`, `') + '`'
    } else {
      statement += ' SELECT * '
    }
    statement += ' FROM `' + tablas[i] + '`'
    if (estados.length > 0 || municipios.length > 0) { statement += ' WHERE ' }
    if (estados.length > 0) {
      statement += ' `estado` in ("' + estados.join('", "') + '")'
      if (municipios.length > 0) { statement += ' AND ' }
    }
    if (municipios.length > 0) { statement += ' `municipio` in ("' + municipios.join('", "') + '")' }
    if (i + 1 < tablas.length) { statement += ' UNION ' }
  }
  statement += ' ) alias '
  statement += ' GROUP BY `NOMBRE` '

  console.log(statement)
  return connectionPool.query(statement)
}

exports.checkIfThableIsReferencedInAView = async (tableName) => {
  const statement = `select vtu.view_schema as database_name,
  vtu.view_name as view_name,
  vtu.table_schema as referenced_database_name,
  vtu.table_name as referenced_object_name,
  tab.table_type as object_type
from information_schema.view_table_usage vtu
join information_schema.tables tab on vtu.table_schema = tab.table_schema
                              and vtu.table_name = tab.table_name
where view_schema not in ('sys','information_schema',
                     'mysql', 'performance_schema')
and vtu.table_name = ?
order by vtu.view_schema,
    vtu.view_name`

  return connectionPool.query(statement, [tableName])
}

/*
exports.serverSideQuery = (json) => {
  let statement = 'SELECT '
  for (let i = 0; i < json.columns.length; i++) {
    const column = json.columns[i].data
    statement += '`' + column + '`'
    if (i + 1 < json.columns.length) {
      statement += ', '
    }
  }
  statement += ' FROM `' + json.table + '` '
  statement += ' WHERE '
  for (let i = 0; i < json.columns.length; i++) {
    const column = json.columns[i].data
    let searchCriteria = json.columns[i].search.value
    if (searchCriteria === '') {
      searchCriteria = '%'
    }
    statement += ' `' + column + '` LIKE "' + searchCriteria + '"'
    if (i + 1 < json.columns.length) {
      statement += ' AND '
    }
  }
  return statement
}
*/

/* exports.serverSideMercadotecniaQuery = async (json, comparisonColumn, previousQueryColumnData) => {
  let statement = 'SELECT '
  for (let i = 0; i < json.columns.length; i++) {
    const column = json.columns[i].data
    statement += '`' + column + '`'
    if (i + 1 < json.columns.length) {
      statement += ', '
    }
  }
  statement += ' FROM `' + json.table + '` '
  statement += ' WHERE `' + comparisonColumn + '` in ("' + previousQueryColumnData.join('", "') + '") AND'
  for (let i = 0; i < json.columns.length; i++) {
    const column = json.columns[i].data
    let searchCriteria = json.columns[i].search.value
    if (searchCriteria === '') {
      searchCriteria = '%'
    }
    statement += ' `' + column + '` LIKE "' + searchCriteria + '"'
    if (i + 1 < json.columns.length) {
      statement += ' AND '
    }
  }

  statement += ' ORDER BY `' + json.columns[json.order[0].column].data + '` ' + json.order[0].dir + ' '
  return statement
}
*/

/* exports.runQuery = (sql) => {
  return connectionPool.query(sql)
} */

exports.getTablesCountWhereClauseGeneral = async (json, tableNameAndType) => {
  let unionFlag = false
  let statement = `select SUM(conteo) conteo from (select NOMBRE, count(*) conteo
  from (`
  for (let i = 0; i < tableNameAndType.length; i++) {
    const tableOrView = tableNameAndType[i]
    if (tableOrView.tableType === 'BASE TABLE') {
      if (unionFlag) {
        statement += ' UNION '
      }
      statement += ' select * from `' + tableOrView.tableName + '`'
      unionFlag = true
    }
  }
  statement += ' ) alias '
  statement += ' WHERE '
  for (let i = 0; i < json.columns.length; i++) {
    const column = json.columns[i].data
    let searchCriteria = json.columns[i].search.value
    if (searchCriteria === '') {
      searchCriteria = '%'
    }
    statement += ' `' + column + '` LIKE "' + searchCriteria + '"'
    if (i + 1 < json.columns.length) {
      statement += ' AND '
    }
  }
  statement += ' GROUP BY `NOMBRE` '
  statement += ' ORDER BY `' + json.columns[json.order[0].column].data + '` ' + json.order[0].dir + ' ) alias2'

  return connectionPool.query(statement)
}

exports.serverSideGeneral = async (json, tableNameAndType) => {
  let unionFlag = false
  // eslint-disable-next-line no-multi-str
  let statement = 'select NOMBRE, \
  group_concat(DISTINCT `DOMICILIO` SEPARATOR ",") `DOMICILIO`, \
  group_concat(DISTINCT `COLONIA` SEPARATOR ",") `COLONIA`, \
  group_concat(DISTINCT `CP` SEPARATOR ",") `CP`, \
  group_concat(DISTINCT `TELEFONO` SEPARATOR ",") `TELEFONO`, \
  group_concat(DISTINCT `COMPANIA` SEPARATOR ",") `COMPANIA`, \
  group_concat(DISTINCT `RFC` SEPARATOR ",") `RFC`, \
  group_concat(DISTINCT `CURP` SEPARATOR ",") `CURP`, \
  group_concat(DISTINCT `FECHA_NACIMIENTO` SEPARATOR ",") `FECHA_NACIMIENTO`, \
  group_concat(DISTINCT `PLACA` SEPARATOR ",") `PLACA`, \
  group_concat(DISTINCT `NUM_SERIE` SEPARATOR ",") `NUM_SERIE`, \
  group_concat(DISTINCT `MODELO` SEPARATOR ",") `MODELO`, \
  group_concat(DISTINCT `MARCA` SEPARATOR ",") `MARCA`, \
  group_concat(DISTINCT `LINEA` SEPARATOR ",") `LINEA`, \
  group_concat(DISTINCT `SALARIO` SEPARATOR ",") `SALARIO`, \
  group_concat(DISTINCT `EMPRESA` SEPARATOR ",") `EMPRESA`, \
  group_concat(DISTINCT `ANO` SEPARATOR ",") `ANO`, \
  group_concat(DISTINCT `GIRO` SEPARATOR ",") `GIRO`, \
  group_concat(DISTINCT `NUM_PATRON` SEPARATOR ",") `NUM_PATRON`, \
  group_concat(DISTINCT `NUM_AFILIACION` SEPARATOR ",") `NUM_AFILIACION`, \
  group_concat(DISTINCT `CONYUGUE` SEPARATOR ",") `CONYUGUE`, \
  group_concat(DISTINCT `MUNICIPIO` SEPARATOR ",") `MUNICIPIO`, \
  group_concat(DISTINCT `ESTADO` SEPARATOR ",") `ESTADO` \
  from ('

  for (let i = 0; i < tableNameAndType.length; i++) {
    const tableOrView = tableNameAndType[i]
    if (tableOrView.tableType === 'BASE TABLE') {
      if (unionFlag) {
        statement += ' UNION '
      }
      statement += ' select * from `' + tableOrView.tableName + '`'
      unionFlag = true
    }
  }
  statement += ' ) alias '
  statement += ' WHERE '
  for (let i = 0; i < json.columns.length; i++) {
    const column = json.columns[i].data
    let searchCriteria = json.columns[i].search.value
    if (searchCriteria === '') {
      searchCriteria = '%'
    }
    statement += ' `' + column + '` LIKE "' + searchCriteria + '"'
    if (i + 1 < json.columns.length) {
      statement += ' AND '
    }
  }
  statement += ' GROUP BY `NOMBRE` '
  statement += ' ORDER BY `' + json.columns[json.order[0].column].data + '` ' + json.order[0].dir + ' '
  statement += ' LIMIT ' + json.length + ' OFFSET ' + json.start

  return connectionPool.query(statement)
}

exports.UploadCsvDataToMySQL2 = async (filePath, databaseName) => {
  // C:\Users\52614\Documents\GitHub\web-inveni\app\controller\api\app\assets\csv\uploadfile-1649988650945.csv
  const statement = `LOAD DATA LOCAL INFILE '${filePath.replace(/\\/g, '/')}' IGNORE INTO TABLE ${databaseName}
  FIELDS terminated by ','
  ENCLOSED BY '"'
  LINES TERMINATED by'\r\n'
  IGNORE 1 ROWS;`

  return connectionPool.query(statement)
}

exports.UploadCsvDataToMySQL = async (filePath, databaseName) => {
  const fs = require('fs')
  const csv = require('fast-csv')
  const stream = fs.createReadStream(filePath)
  let result
  const csvData = []
  const csvStream = csv.parse().on('data', function (data) {
    csvData.push(data)
  }).on('end', function () {
  // Remove Header ROW
    const headers = csvData[0]
    let rows = ''
    // eslint-disable-next-line no-unused-vars
    for (let count = 0; count < headers.length; count++) {
      rows = rows + headers[count] + ','
    }
    rows = rows.slice(0, -1)

    csvData.shift()

    for (let x = 0; x < csvData.length; x++) {
      const finalIteration = csvData.length > 2048 ? 2048 : csvData.length
      let valuesRows = ''
      for (let count = 0; count < finalIteration; count++) {
        let valuesRow = '('
        const row = csvData[0]
        for (let i = 0; i < row.length; count++) {
          valuesRow = valuesRow + '"' + row[i] + '"' + ','
        }
        valuesRow = valuesRow.slice(0, -1)
        valuesRow = valuesRow + '),'
        valuesRows = valuesRows + valuesRow
        csvData.shift()
      }
      valuesRows = valuesRows.slice(0, -1)
      valuesRows = valuesRows + ';'
      // Open the MySQL connection
      const query = `INSERT INTO ${databaseName} (${rows}) VALUES ${valuesRows}`
      result = connectionPool.query(query)
    }

    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(err)
      }
    })
  })
  stream.pipe(csvStream)
  return result
}

exports.getImprimir = async (table, id) => {
  const statement = 'select columnas, no_consultas, limite_consultas from `' + table + '_control` where id = ' + id

  return connectionPool.query(statement)
}

exports.guardarImprimir = (id, tabla, columnas, noImpresiones, limiteImpresiones) => {
  const statement = 'update `' + tabla + '_control` set columnas = ?, no_consultas = ?, limite_consultas = ? where id = ?'

  return connectionPool.query(statement, [columnas, noImpresiones, limiteImpresiones, id])
}

exports.increasePrintingCounter = (tabla, id) => {
  const statement = 'update `' + tabla + '_control` set no_consultas = no_consultas + 1 where user_id = ?'

  return connectionPool.query(statement, [id])
}
