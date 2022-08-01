const tablesModel = require('../model/tables_model')
const clientsModel = require('../model/clients_model')
const dateHelpers = require('../helpers/date')

// Tablas omitidas por el usuario.
const omittedTables = ['clientes', 'sessions', 'usuarios']

exports.create = async (tableName, nombreColumnas) => {
  if (!tableName) {
    return { message: 'el nombre es invalido.' }
  } else if (nombreColumnas.length <= 0) {
    return { message: 'no se puede crear una tabla sin columnas.' }
  } else {
    await tablesModel.createControlTable(tableName) // Tabla de control para permitir y limitar el acceso.
    return await tablesModel.create(tableName, nombreColumnas)
  }
}

exports.delete = async (tableName, tableType) => {
  if (tableType === 'BASE TABLE') {
    const referenciaAVistas = await tablesModel.checkIfThableIsReferencedInAView(tableName)
    if (referenciaAVistas.length > 0) {
      const vistaDependiente = referenciaAVistas[0].view_name
      return { message: `No se puede eliminar, primero elimina "${vistaDependiente}"` }
    } else {
      await tablesModel.delete(tableName)
    }
  } else if (tableType === 'VIEW') {
    const delteTableResult = await tablesModel.deleteView(tableName)
    console.log('delete table result')
    console.log(delteTableResult)
  }

  await tablesModel.deleteControlTable(tableName) // Vistas y tablas tienen que tener una tabla de control para controlar los accesos

  return { message: 'Tabla borrada.' }
}

exports.truncate = async (tableName) => {
  return await tablesModel.truncate(tableName)
}

exports.getAll = async () => {
  const tables = await tablesModel.getAll()

  const tableNameAndType = []
  for (let i = 0; i < tables.length; i++) {
    const rows = tables[i]
    const tableName = rows[Object.keys(rows)[0]]
    const tableType = rows[Object.keys(rows)[1]]

    if (omittedTables.indexOf(tableName) === -1 && !tableName.endsWith('_control')) {
      tableNameAndType.push({
        tableName: tableName,
        tableType: tableType
      })
    }
  }

  if (!tableNameAndType.length <= 0) {
    return await tablesModel.getTablesDetail(tableNameAndType)
  } else {
    return 'No tables found.'
  }
}

exports.getOne = async (tableName) => {
  const returnData = {}
  returnData.rows = await tablesModel.getOne(tableName)
  returnData.titles = await tablesModel.getOneTitles(tableName)

  return returnData
}

exports.insert = async (tableName, row) => {
  return await tablesModel.insert(tableName, row)
}

exports.getPermisosByClientId = async (clientId) => {
  const returnData = {}
  const tables = await tablesModel.getAll()

  const tableNames = []
  for (let i = 0; i < tables.length; i++) {
    const rows = tables[i]
    const tableName = rows[Object.keys(rows)[0]]

    if (omittedTables.indexOf(tableName) === -1 && tableName.endsWith('_control')) { // Encuentra todas las tablas de control
      tableNames.push(tableName)
    }
  }

  returnData.tableNames = tableNames

  if (!tableNames.length <= 0) {
    returnData.tablesDetail = await tablesModel.getPermisosOnTableByClientId(tableNames, clientId)
    return returnData
  } else {
    return 'No tables found.'
  }
}

exports.grant = async (table, id) => {
  return await tablesModel.grant(table, id)
}

exports.revoke = async (table, id) => {
  return await tablesModel.revoke(table, id)
}

exports.limite = async (table, valor, id) => {
  return await tablesModel.limite(table, valor, id)
}

exports.accesos = async (table, valor, id) => {
  return await tablesModel.accesos(table, valor, id)
}

exports.serverSide = async (json) => {
  const returnData = {}
  // const conteo = await tablesModel.getTablesCount(json.table)
  const conteo = await tablesModel.getTablesCountWhereClause(json)

  const result = await tablesModel.serverSide(json)

  returnData.draw = parseInt(json.draw)
  returnData.recordsTotal = conteo[0].conteo
  returnData.recordsFiltered = conteo[0].conteo
  returnData.data = result

  return returnData
}

