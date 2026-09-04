const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const controller = require('../controllers/ticket.controller');

const router = express.Router();
router.use(authMiddleware());
router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
