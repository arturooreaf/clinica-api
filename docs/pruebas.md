# Pruebas manuales

Secuencia para verificar que la API funciona de extremo a extremo.
Los comandos son copiables tal cual, en orden.

---

## Preparación

```bash
docker compose up -d
```

```bash
docker ps
```

Debe aparecer `patients-careexpand-db` con estado `Up`.

En una terminal:

```bash
npm run dev
```

En otra, el resto de comandos.

---

## 1 · La API responde

```bash
curl http://localhost:3000/
```

`Bienvenido a Careexpand`

---

## 2 · Sin token, 401

```bash
curl -i http://localhost:3000/patients
```

`401 Unauthorized` · `{"error":"Token no proporcionado"}`

---

## 3 · Registro

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo2@careexpand.com","password":"Demo1234","name":"Demo Dos"}'
```

`201` con `id`, `email` y `name`. Sin `password_hash`.

Si el email ya existe: `409`.

---

## 4 · Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@careexpand.com","password":"Demo1234"}'
```

`200` con `token` y `user`.

En los logs, esta petición tarda ~90 ms frente a los 1-9 ms del resto.

---

## 5 · Guardar el token

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@careexpand.com","password":"Demo1234"}' \
  | sed 's/.*"token":"\([^"]*\)".*/\1/')
```

```bash
echo $TOKEN
```

Caduca a la hora.

---

## 6 · Con token, 200

```bash
curl http://localhost:3000/patients -H "Authorization: Bearer $TOKEN"
```

`200` con el array de pacientes.

---

## 7 · Crear un paciente

```bash
curl -X POST http://localhost:3000/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana Ruiz","age":34,"diagnosis":"Gripe"}'
```

`201` con el paciente y su `id`.

---

## 8 · La validación corta

```bash
curl -i -X POST http://localhost:3000/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana","age":"treinta y cuatro"}'
```

`400` · `{"error":"Datos inválidos"}`

---

## 9 · Actualización parcial

```bash
curl -X PATCH http://localhost:3000/patients/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"diagnosis":"Alta"}'
```

`200` con el paciente completo, solo el diagnóstico cambiado.

---

## 10 · Errores de identificador

```bash
curl -i http://localhost:3000/patients/99999 -H "Authorization: Bearer $TOKEN"
```

`404` · `{"error":"Paciente no encontrado"}`

```bash
curl -i http://localhost:3000/patients/abc -H "Authorization: Bearer $TOKEN"
```

`400` · `{"error":"El id debe ser un número"}`

---

## 11 · Token inválido

```bash
curl -i http://localhost:3000/patients -H "Authorization: Bearer basura"
```

`401` · `{"error":"Token invalido o expirado"}`

En los logs aparece como `WARN`, no como `ERROR`.

---

## 12 · Citas

```bash
curl http://localhost:3000/appointments -H "Authorization: Bearer $TOKEN"
```

```bash
curl -X POST http://localhost:3000/appointments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":1,"date":"2026-09-15T10:30:00Z","reason":"Revisión"}'
```

`201` con la cita creada.

---

## 13 · CORS

```bash
curl -i -H "Origin: http://localhost:5173" http://localhost:3000/
```

```bash
curl -i -H "Origin: http://otro-dominio.com" http://localhost:3000/
```

Los dos devuelven `200` con el cuerpo. Solo el primero incluye la cabecera
`Access-Control-Allow-Origin`.

---

## 14 · Rate limiter

> Ejecutar al final: bloquea el login durante 15 minutos.

```bash
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"demo@careexpand.com","password":"incorrecta"}'
done
```

Cinco `401` y un `429`.

Para desbloquear antes de tiempo: reiniciar el servidor. El contador está en
memoria.

---

## Si algo falla

| Síntoma | Causa | Solución |
| --- | --- | --- |
| 500 en todo lo que toca datos | El contenedor no está levantado | `docker compose up -d` |
| 401 de repente en todo | El token ha caducado | Repetir el paso 5 |
| 429 en el login | Límite de intentos alcanzado | Esperar 15 min o reiniciar |



logs TRACE ID 

Resend api Integrar creamos un ENDPOINT BODY correo y texto