const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const customersRoutes = require('./routes/customers.routes');
const carriersRoutes = require('./routes/carriers.routes');
const consigneesRoutes = require('./routes/consignees.routes');
const loadsRoutes = require('./routes/loads.routes');
const invoicesRoutes = require('./routes/invoices.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));
  if (env.nodeEnv !== 'test') {
    app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  }

  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/customers', customersRoutes);
  app.use('/api/carriers', carriersRoutes);
  app.use('/api/consignees', consigneesRoutes);
  app.use('/api/loads', loadsRoutes);
  app.use('/api/invoices', invoicesRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
