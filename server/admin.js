const cors = require('cors');
const express = require('express');
const knex = require('knex');
const session = require('express-session');
const bodyParser = require('body-parser');

const adminApp = express();
adminApp.use(cors());
adminApp.set('view engine', 'ejs');
adminApp.use(bodyParser.urlencoded({ extended: true }));
adminApp.use(session({ secret: 'adminer-secret', resave: false, saveUninitialized: true }));

// Configuración de DBs soportadas
const dbConfigs = {
  postgresql: {
    client: 'pg',
    connection: process.env.DATABASE_URL
  },
  mysql: {
    client: 'mysql',
    connection: {
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'test'
    }
  },
  sqlite: {
    client: 'sqlite3',
    connection: {
      filename: './mydb.sqlite'
    }
  }
};

// Middleware de auth
adminApp.use((req, res, next) => {
  if (req.path === '/login' || req.session.loggedIn) {
    next();
  } else {
    res.redirect('/admin/login');
  }
});

// Página de login
adminApp.get('/login', (req, res) => {
  res.render('login');
});

adminApp.post('/login', (req, res) => {
  if (req.body.password === 'admincY9fa84IYkgRIXgbqgGWomwanbM8u4j6') {
    req.session.loggedIn = true;
    res.redirect('/admin');
  } else {
    res.send('Contraseña incorrecta');
  }
});

// Seleccionar DB
adminApp.get('/', (req, res) => {
  res.render('select-db', { dbConfigs });
});

adminApp.post('/connect', (req, res) => {
  const dbType = req.body.dbType;
  console.log('Connecting to:', dbType);
  req.session.dbType = dbType;
  console.log('Connected, redirecting to dashboard');
  res.redirect('/admin/dashboard');
});

// Dashboard
adminApp.get('/dashboard', async (req, res) => {
  if (!req.session.dbType) {
    return res.redirect('/admin');
  }
  const db = knex(dbConfigs[req.session.dbType]);
  try {
    const tables = await db.raw("SELECT tablename FROM pg_tables WHERE schemaname = 'public';"); // Ajusta para otros DBs
    res.render('dashboard', { tables: tables.rows });
  } catch (error) {
    res.send(`Error: ${error.message}`);
  } finally {
    db.destroy();
  }
});

// Ver tabla
adminApp.get('/table/:name', async (req, res) => {
  if (!req.session.dbType) {
    return res.redirect('/admin');
  }
  const db = knex(dbConfigs[req.session.dbType]);
  try {
    const rows = await db(req.params.name).select('*').limit(100);
    const columns = await db.raw(`SELECT column_name FROM information_schema.columns WHERE table_name = '${req.params.name}'`);
    res.render('table', { tableName: req.params.name, rows, columns: columns.rows });
  } catch (error) {
    res.send(`Error: ${error.message}`);
  } finally {
    db.destroy();
  }
});

// Editar fila
adminApp.get('/table/:name/edit/:id', async (req, res) => {
  if (!req.session.dbType) {
    return res.redirect('/admin');
  }
  const db = knex(dbConfigs[req.session.dbType]);
  try {
    const row = await db(req.params.name).where('id', req.params.id).first();
    res.render('edit-row', { tableName: req.params.name, row });
  } catch (error) {
    res.send(`Error: ${error.message}`);
  } finally {
    db.destroy();
  }
});

adminApp.post('/table/:name/edit/:id', async (req, res) => {
  if (!req.session.dbType) {
    return res.redirect('/admin');
  }
  const db = knex(dbConfigs[req.session.dbType]);
  try {
    const { createdAt, updatedAt, registeredAt, ...updateData } = req.body;
    const integerFields = ['id', 'userId', 'tournamentId', 'maxPlayers', 'maxAmount', 'currentAmount', 'registrationFee', 'prizePercentage', 'duration', 'value', 'gamesPlayed', 'gamesWon'];
    const booleanFields = ['isAdmin', 'isActive', 'hiddenFinalized'];
    const dateFields = ['startDate', 'endDate', 'date'];
    for (const k in updateData) {
      if (integerFields.includes(k)) {
        if (updateData[k] === '') {
          updateData[k] = null;
        } else {
          updateData[k] = parseInt(updateData[k], 10);
        }
      } else if (booleanFields.includes(k)) {
        updateData[k] = updateData[k] === 'true' || updateData[k] === '1' || updateData[k] === 'on';
      } else if (dateFields.includes(k)) {
        if (updateData[k] === '') {
          updateData[k] = null;
        } else {
          updateData[k] = new Date(updateData[k]).toISOString();
        }
      }
    }
    await db(req.params.name).where('id', req.params.id).update(updateData);
    res.redirect(`/admin/table/${req.params.name}`);
  } catch (error) {
    res.send(`Error: ${error.message}`);
  } finally {
    db.destroy();
  }
});

