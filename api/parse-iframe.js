import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import cheerio from 'cheerio';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { iframeHtml, targetUrl } = req.body;

    if (!iframeHtml && !targetUrl) {
      return res.status(400).json({ error: 'iframeHtml or targetUrl is required' });
    }

    let htmlToParse = iframeHtml;
    
    if (targetUrl) {
      const response = await axios.get(targetUrl);
      htmlToParse = response.data;
    }

    const $ = cheerio.load(htmlToParse);
    const iframeSrc = $('iframe').attr('src');
    
    if (!iframeSrc) {
      return res.status(404).json({ error: 'No iframe found' });
    }

    // Intentar extraer parámetros de video
    const params = new URL(iframeSrc).searchParams;
    const videoId = params.get('id') || params.get('videoId') || params.get('v');
    
    // Devolver información analizada
    res.json({
      iframeSrc,
      videoId,
      detectedType: iframeSrc.includes('m3u8') ? 'HLS' : 
                   iframeSrc.includes('mpd') ? 'DASH' : 
                   iframeSrc.includes('.mp4') ? 'MP4' : 'Unknown',
      needsProxy: !iframeSrc.startsWith('http') || iframeSrc.includes('localhost')
    });
  } catch (error) {
    console.error('Error parsing iframe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
