const connectionPool = require('../config/database_config').connectionPool

exports.getClientes = () => {
  return connectionPool.query('select * from `clientes`')
}

exports.addCliente = (nombre, usuario, password) => {
  const statement = 'insert into `clientes` (nombre, usuario, password, activo) values (?,?,?,1)'

  return connectionPool.query(statement, [nombre, usuario, password])
}

exports.deleteCliente = (id) => {
  return connectionPool.query('delete from `clientes` where `id` = ?', [id])
}

exports.updateCliente = (id, nombre, usuario, password, activo) => {
  const statement = 'update `clientes` set `nombre` = ?, `usuario` = ?, `password` = ?, `activo` = ? where `id` = ?'

  return connectionPool.query(statement, [nombre, usuario, password, activo, id])
}

exports.getClientesById = (id) => {
  return connectionPool.query('select * from `clientes` where `id` = ?', [id])
}

exports.getClientesByUsername = (usuario) => {
  return connectionPool.query('select * from `clientes` where `usuario` = ?', [usuario])
}

exports.clientAuthentication = async (usuario, password) => {
  return connectionPool.query('select * from `clientes` where `usuario` = ? and `password` = ?', [usuario, password])
}

exports.assingMacAddress = async (macAddress, clientId) => {
  return connectionPool.query('UPDATE `clientes` SET `macaddress` = ? WHERE id = ?', [macAddress, clientId])
}

exports.updateDetalles = async (id, direccion, telefono, email, fechaLimite, notas) => {
  const statement = 'update `clientes` set `direccion` = ?, `telefono` = ?, `email` = ?, `fecha_limite` = ?, `notas` = ? where `id` = ?'

  return connectionPool.query(statement, [direccion, telefono, email, fechaLimite, notas, id])
}

exports.isClientStillAllowed = (usuario, fechaActual) => {
  const statement = 'select * from `clientes` where `usuario` = ? AND fecha_limite >= ?'
  return connectionPool.query(statement, [usuario, fechaActual])
}
