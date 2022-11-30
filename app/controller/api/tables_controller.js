const Router = require('express').Router
const tablesService = require('../../service/tables_service')
const multer = require('multer')
const path = require('path')

const ROUTER = Router()

ROUTER.get('/getAll/', (req, res) => {
  tablesService.getAll()
    .then((rows) => {
      if (rows === 'No tables found.') {
        res.status(200)
        res.contentType('application/json')
        res.send(JSON.stringify({ message: 'No tables found.' }))
      } else {
        res.status(200)
        res.contentType('application/json')
        res.send(JSON.stringify({ message: 'Tables found.', payload: rows }))
      }
    })
    .catch((err) => {
      console.error('[tables_controller.js][/all]Error when pulling Table list: ', err)

      res.status(500)
      res.contentType('application/json')
      res.send(JSON.stringify({ message: err }))
    })
})

ROUTER.get('/getOne/:nombreTabla', (req, res) => {
  const nombreTabla = req.params.nombreTabla
  tablesService.getOne(nombreTabla)
    .then((rows) => {
      res.status(200)
      res.contentType('application/json')
      res.send(JSON.stringify({ message: 'Table found.', payload: rows }))
    })
    .catch((err) => {
      console.error('[tables_controller.js][/getOne/' + nombreTabla + ']Error when pulling Table list: ', err)

      res.status(500)
      res.contentType('application/json')
      res.send(JSON.stringify({ message: 'Unable to lookup tables. Try again later, please.' }))
    })
})

ROUTER.post('/getTableServerSideQuery/', (req, res) => {
  const json = req.body
  tablesService.getTableServerSideQuery(json)
    .then((result) => {
      if (result.message) {
        console.error('[remote_controller.js][/getTableServerSideQuery/]Error when pulling server side query: ', result.message)
        res.status(401)
        res.contentType('application/json')
        res.send(JSON.stringify({ message: result.message }))
      }
      res.status(200)
      res.contentType('application/json')
      res.send(JSON.stringify(result))
    })
    .catch((err) => {
      console.error('[remote_controller.js][/getTableServerSideQuery/]Error when pulling server side query: ', err)
      res.status(500)
      res.contentType('application/json')
      res.send(JSON.stringify({ message: 'Unable to lookup tables. Try again later, please.' }))
    })
})

ROUTER.post('/create/', (req, res) => {
  tablesService.create(req.body.nombreTabla, req.body.nombreColumnas)
    .then((result) => {
      if (result.message !== '') {
        res.status(400)
        res.contentType('application/json')
        res.send(JSON.stringify({ message: result.message }))
      } else {
        res.status(201)
        res.contentType('application/json')
        res.send(JSON.stringify({ message: 'table created.' }))
      }
    }).catch((err) => {
      console.error('[tables_controller.js][/create]Error when creating table: ', err)
      res.status(400)
      res.contentType('application/json')
      res.send(JSON.stringify({ message: 'No se pudo crear la tabla, verifica el nombre de las columnas.' }))
    })
})

/* ROUTER.post('/createView/', (req, res) => {
  tablesService.createView(req.body.nombreVista,
    req.body.tabla,
    req.body.columnsList,
    req.body.municipios,
    req.body.estados)
    .then((result) => {
      console.log(result)
      if (result.message !== '') {
        res.status(400)
        res.contentType('application/json')
        res.send(JSON.stringify({ message: result.message }))
      } else {
        res.status(201)
        res.contentType('application/json')
        res.send(JSON.stringify({ message: 'Vista Creada.' }))
      }
    }).catch((err) => {
      console.error('[tables_controller.js][/createView]Error when creating view: ', err)
      res.status(400)
      res.contentType('application/json')
      res.send(JSON.stringify({ message: 'No se pudo crear la vista, verifica la información.' }))
    })
}) */