// Eliminar fila
adminApp.post('/table/:name/delete/:id', async (req, res) => {
  if (!req.session.dbType) {
    return res.redirect('/admin');
  }
  const db = knex(dbConfigs[req.session.dbType]);
  try {
    await db(req.params.name).where('id', req.params.id).del();
    res.redirect(`/admin/table/${req.params.name}`);
  } catch (error) {
    res.send(`Error: ${error.message}`);
  } finally {
    db.destroy();
  }
});

// Crear tabla
adminApp.get('/create-table', (req, res) => {
  if (!req.session.dbType) {
    return res.redirect('/admin');
  }
  res.render('create-table');
});

adminApp.post('/create-table', async (req, res) => {
  if (!req.session.dbType) {
    return res.redirect('/admin');
  }
  const db = knex(dbConfigs[req.session.dbType]);
  try {
    await db.schema.createTable(req.body.tableName, (table) => {
      table.increments('id');
      // Agrega más columnas según req.body
    });
    res.redirect('/admin/dashboard');
  } catch (error) {
    res.send(`Error: ${error.message}`);
  } finally {
    db.destroy();
  }
});

// Ejecutar query
adminApp.get('/query', (req, res) => {
  if (!req.session.dbType) {
    return res.redirect('/admin');
  }
  res.render('query');
});

adminApp.post('/query', async (req, res) => {
  if (!req.session.dbType) {
    return res.redirect('/admin');
  }
  const db = knex(dbConfigs[req.session.dbType]);
  try {
    const result = await db.raw(req.body.sql);
    res.render('query-result', { result: result.rows });
  } catch (error) {
    res.render('query-result', { error: error.message });
  } finally {
    db.destroy();
  }
});

// Export database
adminApp.get('/export', async (req, res) => {
  if (!req.session.dbType) {
    return res.redirect('/admin');
  }
  const db = knex(dbConfigs[req.session.dbType]);
  try {
    let tables;
    if (req.session.dbType === 'postgresql') {
      tables = await db.raw("SELECT tablename FROM pg_tables WHERE schemaname = 'public';");
      tables = tables.rows.map(r => r.tablename);
    } else if (req.session.dbType === 'mysql') {
      tables = await db.raw('SHOW TABLES');
      tables = tables[0].map(r => Object.values(r)[0]);
    } else if (req.session.dbType === 'sqlite') {
      tables = await db.raw("SELECT name FROM sqlite_master WHERE type='table'");
      tables = tables.map(r => r.name);
    }
    const data = {};
    for (const table of tables) {
      const rows = await db(table).select('*');
      data[table] = rows;
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="database_export.json"');
    res.send(JSON.stringify(data, null, 2));
  } catch (error) {
    res.send(`Error: ${error.message}`);
  } finally {
    db.destroy();
  }
});

// Import database
adminApp.get('/import', (req, res) => {
  if (!req.session.dbType) {
    return res.redirect('/admin');
  }
  res.render('import');
});

adminApp.post('/import', async (req, res) => {
  if (!req.session.dbType) {
    return res.redirect('/admin');
  }
  const db = knex(dbConfigs[req.session.dbType]);
  try {
    const data = JSON.parse(req.body.jsonData);
    // Define table import order to respect foreign key constraints
    const tableOrder = ['users', 'tournaments', 'tournament_registrations', 'payments', 'scores', 'user_subscriptions', 'user_testimonials'];

    // Disable foreign key checks for the import process
    if (req.session.dbType === 'postgresql') {
      await db.raw('SET CONSTRAINTS ALL DEFERRED');
    } else if (req.session.dbType === 'mysql') {
      await db.raw('SET FOREIGN_KEY_CHECKS = 0');
    } else if (req.session.dbType === 'sqlite') {
      await db.raw('PRAGMA foreign_keys = OFF');
    }

    // First, clear all tables in reverse order
    for (const table of tableOrder.slice().reverse()) {
      if (data[table]) {
        await db(table).del();
      }
    }

    // Then insert data in correct order
    for (const table of tableOrder) {
      if (data[table] && data[table].length > 0) {
        await db(table).insert(data[table]);
      }
    }

    // Re-enable foreign key checks
    if (req.session.dbType === 'postgresql') {
      await db.raw('SET CONSTRAINTS ALL IMMEDIATE');
    } else if (req.session.dbType === 'mysql') {
      await db.raw('SET FOREIGN_KEY_CHECKS = 1');
    } else if (req.session.dbType === 'sqlite') {
      await db.raw('PRAGMA foreign_keys = ON');
    }

    res.send('Import successful. <a href="/admin/dashboard">Back to Dashboard</a>');
  } catch (error) {
    res.send(`Error: ${error.message}`);
  } finally {
    db.destroy();
  }
});

module.exports = adminApp;