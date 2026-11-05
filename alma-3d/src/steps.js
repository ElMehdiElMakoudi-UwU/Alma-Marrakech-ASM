// The scroll story, one entry per step. Angles are in degrees: theta turns
// around the villa (0 = from the south, on the plan's bottom edge), phi is the
// angle from straight above. roofY and upY lift the layers, roofO and upO fade them.
const whole = { roofY: 0, roofO: 1, upY: 0, upO: 1, night: 0, shift: 0.14 };

export const STEPS = [
  { // 0: opening
    ...whole, shift: 0,
    theta: -36, phi: 73, r: 50, tx: -0.5, ty: 2.2, tz: 1.5,
    labels: [],
  },
  { // 1: the white frame on brick
    ...whole, shift: 0.2,
    theta: 33, phi: 78, r: 41, tx: 0.6, ty: 3.2, tz: 0,
    labels: ['dimTop', 'dimBottom', 'overhang'],
  },
  { // 2: the layers apart
    ...whole, roofY: 10.5, upY: 5,
    theta: -42, phi: 65, r: 74, tx: 0, ty: 7.6, tz: 0,
    labels: ['layerRoof', 'layerUp', 'layerDown'],
  },
  { // 3: upper floor
    ...whole, roofY: 16, roofO: 0,
    theta: -14, phi: 27, r: 47, tx: 0.4, ty: 3, tz: 0.4,
    labels: ['suite', 'dressing', 'sdbSuite', 'terrasseHaut', 'chambreNord', 'chambreSud', 'vide', 'sdbEst', 'sdbSud'],
  },
  { // 4: ground floor
    ...whole, roofY: 22, roofO: 0, upY: 12, upO: 0,
    theta: 12, phi: 29, r: 45, tx: 0.2, ty: 0.5, tz: 0.4,
    labels: ['cuisine', 'sdbBas', 'sejour', 'hall', 'marocain', 'europeen', 'escalier'],
  },
  { // 5: the lot
    ...whole,
    theta: -28, phi: 40, r: 64, tx: 0.9, ty: 0, tz: 3.2,
    labels: ['piscine', 'terrasseBas', 'jardinSud', 'jardinEst', 'dimLot', 'dimLotDepth'],
  },
  { // 6: evening
    ...whole, night: 1, shift: 0.12,
    theta: -47, phi: 77, r: 42, tx: -0.5, ty: 2.8, tz: 0.6,
    labels: [],
  },
];

// Labels pinned to the model. p is a position on the plan sheet, y a height in
// metres, and layer says which layer the label rides on.
export const LABELS = {
  // Dimensions, as printed on the plans
  overhang: { text: 'Porte-à-faux', p: [1208, 660], y: 2.5, layer: 'up' },
  dimTop: { text: 'Étage 14,57 m', dim: [[415, 703], [1238, 703]], y: 7.5, layer: 'roof' },
  dimBottom: { text: 'RDC 12,51 m', dim: [[472, 680], [1178, 680]], y: 0.2, layer: 'site' },
  dimLot: { text: '22,50 m', dim: [[189, 965], [1450, 965]], y: 0.2, layer: 'site' },
  dimLotDepth: { text: '15,00 m', dim: [[140, 82], [140, 918]], y: 0.2, layer: 'site' },

  // Layers
  layerRoof: { text: 'Toit', p: [1238, 392], y: 6.7, layer: 'roof', big: true },
  layerUp: { text: '1er étage', p: [1238, 392], y: 3.1, layer: 'up', big: true },
  layerDown: { text: 'Rez-de-chaussée', p: [1178, 392], y: 0.4, layer: 'site', big: true },

  // Upper floor
  suite: { text: 'Suite parentale', p: [600, 293], y: 3.4, layer: 'up' },
  dressing: { text: 'Dressing', minor: true, p: [637, 436], y: 3.4, layer: 'up' },
  sdbSuite: { text: 'Sdb', minor: true, p: [500, 393], y: 3.4, layer: 'up' },
  terrasseHaut: { text: 'Terrasse', p: [640, 600], y: 3.4, layer: 'up' },
  chambreNord: { text: 'Chambre', p: [1054, 279], y: 3.4, layer: 'up' },
  chambreSud: { text: 'Chambre', p: [1040, 590], y: 3.4, layer: 'up' },
  vide: { text: 'Vide sur RDC', p: [820, 462], y: 3.4, layer: 'up' },
  sdbEst: { text: 'Sdb', minor: true, p: [1086, 364], y: 3.4, layer: 'up' },
  sdbSud: { text: 'Sdb', minor: true, p: [822, 600], y: 3.4, layer: 'up' },

  // Ground floor
  cuisine: { text: 'Cuisine', p: [609, 273], y: 0.3, layer: 'site' },
  sdbBas: { text: 'Sdb', minor: true, p: [570, 358], y: 0.3, layer: 'site' },
  sejour: { text: 'Séjour', p: [609, 467], y: 0.3, layer: 'site' },
  hall: { text: "Hall d'entrée", p: [824, 460], y: 0.3, layer: 'site' },
  marocain: { text: 'Salon marocain', p: [1041, 347], y: 0.3, layer: 'site' },
  europeen: { text: 'Salon européen', p: [1040, 467], y: 0.3, layer: 'site' },
  escalier: { text: 'Escalier', p: [824, 240], y: 1.6, layer: 'site' },

  // Lot
  piscine: { text: 'Piscine 3,10 × 8,17 m', p: [287, 490], y: 0.2, layer: 'site' },
  terrasseBas: { text: 'Terrasse', p: [300, 215], y: 0.2, layer: 'site' },
  jardinSud: { text: 'Jardin', p: [930, 780], y: 0.2, layer: 'site' },
  jardinEst: { text: 'Jardin', p: [1300, 600], y: 0.2, layer: 'site' },
};
