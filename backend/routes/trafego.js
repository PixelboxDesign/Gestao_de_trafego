import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

/**
 * GET /api/trafego/facebook
 * Dados de Facebook Ads
 */
router.get('/facebook', async (req, res) => {
  try {
    // Buscar dados de anúncios do Facebook
    const sql = `
      SELECT 
        ad_id,
        ad_name,
        impressions,
        clicks,
        spend,
        conversions,
        DATE(date_start) as data
      FROM facebook_ad_details
      ORDER BY date_start DESC
      LIMIT 100
    `;

    const ads = await query(sql);

    // Calcular métricas agregadas
    const totalSpend = ads.reduce((sum, ad) => sum + (parseFloat(ad.spend) || 0), 0);
    const totalClicks = ads.reduce((sum, ad) => sum + (ad.clicks || 0), 0);
    const totalImpressions = ads.reduce((sum, ad) => sum + (ad.impressions || 0), 0);
    const totalConversions = ads.reduce((sum, ad) => sum + (ad.conversions || 0), 0);

    res.json({
      data: ads,
      summary: {
        totalSpend,
        totalClicks,
        totalImpressions,
        totalConversions,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : 0,
        cpc: totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Erro ao buscar dados do Facebook:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do Facebook Ads' });
  }
});

/**
 * GET /api/trafego/google
 * Dados de Google Ads (placeholder - implementar quando houver tabela)
 */
router.get('/google', async (req, res) => {
  try {
    // TODO: Implementar quando houver tabela de Google Ads
    res.json({
      data: [],
      message: 'Dados do Google Ads ainda não disponíveis'
    });
  } catch (error) {
    console.error('Erro ao buscar dados do Google:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do Google Ads' });
  }
});

/**
 * GET /api/trafego/tiktok
 * Dados de TikTok Ads (placeholder - implementar quando houver tabela)
 */
router.get('/tiktok', async (req, res) => {
  try {
    // TODO: Implementar quando houver tabela de TikTok Ads
    res.json({
      data: [],
      message: 'Dados do TikTok Ads ainda não disponíveis'
    });
  } catch (error) {
    console.error('Erro ao buscar dados do TikTok:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do TikTok Ads' });
  }
});

/**
 * GET /api/trafego/instagram
 * Dados de Instagram
 */
router.get('/instagram', async (req, res) => {
  try {
    const sql = `
      SELECT 
        media_id,
        media_type,
        caption,
        timestamp,
        like_count,
        comments_count
      FROM instagram_media
      ORDER BY timestamp DESC
      LIMIT 100
    `;

    const posts = await query(sql);

    res.json({ data: posts });
  } catch (error) {
    console.error('Erro ao buscar dados do Instagram:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do Instagram' });
  }
});

export default router;
