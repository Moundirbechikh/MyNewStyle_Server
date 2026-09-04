const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderStats,
  updateOrderStatus,
  getOrderById,
} = require('../controllers/orderController');

router.use(protect);

router.post('/', createOrder);
router.get('/my-orders', getMyOrders);
router.get('/stats', admin, getOrderStats); // ADMIN — avant /:id pour éviter le conflit
router.get('/', admin, getAllOrders); // ADMIN
router.patch('/:id/status', admin, updateOrderStatus); // ADMIN
router.get('/:id', getOrderById);

module.exports = router;