# CUFIRE Arena Backend

Backend completo para la plataforma de torneos CUFIRE Arena con Node.js, Express y PostgreSQL.

## 🚀 Configuración Rápida

### 1. Instalar dependencias
```bash
cd server
npm install
```

### 2. Configurar base de datos
Crea un archivo `.env` basado en `.env.example`:
```bash
cp .env.example .env
```

Edita `.env` con tu configuración de PostgreSQL:
```
DATABASE_URL="postgresql://username:password@localhost:5432/cufire_arena"
JWT_SECRET="tu-clave-secreta-super-segura"
PORT=4000
NODE_ENV=development
```

### 3. Configurar base de datos
```bash
# Generar cliente Prisma
npm run db:generate

# Crear/actualizar tablas
npm run db:push

# Poblar con datos de ejemplo
npm run db:seed
```

### 4. Iniciar servidor
```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

## 📋 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual

### Torneos
- `GET /api/tournaments` - Listar torneos
- `GET /api/tournaments/:id` - Obtener torneo específico
- `POST /api/tournaments/:id/join` - Unirse a torneo
- `POST /api/tournaments/:id/score` - Actualizar puntuación

### Leaderboard
- `GET /api/leaderboard` - Leaderboard global
- `GET /api/leaderboard/tournament/:id` - Leaderboard de torneo

### Usuarios
- `GET /api/users/:username` - Perfil de usuario
- `PUT /api/users/profile` - Actualizar perfil

## 🔧 Tecnologías

- **Node.js** + **Express** - Servidor y API
- **Prisma** - ORM para PostgreSQL
- **JWT** - Autenticación
- **bcryptjs** - Hashing de contraseñas
- **Helmet** + **CORS** - Seguridad

## 🎮 Estructura de la Base de Datos

- **users** - Usuarios con estadísticas de juego
- **tournaments** - Torneos con premios y configuración
- **tournament_participants** - Participaciones en torneos
- **leaderboard_entries** - Rankings globales

## ⚡ Uso con Frontend

El frontend en `http://localhost:8080` se conecta automáticamente a este backend en `http://localhost:4000`.