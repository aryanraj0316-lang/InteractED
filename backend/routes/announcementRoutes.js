const express = require('express');
const router = express.Router();
const controller = require('../controllers/announcementController');
const { protect, allowRoles } = require('../middleware/auth');

router.get('/', protect, controller.getAll);
router.post('/', protect, controller.create);
router.delete('/:id', protect, allowRoles('CLASS_REP', 'ADMIN'), controller.remove);

module.exports = router;
