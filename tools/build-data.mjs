import fs from 'fs';
import iso from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json' with {type:'json'};
import {countries} from 'countries-list';
import * as topojson from 'topojson-client';
import * as d3 from 'd3';
iso.registerLocale(en);
const topo = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-50m.json'));
const extra = {Kosovo:{a2:'XK',name:'Kosovo',continent:'EU',capital:'Pristina'}};
const nicer = {US:'United States',GB:'United Kingdom',RU:'Russia',KR:'South Korea',KP:'North Korea',CD:'DR Congo',CG:'Republic of the Congo',CZ:'Czechia',VA:'Vatican City',MM:'Myanmar',SY:'Syria',LA:'Laos',VN:'Vietnam',IR:'Iran',BO:'Bolivia',VE:'Venezuela',TZ:'Tanzania',MD:'Moldova',FM:'Micronesia',PS:'Palestine',TW:'Taiwan',BN:'Brunei',CI:"Côte d'Ivoire",SZ:'Eswatini',CV:'Cape Verde',MK:'North Macedonia',TL:'Timor-Leste'};
// Territories / dependencies drawn on map but not asked in quiz
const notQuiz = new Set(['AQ','GL','PR','EH','FK','GF','NC','PF','AS','GU','MP','VI','VG','AI','AW','BM','KY','CW','SX','MF','BL','PM','TC','MS','FO','AX','GG','JE','IM','GI','HK','MO','IO','TF','HM','SH','PN','NU','CK','WF','TK','NF','CX','CC','GS','BV','UM','SJ','RE','YT','GP','MQ','BQ']);
const out=[];
for (const g of topo.objects.countries.geometries){
  const a2 = g.id ? iso.numericToAlpha2(g.id) : null;
  const c = a2 && countries[a2];
  let p;
  if (c) p = {a2, name: nicer[a2]||c.name, continent:c.continent, capital:c.capital};
  else if (extra[g.properties.name]) p = extra[g.properties.name];
  else p = {name:g.properties.name, continent:null};
  p.quiz = !!(p.continent && !notQuiz.has(p.a2));
  g.properties = p;
  const f = topojson.feature(topo, g);
  p.area = +(d3.geoArea(f)*1e4).toFixed(3);
  out.push(p);
}
const byA2={};
topo.objects.countries.geometries.forEach(g=>{const p=g.properties; if(!p.a2) return; (byA2[p.a2]=byA2[p.a2]||[]).push(p);});
for (const [a2,list] of Object.entries(byA2)) if(list.length>1){ list.sort((a,b)=>b.area-a.area); list.slice(1).forEach(p=>p.quiz=false); console.log('dup',a2,list.map(p=>p.name+':'+p.area)); }
topo.objects.countries.geometries.forEach(g=>delete g.properties.area);
fs.mkdirSync('data',{recursive:true});
fs.writeFileSync('data/world.json', JSON.stringify(topo));
const q = out.filter(p=>p.quiz);
console.log('quiz', q.length, 'non', out.filter(p=>!p.quiz).map(p=>p.name).join(', '));
console.log('tiny', q.filter(p=>p.area<0.05).map(p=>p.name+':'+p.area).join(', '));
const by={};q.forEach(p=>by[p.continent]=(by[p.continent]||0)+1);console.log(by);