/*
* Remote client requests.
*/
exports.getUserAllowedTables = async (usuario) => {
  const client = await clientsModel.getClientesByUsername(usuario)

  if (client.length <= 0 || client[0].activo === 0) {
    return {
      message: 'Cliente no permitido.',
      rows: []
    }
  }

  const fechaActual = await dateHelpers.getFechaActual()
  const isClientStillAllowed = await clientsModel.isClientStillAllowed(usuario, fechaActual.format('YYYY-MM-DD'))

  if (isClientStillAllowed.length <= 0) {
    return {
      message: 'Fecha limite excedida.',
      rows: []
    }
  }

  const tables = await tablesModel.getAll()
  const tableNameAndType = []
  for (let i = 0; i < tables.length; i++) {
    const rows = tables[i]
    const tableName = rows[Object.keys(rows)[0]]
    const tableType = rows[Object.keys(rows)[1]]

    if (omittedTables.indexOf(tableName) === -1 && !tableName.endsWith('_control')) {
      const result = await tablesModel.isUserAllowedOnTable(tableName, client[0].id)

      if (!result.length <= 0 && result[0].allowed === 1) {
        tableNameAndType.push({
          tableName: tableName,
          tableType: tableType
        })
      }
    }
  }

  if (!tableNameAndType.length <= 0) {
    const rows = await tablesModel.getTablesDetail(tableNameAndType)
    return {
      message: 'Tables found.',
      rows: rows
    }
  } else {
    return {
      message: 'No se encontraron tablas permitidas para el usuario.',
      rows: []
    }
  }
}

exports.getOneFromRemote = async (tableName) => {
  const returnData = {}
  returnData.rows = []
  if (tableName === 'todasGeneral') {
    returnData.title = 'algunos'
  } else {
    returnData.titles = await tablesModel.getOneTitles(tableName)
  }
  return returnData
}

exports.getTableServerSideQuery = async (json) => {
  // Consultas simples, todas fuera de mercadotecnia deben de ser simples.
  const returnData = {}
  const conteo = await tablesModel.getTablesCountWhereClause(json)
  const result = await tablesModel.serverSide(json)

  returnData.previousJsonObject = json
  returnData.draw = parseInt(json.draw)
  returnData.recordsTotal = conteo[0].conteo
  returnData.recordsFiltered = conteo[0].conteo
  returnData.data = result

  return returnData
}

