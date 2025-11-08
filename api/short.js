const { compressToEncodedURIComponent } = require('lz-string');

// 将长文本压缩后拼接为 /api/text 长链接，优先使用 dwz.cn 生成短链（通过环境变量中的 Token），失败则回退到 is.gd
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(400).json({ error: '缺少文本内容 text' });
    }

    const compressed = compressToEncodedURIComponent(text);
    // 根据当前请求域名动态构造长链接，避免硬编码
    const host = (req.headers['x-forwarded-host'] || req.headers.host || process.env.VERCEL_URL || 'qrcode1-six.vercel.app');
    const protoHeader = req.headers['x-forwarded-proto'];
    const proto = (Array.isArray(protoHeader) ? protoHeader[0] : (protoHeader || 'https'));
    const baseOrigin = `https://${host}`; // 在 Vercel 默认使用 https
    const longUrl = `${baseOrigin}/api/text?data=${compressed}`;

    const token = process.env.DWZ_TOKEN || process.env.DWZCN_TOKEN || '';
    let shortUrl = null;
    let provider = null;

    // 1) 优先尝试 dwz.cn
    if (token) {
      try {
        const resp = await fetch('https://dwz.cn/admin/v2/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Token': token,
          },
          body: JSON.stringify({ url: longUrl }),
        });

        if (resp.ok) {
          const data = await resp.json();
          shortUrl = data.ShortUrl || data.short_url || data.short || data.tinyurl || null;
          if (shortUrl && typeof shortUrl === 'string' && shortUrl.startsWith('http')) {
            provider = 'dwz.cn';
          }
        }
      } catch (_) {
        // 忽略 dwz.cn 错误，进入回退
      }
    }

    // 2) 回退到 is.gd
    if (!shortUrl) {
      try {
        const api = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`;
        const resp = await fetch(api);
        const txt = await resp.text();
        if (resp.ok && typeof txt === 'string' && txt.startsWith('http')) {
          shortUrl = txt;
          provider = 'is.gd';
        }
      } catch (_) {
        // 忽略 is.gd 错误，保留 shortUrl 为 null
      }
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ shortUrl, longUrl, provider });
  } catch (err) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).json({ error: '服务器错误' });
  }
}