import { Router } from 'express';
import { PIE_getSpendingByCategory, BAR_getSpendingByCategoryGroupedByMonth, getNetWorthTrend } from '../db/reports';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/reports/PIE-spending-by-category (summary table, not grouped by month)
router.get('/PIE-spending-by-category', async (req: AuthenticatedRequest, res) => {
  try {
    let { startDate, endDate } = req.query;
    if (Array.isArray(startDate)) startDate = startDate[0];
    if (Array.isArray(endDate)) endDate = endDate[0];
    // Table expects: category_id, category_name, total_spent
    // Pie chart: exclude only transfer
    const data = PIE_getSpendingByCategory(req.user!.id, {
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
    });
    res.json(data);
  } catch (err) {
    console.error('Error in /api/reports/PIE-spending-by-category:', err);
    res.status(500).json({ error: 'Failed to load spending by category.' });
  }
});

// GET /api/reports/BAR-spending-by-category (for bar chart, includes income)
router.get('/BAR-spending-by-category', async (req: AuthenticatedRequest, res) => {
  try {
    let { startDate, endDate } = req.query;
    if (Array.isArray(startDate)) startDate = startDate[0];
    if (Array.isArray(endDate)) endDate = endDate[0];
    // Bar chart: include all categories (including income)
    const data = BAR_getSpendingByCategoryGroupedByMonth(req.user!.id, {
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined
    });
    res.json(data);
  } catch (err) {
    console.error('Error in /api/reports/BAR-spending-by-category:', err);
    res.status(500).json({ error: 'Failed to load spending by category for bar chart.' });
  }
});

// GET /api/reports/net-worth-trend (line chart of net worth over time)
router.get('/net-worth-trend', async (req: AuthenticatedRequest, res) => {
  try {
    let { startDate, endDate } = req.query;
    if (Array.isArray(startDate)) startDate = startDate[0];
    if (Array.isArray(endDate)) endDate = endDate[0];
    const data = getNetWorthTrend(req.user!.id, {
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
    });
    res.json(data);
  } catch (err) {
    console.error('Error in /api/reports/net-worth-trend:', err);
    res.status(500).json({ error: 'Failed to load net worth trend.' });
  }
});

export default router;