exports.getUserAllowedTableServerSideQuery = async (json) => {
  /*
  * Seguriadad: Macaddress y usuario registrado
  */
  const client = await clientsModel.getClientesByUsername(json.usuario)

  if (client.length <= 0 || client[0].activo === 0) {
    return { message: 'Cliente no permitido.' }
  }

  const fechaActual = await dateHelpers.getFechaActual()
  const isClientStillAllowed = await clientsModel.isClientStillAllowed(json.usuario, fechaActual.format('YYYY-MM-DD'))

  if (isClientStillAllowed.length <= 0) {
    return {
      message: 'Fecha limite excedida.',
      rows: []
    }
  }

  if (client[0].macaddress === null || client[0].macaddress === undefined || client[0].macaddress === '') {
    console.log('sin macaddress, se asigna una nueva mac para el usuario')
    await clientsModel.assingMacAddress(json.macAddress, client[0].id)
  } else {
    console.log('con macaddress')
    if (client[0].macaddress !== json.macAddress) {
      return { message: 'Error code: 1 - Cliente no permitido.' }
    }
  }

  /*
  * conteo e incremento de accesos
  */
  if (json.table !== 'Todas') {
    const accessCountLimit = await tablesModel.checkAccessCountForUser(json.table, client[0].id)

    if (accessCountLimit[0].access_count >= accessCountLimit[0].access_limit) {
      return { message: 'Se alcanzo el limite de consultas permitidas para el usuario.' }
    }

    await tablesModel.incrementTableAccessCountForUser(json.table, client[0].id)
  } else {
    console.log(json.tableList)
    for (let i = 0; i < json.tableList.length; i++) {
      const table = json.tableList[i]
      const accessCountLimit = await tablesModel.checkAccessCountForUser(table, client[0].id)

      if (accessCountLimit[0].access_count >= accessCountLimit[0].access_limit) {
        return { message: 'Se alcanzo el limite de consultas permitidas para el usuario en la tabla ' + table }
      }

      await tablesModel.incrementTableAccessCountForUser(table, client[0].id)
    }
  }

  /*
  * Armado de los datos a Mandar
  */
  if (json.table !== 'Todas') {
    // Consultas simples, todas fuera de mercadotecnia deben de ser simples.
    const returnData = {}
    const conteo = await tablesModel.getTablesCountWhereClause(json)
    const result = await tablesModel.serverSide(json)

    delete json.previousJsonObject // Limita el error "PayloadTooLargeError: request entity too large"

    returnData.previousJsonObject = json
    returnData.draw = parseInt(json.draw)
    returnData.recordsTotal = conteo[0].conteo
    returnData.recordsFiltered = conteo[0].conteo
    returnData.data = result

    return returnData
  }

  // Si es la primera corrida o si es una consulta simple (No de Mercadotecnia).
  if (json.subsecuentQuery === 'true') {
    const comparisonColumn = json.columnName

    const returnData = {}

    // Aqui estamos dejando que el servidor y MySql Haga toda la carga de trabajo.
    const previousQueryResult = await tablesModel.serverSide(json.previousJsonObject)
    const previousQueryColumnData = []
    for (let i = 0; i < previousQueryResult.length; i++) {
      const element = previousQueryResult[i]
      previousQueryColumnData.push(element[comparisonColumn])
    }

    const result = await tablesModel.serverSideMercadotecnia(json, comparisonColumn, previousQueryColumnData)
    const conteo = await tablesModel.getTablesCountWhereClauseMercadotecnia(json, comparisonColumn, previousQueryColumnData)

    // returnData.previousQuery = await tablesModel.serverSideMercadotecniaQuery(json, comparisonColumn, previousQueryColumnData)

    delete json.previousJsonObject // Limita el error "PayloadTooLargeError: request entity too large"

    returnData.previousJsonObject = json
    returnData.draw = parseInt(json.draw)
    returnData.recordsTotal = conteo[0].conteo
    returnData.recordsFiltered = conteo[0].conteo
    returnData.data = result

    return returnData
  } else {
    // Consultas simples, todas fuera de mercadotecnia deben de ser simples.
    const returnData = {}
    const conteo = await tablesModel.getTablesCountWhereClause(json)
    const result = await tablesModel.serverSide(json)

    delete json.previousJsonObject // Limita el error "PayloadTooLargeError: request entity too large"

    returnData.previousJsonObject = json
    returnData.draw = parseInt(json.draw)
    returnData.recordsTotal = conteo[0].conteo
    returnData.recordsFiltered = conteo[0].conteo
    returnData.data = result

    return returnData
  }
}

/* exports.getUserAllowedTableGeneralServerSideQuery = async (json) => {
  //
  // Seguriadad: Macaddress y usuario registrado
  //
  const client = await clientsModel.getClientesByUsername(json.usuario)

  if (client.length <= 0 || client[0].activo === 0) {
    return { message: 'Cliente no permitido.' }
  }

  const fechaActual = await dateHelpers.getFechaActual()
  const isClientStillAllowed = await clientsModel.isClientStillAllowed(json.usuario, fechaActual.format('YYYY-MM-DD'))

  if (isClientStillAllowed.length <= 0) {
    return {
      message: 'Fecha limite excedida.',
      rows: []
    }
  }

  if (client[0].macaddress === null || client[0].macaddress === undefined || client[0].macaddress === '') {
    console.log('sin macaddress, se asigna una nueva mac para el usuario')
    await clientsModel.assingMacAddress(json.macAddress, client[0].id)
  } else {
    console.log('con macaddress')
    if (client[0].macaddress !== json.macAddress) {
      return { message: 'Error code: 1 - Cliente no permitido.' }
    }
  }

  //
  // conteo e incremento de accesos
  //

  //
  // Armado de los datos a Mandar generales group_concat
  //
  const tables = await tablesModel.getAll()

  const tableNameAndType = []
  for (let i = 0; i < tables.length; i++) {
    const rows = tables[i]
    const tableName = rows[Object.keys(rows)[0]]
    const tableType = rows[Object.keys(rows)[1]]

    if (omittedTables.indexOf(tableName) === -1 && !tableName.endsWith('_control')) {
      tableNameAndType.push({
        tableName: tableName,
        tableType: tableType
      })
    }
  }

  const returnData = {}
  const conteo = await tablesModel.getTablesCountWhereClauseGeneral(json, tableNameAndType)
  const result = await tablesModel.serverSideGeneral(json, tableNameAndType)

  returnData.previousJsonObject = json
  returnData.draw = parseInt(json.draw)
  returnData.recordsTotal = conteo[0].conteo
  returnData.recordsFiltered = conteo[0].conteo
  returnData.data = result

  return returnData
} /*

/* exports.getCreateViewTablesColumns = async (tabla) => {
  const tableTitles = await tablesModel.getOneTitles(tabla)

  const returnData = {}
  returnData.columnasTabla = []

  for (let i = 0; i < tableTitles.length; i++) {
    const title = tableTitles[i].Field
    returnData.columnasTabla.push(title)
  }

  if (!returnData.columnasTabla <= 0) {
    return returnData
  } else {
    return 'No se encontraron columnas.'
  }
} */

