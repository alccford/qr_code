const { decompressFromEncodedURIComponent } = require('lz-string');

export default function handler(req, res) {
  try {
    const { data } = req.query || {};
    if (!data) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(400).send('缺少参数 data');
    }
    const text = decompressFromEncodedURIComponent(data);
    if (typeof text !== 'string') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(400).send('解析失败，请重新生成二维码');
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(text);
  } catch (err) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(500).send('服务器错误');
  }
}