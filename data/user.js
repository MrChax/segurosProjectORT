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
    { expiresIn: "4h" }
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

  console.log("UpdateUser - Query:", query);
  console.log("UpdateUser - User object:", user);
  console.log("UpdateUser - ID:", id);
  console.log("UpdateUser - EMAIL:", user.email);
  console.log("UpdateUser - NAME:", user.name);
  console.log("UpdateUser - LASTNAME:", user.lastname);
  console.log("UpdateUser - DNI:", user.dni);
  console.log("UpdateUser - PHONE:", user.phone);
  console.log("UpdateUser - CUIT:", user.cuit);

  // Verifica la existencia de user.domicilio antes de acceder a sus propiedades
  if (user.domicile) {
    console.log("UpdateUser - DOMICILIO - ADDRESS:", user.domicile.address);
    console.log("UpdateUser - DOMICILIO - ZIP_CODE:", user.domicile.zip_code);
    console.log("UpdateUser - DOMICILIO - PROVINCE:", user.domicile.province);
    console.log("UpdateUser - DOMICILIO - COUNTRY:", user.domicile.country);
  } else {
    console.log(
      "UpdateUser - DOMICILIO: El campo `domicilio` no está definido."
    );
  }

  const newValues = {
    $set: {
      email: user.email,
      name: user.name,
      lastname: user.lastname,
      dni: user.dni,
      phone: user.phone,
      cuit: user.cuit,
      "domicile.address": user.domicile.address,
      "domicile.zip_code": user.domicile.zip_code,
      "domicile.province": user.domicile.province,
      "domicile.country": user.domicile.country,
    },
  };

  console.log("UpdateUser - New Values:", newValues);

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
