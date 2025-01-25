const express = require('express');
const {
  register,
  login,
  getDashboardStats,
  getBarChartData,
  getAreaChartData,
  getProducts,
  getCustomers,
  getPurchases,
  getDiscountedProducts,
  getRevenue,
  getPopularProducts,
  getBestCustomers,
  getCurrentStock,
  getCriticalStock,
  getPopularInventoryProducts,
  getSalesReturns,
  getClients,
  createPurchaseOrder,
  getPurchaseOrders,
  getProductReturns,
  getReport,
  getForecast
} = require('../controller/controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

router.get('/dashboard-stats', authenticateToken, getDashboardStats);
router.get('/bar-chart-data', authenticateToken, getBarChartData);
router.get('/area-chart-data', authenticateToken, getAreaChartData);
router.get('/urunler', authenticateToken, getProducts);
router.get('/musteriler', authenticateToken, getCustomers);
router.get('/achats', authenticateToken, getPurchases);
router.get('/produits-remises', authenticateToken, getDiscountedProducts);
router.get('/chiffre-affaires', authenticateToken, getRevenue);
router.get('/produits-populaires', authenticateToken, getPopularProducts);
router.get('/meilleurs-clients', authenticateToken, getBestCustomers);
router.get('/inventaire/stock-actuel', authenticateToken, getCurrentStock);
router.get('/inventaire/stock-critique', authenticateToken, getCriticalStock);
router.get('/inventaire/produits-populaires', authenticateToken, getPopularInventoryProducts);
router.get('/inventaire/ventes-retours', authenticateToken, getSalesReturns);
router.get('/clients', authenticateToken, getClients);
router.post('/purchase-orders', authenticateToken, createPurchaseOrder);
router.get('/purchase-orders', authenticateToken, getPurchaseOrders);
router.get('/retours-produits', authenticateToken, getProductReturns);
router.get('/rapport', authenticateToken, getReport);
router.get('/forecast', authenticateToken, getForecast);

module.exports = router;