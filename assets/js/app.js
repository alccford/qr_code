// 工具函数：序列化表单为多行纯文本
function buildPlainText(data) {
  const lines = [
    "温州润恒塑料科技有限公司",
    "产品追溯",
    "",
    `订单公司：${data.company || ''}`,
    `订单号：${data.orderNo || ''}`,
    `产品规格：${data.spec || ''}`,
    `产品数量：${data.quantity || ''}`,
    `原材料入库时间：${data.rmInTime || ''}`,
    `原材料批号：${data.rmBatch || ''}`,
    `原材料检验时间：${data.rmCheckTime || ''}`,
    `生产时间：${data.prodTime || ''}`,
    `生产人员：${data.prodStaff || ''}`,
    `成品检验：${data.fgCheck || ''}`,
    `成品出库：${data.fgOut || ''}`,
  ];
  return lines.join("\n");
}

function getFormData() {
  return {
    company: document.getElementById('company').value.trim(),
    orderNo: document.getElementById('orderNo').value.trim(),
    spec: document.getElementById('spec').value.trim(),
    quantity: document.getElementById('quantity').value.trim(),
    rmInTime: document.getElementById('rmInTime').value,
    rmBatch: document.getElementById('rmBatch').value.trim(),
    rmCheckTime: document.getElementById('rmCheckTime').value,
    prodTime: document.getElementById('prodTime').value,
    prodStaff: document.getElementById('prodStaff').value.trim(),
    fgCheck: document.getElementById('fgCheck').value.trim(),
    fgOut: document.getElementById('fgOut').value,
  };
}

function setPreview(text) {
  const pre = document.getElementById('textPreview');
  pre.textContent = text;
}

function clearQRCode() {
  const qrContainer = document.getElementById('qrcode');
  qrContainer.innerHTML = '';
}

async function generateQRCode(text) {
  clearQRCode();
  const qrContainer = document.getElementById('qrcode');

  // 尝试生成纯文本二维码，若失败则降级为链接二维码
  const tryPlain = () => {
    try {
      const qrcode = new QRCode(qrContainer, {
        text: text,
        width: 320,
        height: 320,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.L, // 先用低纠错提升容量
      });
      updateDownloadLink(qrContainer);
      setModeTip('已生成纯文本二维码。');
      return true;
    } catch (e) {
      return false;
    }
  };

  const tryLongLink = () => {
    const compressed = LZString.compressToEncodedURIComponent(text);
    const baseUrl = `${window.location.origin}/api/text`;
    const url = `${baseUrl}?data=${compressed}`;

    const qrcode = new QRCode(qrContainer, {
      text: url,
      width: 320,
      height: 320,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M,
    });
    updateDownloadLink(qrContainer);
    setModeTip('文本过长，已生成链接二维码（纯文本显示）。微信扫码将直接显示完整文本。');
  };

  const tryShortLink = async () => {
    try {
      const resp = await fetch('/api/short', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await resp.json();
      const finalUrl = data.shortUrl || data.longUrl;
      const qrcode = new QRCode(qrContainer, {
        text: finalUrl,
        width: 320,
        height: 320,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M,
      });
      updateDownloadLink(qrContainer);
      setModeTip(data.shortUrl ? '文本超长，已生成短链二维码（纯文本显示）。' : '文本过长，已生成链接二维码（纯文本显示）。');
      return true;
    } catch (e) {
      return false;
    }
  };

  if (tryPlain()) return;
  // 对极长文本，先尝试后端短链，失败再退回长链接
  if (!(await tryShortLink())) {
    tryLongLink();
  }
}

function updateDownloadLink(qrContainer) {
  setTimeout(() => {
    const canvas = qrContainer.querySelector('canvas');
    const img = qrContainer.querySelector('img');
    let dataUrl = '';
    if (canvas) {
      dataUrl = canvas.toDataURL('image/png');
    } else if (img && img.src) {
      dataUrl = img.src; // 部分环境使用img渲染
    }
    const link = document.getElementById('downloadLink');
    if (dataUrl) {
      link.href = dataUrl;
      link.classList.remove('disabled');
    } else {
      link.href = '#';
      link.classList.add('disabled');
    }
  }, 350);
}

function setModeTip(msg) {
  const el = document.getElementById('modeTip');
  if (el) el.textContent = `提示：${msg}`;
}

// 在页面加载时若存在data参数，自动解压并显示
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const dataParam = params.get('data');
  if (dataParam) {
    try {
      const text = LZString.decompressFromEncodedURIComponent(dataParam) || '';
      setPreview(text);
      // 此处不再生成新二维码，避免链接二维码再生成链接的循环；仅展示文本
      setModeTip('通过链接参数还原的文本已显示在预览区。');
    } catch {
      setModeTip('链接文本解析失败，请重新生成二维码。');
    }
  }
});

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('文本内容已复制到剪贴板');
  }).catch(() => {
    // 兼容处理
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      alert('文本内容已复制到剪贴板');
    } finally {
      document.body.removeChild(textarea);
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const generateBtn = document.getElementById('generateBtn');
  const clearBtn = document.getElementById('clearBtn');
  const copyTextBtn = document.getElementById('copyTextBtn');

  generateBtn.addEventListener('click', () => {
    const data = getFormData();
    const text = buildPlainText(data);
    setPreview(text);
    generateQRCode(text);
  });

  clearBtn.addEventListener('click', () => {
    document.getElementById('traceForm').reset();
    setPreview('');
    clearQRCode();
    const link = document.getElementById('downloadLink');
    link.href = '#';
    link.classList.add('disabled');
  });

  copyTextBtn.addEventListener('click', () => {
    const text = document.getElementById('textPreview').textContent || '';
    if (!text) {
      alert('没有可复制的文本，请先生成');
      return;
    }
    copyText(text);
  });
});