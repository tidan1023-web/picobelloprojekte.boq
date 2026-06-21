const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getComments, addComment, deleteComment } = require('../controllers/commentController');

router.use(authenticate);

router.get('/', getComments);
router.post('/', addComment);
router.delete('/:id', deleteComment);

module.exports = router;
