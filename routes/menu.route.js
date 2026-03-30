const express = require('express');
const upload = require('../middleware/upload');
const controller = require('../controllers');

const router = express.Router();

router.get('/', controller.getAll);
router.get('/create', controller.showCreateForm);
router.post('/create', upload, controller.create);
router.post('/:id/delete', controller.deleteItem);
router.get('/:id/edit', controller.showEditForm);
router.post('/:id/update', upload, controller.update);
router.get('/:id', controller.getById);

module.exports = router;