/* exports.createView = async (nombreVista, tabla, columnsList, municipios, estados) => {
  if (columnsList == null) {
    columnsList = []
  }
  if (municipios == null) {
    municipios = []
  }
  if (estados == null) {
    estados = []
  }
  await tablesModel.createView(nombreVista, tabla, columnsList, municipios, estados)

  // Si fue posible crear la vista, se crea la tabla de control.
  return await tablesModel.createControlTable(nombreVista) // Crea una Tabla de control para la vista para permitir y limitar el acceso.
} */

exports.createTablaCombinada = async (nombre, tablas, columnas, municipios, estados, tipo) => {
  if (tablas == null) { tablas = [] }
  if (columnas == null) { columnas = [] }
  if (municipios == null) { municipios = [] }
  if (estados == null) { estados = [] }

  if (tipo === 'consulta') {
    const consultaResult = await tablesModel.createTablaCombinadaConsulta(nombre, tablas, columnas, municipios, estados)
    console.log('consulta resultado')
    console.log(consultaResult)
    if (consultaResult.affectedRows === 0) {
      return { message: 'Error. por favor verifica la informacion' }
    }
    // Si fue posible crear la tabla, se crea la tabla de control.
    return await tablesModel.createControlTable(nombre + '_CONSULTA')
  } else if (tipo === 'mercadotecnia') {
    const mercadotecniaResult = await tablesModel.createTablaCombinadaMercadotecnia(nombre, tablas, columnas, municipios, estados)
    console.log('mercadotecnia resultado')
    console.log(mercadotecniaResult)
    if (mercadotecniaResult.affectedRows === 0) {
      return { message: 'Error. por favor verifica la informacion' }
    }
    // Si fue posible crear la tabla, se crea la tabla de control.
    return await tablesModel.createControlTable(nombre + '_MERCADOTECNIA')
  } else {
    return { message: 'Error. El tipo tiene que ser consulta o mercadotecnia' }
  }
}

exports.UploadCsvDataToMySQL = async (filePath, databaseName) => {
  console.log(filePath, databaseName)
  const fs = require('fs')
  const csv = require('fast-csv')
  const stream = fs.createReadStream(filePath)
  let result
  const csvData = []
  const csvStream = csv.parse().on('data', function (data) {
    csvData.push(data)
  }).on('end', async function () {
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
      const finalIteration = csvData.length > 8192 ? 8192 : csvData.length
      let valuesRows = ''
      for (let count = 0; count < finalIteration; count++) {
        let valuesRow = '('
        const row = csvData[0]
        for (let i = 0; i < row.length; i++) {
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
      result = await tablesModel.UploadCsvDataToMySQL(query).catch((err) => { return err })
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
  return await tablesModel.getImprimir(table, id)
}

exports.guardarImprimir = async (id, tabla, columnas, noImpresiones, limiteImpresiones) => {
  return await tablesModel.guardarImprimir(id, tabla, columnas, noImpresiones, limiteImpresiones)
}

exports.persmisosDeImpresion = async (usuario, tabla) => {
  const client = await clientsModel.getClientesByUsername(usuario)

  if (client.length <= 0 || client[0].activo === 0) {
    return {
      message: 'Cliente no permitido.',
      rows: []
    }
  }

  await tablesModel.increasePrintingCounter(tabla, client[0].id)

  return await tablesModel.isUserAllowedOnTable(tabla, client[0].id)
}
