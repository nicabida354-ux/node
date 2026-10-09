const fs = require('fs');

console.log('Reading countries-50m.geojson...');
const c50 = JSON.parse(fs.readFileSync('data/countries-50m.geojson', 'utf8'));

console.log('Reading admin-1-10m.geojson...');
const a1 = JSON.parse(fs.readFileSync('data/admin-1-10m.geojson', 'utf8'));

function roundCoord(c) {
  if (typeof c[0] === 'number') {
    return [Math.round(c[0] * 1000) / 1000, Math.round(c[1] * 1000) / 1000];
  }
  return c.map(roundCoord);
}

const countryFeatures = c50.features.map(f => ({
  type: 'Feature',
  properties: { name: f.properties.NAME || f.properties.ADMIN || '' },
  geometry: {
    type: f.geometry.type,
    coordinates: roundCoord(f.geometry.coordinates)
  }
}));

const provinceLines = [];
const filteredA1 = a1.features.filter(f => f.properties.scalerank <= 3);

for (const f of filteredA1) {
  const g = f.geometry;
  if (!g) continue;
  if (g.type === 'LineString') {
    const pts = [];
    let lx = null, ly = null;
    for (const [x, y] of g.coordinates) {
      const rx = Math.round(x * 1000) / 1000;
      const ry = Math.round(y * 1000) / 1000;
      if (rx !== lx || ry !== ly) {
        pts.push([rx, ry]);
        lx = rx; ly = ry;
      }
    }
    if (pts.length >= 2) provinceLines.push(pts);
  } else if (g.type === 'MultiLineString') {
    for (const line of g.coordinates) {
      const pts = [];
      let lx = null, ly = null;
      for (const [x, y] of line) {
        const rx = Math.round(x * 1000) / 1000;
        const ry = Math.round(y * 1000) / 1000;
        if (rx !== lx || ry !== ly) {
          pts.push([rx, ry]);
          lx = rx; ly = ry;
        }
      }
      if (pts.length >= 2) provinceLines.push(pts);
    }
  }
}

console.log(`Countries: ${countryFeatures.length}, Province lines: ${provinceLines.length}`);

const exportData = {
  countries: countryFeatures,
  provinces: provinceLines
};

const output = 'window.WORLD_DATA = ' + JSON.stringify(exportData) + ';\nwindow.WORLD_GEOJSON = { type: "FeatureCollection", features: window.WORLD_DATA.countries };\n';
fs.writeFileSync('data/world-geojson.js', output, 'utf8');

const sizeMB = (fs.statSync('data/world-geojson.js').size / (1024 * 1024)).toFixed(2);
console.log(`Success! data/world-geojson.js written (${sizeMB} MB)`);
