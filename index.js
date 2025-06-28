require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const morgan = require('morgan');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const logger = require('./logger');


const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('combined')); // log das requisições padrão no console

// Configurar pool do PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

// Swagger setup
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tasks API',
      version: '1.0.0',
      description: 'API para gerenciar tarefas',
    },
  },
  apis: ['./index.js'], // arquivo onde ficam os docs
};
const swaggerSpec = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
  logger.info(`API iniciada na porta ${PORT}`);

  console.log(`Swagger UI disponível em http://localhost:${PORT}/api-docs`);

  logger.info('Teste de log manual para BetterStack', { teste: 'funcionando' })
    .then(() => console.log('Log enviado com sucesso para BetterStack'))
    .catch((err) => console.error('Erro ao enviar log manual:', err));
});