ROUTER.post('/crearTablaCombinada/', (req, res) => {
  tablesService.createTablaCombinada(req.body.nombre,
    req.body.tablas,
    req.body.columnas,
    req.body.municipios,
    req.body.estados,
    req.body.tipo)
    .then((result) => {
      console.log(result)
      if (result.message !== '') {
        res.status(400)
        res.contentType('application/json')
        res.send(JSON.stringify({ message: result.message }))
      } else {
        res.status(201)
        res.contentType('application/json')
        res.send(JSON.stringify({ message: 'Base de datos combinada creada.' }))
      }
    }).catch((err) => {
      console.error('[tables_controller.js][/crearTablaCombinada]Error when creating view: ', err)
      res.status(400)
      res.contentType('application/json')
      res.send(JSON.stringify({ message: 'No se pudo crear la tabla, verifica la información.' }))
    })
})

ROUTER.delete('/delete/:tableName/:tableType', (req, res) => {
  const tableName = req.params.tableName
  const tableType = req.params.tableType
  tablesService.delete(tableName, tableType)
    .then((result) => {
      if (result.message !== 'Tabla borrada.') {
        res.status(400)
        res.contentType('application/json')
        res.send(JSON.stringify({ message: result.message }))
      } else {
        res.status(200)
        res.contentType('application/json')
        res.send(JSON.stringify({ message: 'Base de datos borrada.' }))
      }
    })
    .catch((err) => {
      console.error('[tables_controller.js][/' + tableName + '] Error when deleting Table: ', err)

      res.status(500)
      res.contentType('application/json')
      res.send(JSON.stringify({ message: err }))
    })
})

ROUTER.delete('/truncate/:tableName', (req, res) => {
  const tableName = req.params.tableName
  tablesService.truncate(tableName)
    .then(() => {
      res.status(200)
      res.contentType('application/json')
      res.send(JSON.stringify({ message: 'Base de datos truncada.' }))
    })
    .catch((err) => {
      console.error('[tables_controller.js][/' + tableName + '] Error when truncate Table: ', err)

      res.status(500)
      res.contentType('application/json')
      res.send(JSON.stringify({ message: err }))
    })
})

ROUTER.put('/insert/', (req, res) => {
  tablesService.insert(req.body.tableName, req.body.row)
    .then((result) => {
      if (result.insertId > 0) {
        res.status(201)
        res.contentType('application/json')
        res.send(JSON.stringify({
          message: 'Registro insertado',
          row: req.body.row
        }))
      } else {
        res.status(201)
        res.contentType('application/json')
        res.send(JSON.stringify({
          message: 'Registro procesado',
          row: req.body.row
        }))
      }
    }).catch((err) => {
      res.status(400)
      console.error('[tables_controller.js][/insert/]Error al insertar el registro: ', err)
      res.contentType('application/json')
      res.send(JSON.stringify({
        message: 'No se pudo insertar el registro.',
        err: err,
        row: req.body.row
      }))
    })
})

ROUTER.get('/getPermisosByClientId/:idCliente', (req, res) => {
  tablesService
    .getPermisosByClientId(req.params.idCliente)
    .then((result) => {
      if (result === 'No tables found.') {
        res.status(200)
        res.contentType('application/json')
        res.send(JSON.stringify({ message: 'No tables found' }))
      } else {
        res.status(200)
        res.contentType('application/json')
        res.send(JSON.stringify({ message: 'Tables found', payload: result }))
      }
    })
    .catch(function (err) {
      console.log('[Api/clientes_controller][/getPermisosByClientId] Error: ', err)
      res.status(400)
      res.contentType('application/json')
      res.send(JSON.stringify({ message: err }))
    })
})

ROUTER.put('/grant/', (req, res) => {
  tablesService.grant(req.body.table, req.body.id)
    .then((result) => {
      if (result.changedRows > 0) {
        res.status(201)
        res.contentType('application/json')
        res.send(JSON.stringify({
          message: 'Cambio guardado'
        }))
      } else {
        res.status(201)
        res.contentType('application/json')
        res.send(JSON.stringify({
          message: 'El usuario ya cuenta con el permiso.'
        }))
      }
    }).catch((err) => {
      res.status(400)
      console.error('[tables_controller.js][/grant/]Error al dar el permiso: ', err)
      res.contentType('application/json')
      res.send(JSON.stringify({
        message: 'No se pudo dar el permiso.',
        err: err
      }))
    })
})

