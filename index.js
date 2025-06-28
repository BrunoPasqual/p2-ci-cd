require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const morgan = require('morgan');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const logger = require('./logger');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('combined')); // log no console

// PostgreSQL Pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

// Swagger config
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tasks API',
      version: '1.0.0',
      description: 'API para gerenciar tarefas',
    },
  },
  apis: ['./index.js'], // ← aqui ele vai buscar os comentários JSDoc
};

const swaggerSpec = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Endpoints para gerenciamento de tarefas
 */

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Lista todas as tarefas
 *     tags: [Tasks]
 *     responses:
 *       200:
 *         description: Lista de tarefas
 */
app.get('/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    logger.error('Erro ao buscar tarefas', { error: err.message });
    res.status(500).json({ error: 'Erro ao buscar tarefas' });
  }
});

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Buscar tarefa por ID
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tarefa encontrada
 *       404:
 *         description: Tarefa não encontrada
 */
app.get('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      logger.info(`Tarefa não encontrada: ID ${id}`);
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    logger.error('Erro ao buscar tarefa', { error: err.message });
    res.status(500).json({ error: 'Erro ao buscar tarefa' });
  }
});

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Criar uma nova tarefa
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tarefa criada
 */
app.post('/tasks', async (req, res) => {
  const { title, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING *',
      [title, description]
    );
    logger.info('Tarefa criada', { task: result.rows[0] });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    logger.error('Erro ao criar tarefa', { error: err.message });
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  }
});

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Atualizar uma tarefa existente
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               completed:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Tarefa atualizada
 *       404:
 *         description: Tarefa não encontrada
 */
app.put('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, description, completed } = req.body;
  try {
    const result = await pool.query(
      'UPDATE tasks SET title = $1, description = $2, completed = $3 WHERE id = $4 RETURNING *',
      [title, description, completed, id]
    );
    if (result.rows.length === 0) {
      logger.info(`Tarefa não encontrada para atualizar: ID ${id}`);
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    logger.info('Tarefa atualizada', { task: result.rows[0] });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    logger.error('Erro ao atualizar tarefa', { error: err.message });
    res.status(500).json({ error: 'Erro ao atualizar tarefa' });
  }
});

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Deletar uma tarefa
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Tarefa deletada com sucesso
 *       404:
 *         description: Tarefa não encontrada
 */
app.delete('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      logger.info(`Tarefa não encontrada para deletar: ID ${id}`);
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    logger.info(`Tarefa deletada: ID ${id}`);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    logger.error('Erro ao deletar tarefa', { error: err.message });
    res.status(500).json({ error: 'Erro ao deletar tarefa' });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
  console.log(`Swagger UI disponível em http://localhost:${PORT}/api-docs`);

  logger.info(`API iniciada na porta ${PORT}`);
  logger.info('Teste de log manual para BetterStack', { teste: 'funcionando' })
    .then(() => console.log('Log enviado com sucesso para BetterStack'))
    .catch((err) => console.error('Erro ao enviar log manual:', err));
});
