import getConnection from "./connection.js";
import bcryptjs from "bcryptjs";
import e from "express";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

const DATABASE = process.env.DATABASE;
const COLECCTION = process.env.USERS_COLECCTION;

export async function getUserById(id) {
  const client = await getConnection();
  const user = await client
    .db(DATABASE)
    .collection(COLECCTION)
    .findOne({ _id: new ObjectId(id) });
  return user;
}

export async function addUser(user) {
  const clientmongo = await getConnection();
  const dniExist = await clientmongo
    .db(DATABASE)
    .collection(COLECCTION)
    .findOne({ dni: user.dni });

  const emailExist = await clientmongo
    .db(DATABASE)
    .collection(COLECCTION)
    .findOne({ email: user.email });

  let result = null;
  if (!dniExist && !emailExist) {
    user.password = await bcryptjs.hash(user.password, 10);

    result = await clientmongo
      .db(DATABASE)
      .collection(COLECCTION)
      .insertOne(user);
  }
  return result;
}

export async function findByCredential(email, password) {
  const clientmongo = await getConnection();

  const user = await clientmongo
    .db(DATABASE)
    .collection(COLECCTION)
    .findOne({ email: email });

  if (!user) {
    throw new Error("Credenciales no validas");
  }

  const isMatch = await bcryptjs.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Credenciales no validas");
  }

  return user;
}

export async function generateAuthToken(user) {
  const token = await jwt.sign(
    { _id: user._id, email: user.email, role: user.role },
    process.env.CLAVE_SECRETA,
    { expiresIn: "1h" }
  );
  return token;
}

export async function getUser(id) {
  const clientmongo = await getConnection();

  const user = await clientmongo
    .db(DATABASE)
    .collection(COLECCTION)
    .findOne({ _id: new ObjectId(id) });

  return user;
}
export async function checkDuplicateEmailOrDni(userId, email, dni) {
  const clientmongo = await getConnection();
  const query = {
    $or: [{ email }, { dni }],
    _id: { $ne: new ObjectId(userId) }, // Excluir el usuario actual
  };

  const user = await clientmongo
    .db(DATABASE)
    .collection(COLECCTION)
    .findOne(query);
  return !!user;
}

export async function updateUser(id, user) {
  const clientmongo = await getConnection();
  const query = { _id: new ObjectId(id) };
  const newValues = {
    $set: {
      email: user.email,
      nombre: user.name,
      apellido: user.lastname,
      dni: user.dni,
      phone: user.phone,
      cuit: user.cuit,
      domicilio: {
        address: user.domicilio.address,
        zip_code: user.domicilio.zip_code,
        province: user.domicilio.province,
        country: user.domicilio.country,
      },
    },
  };

  const result = await clientmongo
    .db(DATABASE)
    .collection(COLECCTION)
    .updateOne(query, newValues);
  return result.modifiedCount > 0; // Verifica si se modificó algún documento
}
export async function addClient(data) {
  const clientmongo = await getConnection();
  const result = await clientmongo
    .db(DATABASE)
    .collection(COLECCTION)
    .updateOne(
      { _id: new ObjectId(data.clienteId) },
      { $set: { asegurador: new ObjectId(data.aseguradorId) } }
    );
  return result;
}

export async function getClientsByAsegurador(
  aseguradorId,
  { search, dni, email, phone, cuit }
) {
  const clientmongo = await getConnection();

  // Crear el filtro base por asegurador y rol "asegurado"
  let query = { asegurador: new ObjectId(aseguradorId), role: "asegurado" };

  // Aplicar filtros condicionalmente
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { lastname: { $regex: search, $options: "i" } },
    ];
  }

  if (dni) {
    query.dni = dni;
  }

  if (email) {
    query.email = email;
  }

  if (phone) {
    query.phone = phone;
  }

  if (cuit) {
    query.cuit = cuit;
  }
  // Buscar clientes relacionados con el asegurador y los filtros aplicados
  const clients = await clientmongo
    .db(DATABASE)
    .collection(COLECCTION)
    .find(query)
    .toArray();
  return clients;
}

export async function deleteUser(id) {
  const clientmongo = await getConnection();
  const result = await clientmongo
    .db(DATABASE)
    .collection(COLECCTION)
    .deleteOne({ _id: new ObjectId(id) });
  return result;
}