ROUTER.put('/revoke/', (req, res) => {
  tablesService.revoke(req.body.table, req.body.id)
    .then((result) => {
      if (result.changedRows > 0) {
        res.status(201)
        res.contentType('application/json')
        res.send(JSON.stringify({
          message: 'Cambio guardado'
        }))
      } else {
        res.status(201)
        res.contentType('application/json')
        res.send(JSON.stringify({
          message: 'El usuario ya no tiene el permiso.'
        }))
      }
    }).catch((err) => {
      res.status(400)
      console.error('[tables_controller.js][/revoke/]Error al quitar el permiso: ', err)
      res.contentType('application/json')
      res.send(JSON.stringify({
        message: 'No se pudo quitar el permiso.',
        err: err
      }))
    })
})

ROUTER.put('/limite/', (req, res) => {
  tablesService.limite(req.body.table, req.body.valor, req.body.id)
    .then((result) => {
      if (result.changedRows > 0) {
        res.status(201)
        res.contentType('application/json')
        res.send(JSON.stringify({
          message: 'Cambio guardado'
        }))
      } else {
        res.status(201)
        res.contentType('application/json')
        res.send(JSON.stringify({
          message: 'Sin cambios en el valor.'
        }))
      }
    }).catch((err) => {
      res.status(400)
      console.error('[tables_controller.js][/limite/]Error al cambiar el limite: ', err)
      res.contentType('application/json')
      res.send(JSON.stringify({
        message: 'No se pudo guardar el limite.',
        err: err
      }))
    })
})

ROUTER.put('/accesos/', (req, res) => {
  tablesService.accesos(req.body.table, req.body.valor, req.body.id)
    .then((result) => {
      if (result.changedRows > 0) {
        res.status(201)
        res.contentType('application/json')
        res.send(JSON.stringify({
          message: 'Cambio guardado'
        }))
      } else {
        res.status(201)
        res.contentType('application/json')
        res.send(JSON.stringify({
          message: 'Sin cambios en el valor.'
        }))
      }
    }).catch((err) => {
      res.status(400)
      console.error('[tables_controller.js][/accesos/]Error al cambiar el numero de accesos: ', err)
      res.contentType('application/json')
      res.send(JSON.stringify({
        message: 'No se pudo guardar el numero de accesos.',
        err: err
      }))
    })
})

ROUTER.put('/rango/', (req, res) => {
  tablesService.rango(req.body.table, req.body.valor, req.body.id)
    .then((result) => {
      if (result.changedRows > 0) {
        res.status(201)
        res.contentType('application/json')
        res.send(JSON.stringify({
          message: 'Cambio guardado'
        }))
      } else {
        res.status(201)
        res.contentType('application/json')
        res.send(JSON.stringify({
          message: 'Sin cambios en el valor.'
        }))
      }
    }).catch((err) => {
      res.status(400)
      console.error('[tables_controller.js][/rango/]Error al cambiar el rango de filas a mostrar: ', err)
      res.contentType('application/json')
      res.send(JSON.stringify({
        message: 'No se pudo guardar el rango de filas a mostrar.',
        err: err
      }))
    })
})

ROUTER.post('/getTableData/', (req, res) => {
  const json = req.body
  tablesService.serverSide(json)
    .then((result) => {
      res.status(200)
      res.contentType('application/json')
      res.send(JSON.stringify(result))
    })
    .catch((err) => {
      console.error('[tables_controller.js][/getTableData/]Error when pulling server side query: ', err)
      res.status(500)
      res.contentType('application/json')
      res.send(JSON.stringify({ message: 'Unable to lookup tables. Try again later, please.' }))
    })
})

