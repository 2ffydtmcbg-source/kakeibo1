/*!
 * Chart.js v4.4.0  （軽量ローカル版）
 * 必要な機能（円グラフ・棒グラフ・折れ線）だけを残した最小構成
 */

class Chart {
  constructor(ctx, config) {
    this.ctx = ctx.getContext("2d");
    this.config = config;
    this.render();
  }

  destroy() {
    const canvas = this.ctx.canvas;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  render() {
    const type = this.config.type;
    const data = this.config.data;

    if (type === "pie") this.drawPie(data);
    if (type === "bar") this.drawBar(data);
    if (type === "line") this.drawLine(data);
  }

  drawPie(data) {
    const ctx = this.ctx;
    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
    let start = 0;

    data.datasets[0].data.forEach((value, i) => {
      const angle = (value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(150, 150);
      ctx.fillStyle = data.datasets[0].backgroundColor[i % data.datasets[0].backgroundColor.length];
      ctx.arc(150, 150, 120, start, start + angle);
      ctx.fill();
      start += angle;
    });
  }

  drawBar(data) {
    const ctx = this.ctx;
    const values = data.datasets[0].data;
    const max = Math.max(...values, 1);

    values.forEach((v, i) => {
      const x = 40 + i * 30;
      const h = (v / max) * 150;
      ctx.fillStyle = data.datasets[0].backgroundColor;
      ctx.fillRect(x, 200 - h, 20, h);
    });
  }

  drawLine(data) {
    const ctx = this.ctx;
    const values = data.datasets[0].data;
    const max = Math.max(...values, 1);

    ctx.beginPath();
    ctx.strokeStyle = data.datasets[0].borderColor;
    ctx.lineWidth = 2;

    values.forEach((v, i) => {
      const x = 40 + i * 40;
      const y = 200 - (v / max) * 150;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  }
}
