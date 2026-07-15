import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// GET /api/trafego/facebook
router.get('/facebook', async (req, res) => {
  try {
    const sql = `
      SELECT ad_id, ad_name, impressions, clicks, spend, conversions, DATE(date_start) AS data
        FROM facebook_ad_details
       ORDER BY date_start DESC
       LIMIT 100
    `;
    const ads = await query(sql);

    const totalSpend       = ads.reduce((s, a) => s + (parseFloat(a.spend)       || 0), 0);
    const totalClicks      = ads.reduce((s, a) => s + (Number(a.clicks)          || 0), 0);
    const totalImpressions = ads.reduce((s, a) => s + (Number(a.impressions)     || 0), 0);
    const totalConversions = ads.reduce((s, a) => s + (Number(a.conversions)     || 0), 0);

    res.json({
      data: ads,
      summary: {
        totalSpend,
        totalClicks,
        totalImpressions,
        totalConversions,
        ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00',
        cpc: totalClicks > 0       ? (totalSpend / totalClicks).toFixed(2)                : '0.00',
      },
    });
  } catch (err) {
    console.error('GET /api/trafego/facebook erro:', err.message);
    res.json({ data: [], summary: {}, message: 'Dados do Facebook indisponíveis' });
  }
});

// GET /api/trafego/instagram
router.get('/instagram', async (req, res) => {
  try {
    const sql = `
      SELECT media_id, media_type, caption, timestamp, like_count, comments_count
        FROM instagram_media
       ORDER BY timestamp DESC
       LIMIT 100
    `;
    const posts = await query(sql);
    res.json({ data: posts });
  } catch (err) {
    console.error('GET /api/trafego/instagram erro:', err.message);
    res.json({ data: [], message: 'Dados do Instagram indisponíveis' });
  }
});

// GET /api/trafego/google
router.get('/google', async (req, res) => {
  res.json({ data: [], message: 'Google Ads ainda não disponível' });
});

// GET /api/trafego/tiktok
router.get('/tiktok', async (req, res) => {
  res.json({ data: [], message: 'TikTok Ads ainda não disponível' });
});

export default router;