/* ROUTER.get('/getCreateViewTablesColumns/:tabla/', (req, res) => {
  tablesService.getCreateViewTablesColumns(req.params.tabla)
    .then((rows) => {
      if (rows === 'No se encontraron columnas.') {
        res.status(200)
        res.contentType('application/json')
        res.send(JSON.stringify({ message: 'No se encontraron columnas.' }))
      } else {
        res.status(200)
        res.contentType('application/json')
        res.send(JSON.stringify({ message: 'Columnas encontradas.', payload: rows }))
      }
    })
    .catch((err) => {
      console.error('[tables_controller.js][/getCreateViewTablesColumns] No se encontraron columnas: ', err)

      res.status(500)
      res.contentType('application/json')
      res.send(JSON.stringify({ message: err }))
    })
}) */

//! Use of Multer
const storage = multer.diskStorage({
  destination: (req, file, callBack) => {
    // callBack(null, '/app/assets/csv/') app/assets/dist/img
    callBack(null, path.join(__dirname, '../../', 'assets/csv/'))
  },
  filename: (req, file, callBack) => {
    callBack(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
})

const upload = multer({
  storage: storage
})

ROUTER.post('/uploadfile', upload.single('uploadfile'), (req, res) => {
  console.log('Se esta queriendo subir un archivo, a la URL, checate')
  console.log('**********')
  console.log(req.file.filename)
  console.log(req.body.databaseName)
  console.log('**********')
  const filePath = path.join(__dirname, '../../', 'assets/csv/', req.file.filename)
  const databaseName = req.body.databaseName
  tablesService.UploadCsvDataToMySQL(filePath, databaseName)
    .then((result) => {
      console.log(result)
      if (typeof result.sqlMessage !== 'undefined' && result.sqlMessage.length > 0) {
        res.status(500)
        res.contentType('application/json')
        res.send(JSON.stringify({ message: result.sqlMessage }))
      } else {
        res.status(200)
        res.contentType('application/json')
        console.log('CSV file data has been uploaded in mysql database ')
        res.send(JSON.stringify({ message: 'Archivo guardado.', payload: result.sqlMessage }))
      }
    })
    .catch((err) => {
      console.error('[tables_controller.js][/UploadCsvDataToMySQL/]Error when pulling server side query: ', err)
      res.status(500)
      res.contentType('application/json')
      res.send(JSON.stringify({ message: err }))
    })
})

ROUTER.post('/getImprimir/', (req, res) => {
  const { table, id } = req.body
  tablesService.getImprimir(table, id)
    .then((result) => {
      res.status(200)
      res.contentType('application/json')
      res.send(JSON.stringify(result))
    })
    .catch((err) => {
      console.error('[tables_controller.js][/getImprimir/]Error when pulling server side query: ', err)
      res.status(500)
      res.contentType('application/json')
      res.send(JSON.stringify({ message: 'Unable to lookup tables. Try again later, please.' }))
    })
})

ROUTER.put('/guardarImprimir/', (req, res) => {
  const { id, tabla, columnas, noImpresiones, limiteImpresiones } = req.body
  tablesService.guardarImprimir(id, tabla, columnas, noImpresiones, limiteImpresiones)
    .then((result) => {
      res.status(200)
      res.contentType('application/json')
      res.send(JSON.stringify(result))
    })
    .catch((err) => {
      console.error('[tables_controller.js][/guardarImprimir/]Error when pulling server side query: ', err)
      res.status(500)
      res.contentType('application/json')
      res.send(JSON.stringify({ message: 'Unable to lookup tables. Try again later, please.' }))
    })
})

ROUTER.get('/getUserRangeParams/:table/:usuario', (req, res) => {
  const table = req.params.table
  const usuario = req.params.usuario
  tablesService.getUserRange(table, usuario)
    .then((result) => {
      res.status(200)
      res.contentType('application/json')
      res.send(JSON.stringify(result))
    })
    .catch((err) => {
      console.error('[tables_controller.js][/getUserRange/]Error when pulling server side query: ', err)
      res.status(500)
      res.contentType('application/json')
      res.send(JSON.stringify({ message: 'Unable to lookup tables. Try again later, please.' }))
    })
})
exports.router = ROUTER
