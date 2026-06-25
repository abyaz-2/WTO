"use client";

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

const CITIES: [string, number, number][] = [
  ["Algiers",36.8,3.1],["Luanda",-8.8,13.2],["Cotonou",6.4,2.4],["Gaborone",-24.7,25.9],
  ["Ouagadougou",12.4,-1.5],["Bujumbura",-3.4,29.4],["Yaounde",3.9,11.5],["Praia",14.9,-23.5],
  ["Bangui",4.4,18.6],["N'Djamena",12.1,15.0],["Moroni",-11.7,43.3],["Brazzaville",-4.3,15.3],
  ["Kinshasa",-4.3,15.3],["Abidjan",5.4,-4.0],["Djibouti",11.6,43.1],["Malabo",3.8,8.8],
  ["Asmara",15.3,38.9],["Addis Ababa",9.0,38.7],["Libreville",0.4,9.5],["Banjul",13.5,-16.6],
  ["Accra",5.6,-0.2],["Conakry",9.5,-13.7],["Bissau",11.9,-15.6],["Maseru",-29.3,27.5],
  ["Monrovia",6.3,-10.8],["Tripoli",32.9,13.2],["Antananarivo",-18.9,47.5],["Lilongwe",-13.9,33.8],
  ["Bamako",12.6,-8.0],["Nouakchott",18.1,-15.9],["Port Louis",-20.2,57.5],["Rabat",34.0,-6.8],
  ["Maputo",-25.9,32.6],["Windhoek",-22.6,17.1],["Niamey",13.5,2.1],["Abuja",9.1,7.4],
  ["Kigali",-1.9,30.1],["Sao Tome",0.3,6.7],["Dakar",14.7,-17.5],["Victoria",-4.6,55.5],
  ["Freetown",8.5,-13.2],["Mogadishu",2.0,45.3],["Juba",4.9,31.6],["Khartoum",15.6,32.5],
  ["Mbabane",-26.3,31.1],["Dodoma",-6.2,35.7],["Lome",6.1,1.2],["Tunis",36.8,10.2],
  ["Kampala",0.3,32.6],["Harare",-17.8,31.1],["Lusaka",-15.4,28.3],
  ["Kabul",34.5,69.2],["Yerevan",40.2,44.5],["Baku",40.4,49.9],["Manama",26.2,50.6],
  ["Dhaka",23.7,90.4],["Thimphu",27.5,89.6],["Bandar Seri Begawan",4.9,114.9],
  ["Phnom Penh",11.6,104.9],["Colombo",6.9,79.9],["Nicosia",35.2,33.4],
  ["Tbilisi",41.7,44.8],["Hong Kong",22.3,114.2],["Ahmedabad",23.0,72.6],["Hyderabad",17.4,78.5],
  ["Kolkata",22.6,88.4],["Bengaluru",12.9,77.6],["Pune",18.5,73.9],["Jaipur",26.9,75.8],
  ["Baghdad",33.3,44.4],["Jerusalem",31.8,35.2],["Amman",31.9,35.9],["Astana",51.2,71.4],
  ["Kuwait City",29.4,48.0],["Bishkek",42.9,74.6],["Vientiane",17.9,102.6],["Beirut",33.9,35.5],
  ["Kuala Lumpur",3.1,101.7],["Male",4.2,73.5],["Ulaanbaatar",47.9,106.9],
  ["Yangon",16.8,96.2],["Kathmandu",27.7,85.3],["Muscat",23.6,58.6],["Islamabad",33.7,73.1],
 ["Karachi",24.9,67.0],["Lahore",31.5,74.3],["Manila",14.6,121.0],["Doha",25.3,51.5],
  ["Damascus",33.5,36.3],["Dushanbe",38.6,68.8],["Ashgabat",37.9,58.4],
  ["Tashkent",41.3,69.3],["Port Moresby",-9.5,147.2],["Suva",-18.1,178.4],
  ["Hanoi",21.0,105.8],["Ho Chi Minh City",10.8,106.7],["Sanaa",15.4,44.2],
  ["Vienna",48.2,16.4],["Minsk",53.9,27.6],["Sarajevo",43.9,18.4],["Sofia",42.7,23.3],
  ["Zagreb",45.8,16.0],["Prague",50.1,14.4],["Copenhagen",55.7,12.6],["Tallinn",59.4,24.8],
  ["Helsinki",60.2,25.0],["Paris",48.9,2.3],["Berlin",52.5,13.4],["Athens",38.0,23.7],
  ["Budapest",47.5,19.0],["Reykjavik",64.1,-21.9],["Dublin",53.3,-6.3],["Rome",41.9,12.5],
  ["Riga",56.9,24.1],["Vilnius",54.7,25.3],["Luxembourg",49.6,6.1],["Valletta",35.9,14.5],
  ["Chisinau",47.0,28.9],["Amsterdam",52.4,4.9],["Oslo",59.9,10.8],["Warsaw",52.2,21.0],
  ["Lisbon",38.7,-9.1],["Bucharest",44.4,26.1],["Belgrade",44.8,20.5],["Bratislava",48.1,17.1],
  ["Ljubljana",46.1,14.5],["Madrid",40.4,-3.7],["Stockholm",59.3,18.1],["Bern",46.9,7.5],
  ["Kyiv",50.5,30.5],["Vatican",41.9,12.5],["Podgorica",42.4,19.3],["Edinburgh",55.9,-3.2],
  ["Manchester",53.5,-2.2],["Birmingham",52.5,-1.9],["Glasgow",55.9,-4.3],["Milan",45.5,9.2],
  ["Naples",40.8,14.3],["Turin",45.1,7.7],["Barcelona",41.4,2.2],["Valencia",39.5,-0.4],
  ["Seville",37.4,-6.0],["Hamburg",53.6,10.0],["Munich",48.1,11.6],["Cologne",50.9,6.9],
  ["Stuttgart",48.8,9.2],["Dusseldorf",51.2,6.8],["Dortmund",51.5,7.5],["Essen",51.5,7.0],
  ["Bremen",53.1,8.8],["Dresden",51.0,13.7],["Leipzig",51.3,12.4],["Hanover",52.4,9.7],
  ["Warsaw",52.2,21.0],["Krakow",50.1,19.9],["Wroclaw",51.1,17.0],["Poznan",52.4,16.9],
  ["Toronto",43.7,-79.4],["Vancouver",49.3,-123.1],["Montreal",45.5,-73.6],["Calgary",51.0,-114.1],
  ["Ottawa",45.4,-75.7],["New York",40.7,-74.0],["Los Angeles",34.1,-118.2],["Chicago",41.9,-87.6],
  ["Houston",29.8,-95.4],["Phoenix",33.4,-112.1],["Philadelphia",40.0,-75.2],["San Antonio",29.5,-98.5],
  ["San Diego",32.7,-117.2],["Dallas",32.8,-96.8],["Austin",30.3,-97.7],["Jacksonville",30.3,-81.7],
  ["Fort Worth",32.8,-97.3],["Columbus",40.0,-82.9],["Charlotte",35.2,-80.8],["Indianapolis",39.8,-86.1],
  ["Denver",39.7,-104.9],["Seattle",47.6,-122.3],["Nashville",36.2,-86.8],["Memphis",35.1,-90.0],
  ["Portland",45.5,-122.7],["Oklahoma City",35.5,-97.5],["Las Vegas",36.2,-115.1],["Baltimore",39.3,-76.6],
  ["Boston",42.4,-71.1],["Milwaukee",43.0,-87.9],["Washington",38.9,-77.0],["Atlanta",33.7,-84.4],
  ["Miami",25.8,-80.2],["Havana",23.1,-82.4],["Port-au-Prince",18.5,-72.3],
  ["Santo Domingo",18.5,-69.9],["San Juan",18.5,-66.0],["Nassau",25.1,-77.3],
  ["Guatemala City",14.6,-90.5],["Managua",12.1,-86.3],["Panama City",9.0,-79.5],
  ["San Salvador",13.7,-89.2],["Tegucigalpa",14.1,-87.2],["San Jose",9.9,-84.1],
  ["Bogota",4.6,-74.1],["Medellin",6.2,-75.6],["Cali",3.4,-76.5],["Barranquilla",10.9,-74.8],
  ["Quito",-0.2,-78.5],["Guayaquil",-2.2,-79.9],["Lima",-12.0,-77.0],["Arequipa",-16.4,-71.5],
  ["La Paz",-16.5,-68.2],["Santa Cruz",-17.8,-63.2],["Santiago",-33.4,-70.6],
  ["Valparaiso",-33.0,-71.6],["Concepcion",-36.8,-73.0],["Caracas",10.5,-66.9],
  ["Maracaibo",10.7,-71.6],["Valencia",10.2,-68.0],["Georgetown",6.8,-58.2],
  ["Paramaribo",5.9,-55.2],["Cayenne",4.9,-52.3],["Montevideo",-34.9,-56.2],
  ["Asuncion",-25.3,-57.6],["Ciudad del Este",-25.5,-54.6],["Auckland",-36.8,174.8],
  ["Wellington",-41.3,174.8],["Christchurch",-43.5,172.6],["Perth",-31.9,115.9],
  ["Melbourne",-37.8,145.0],["Brisbane",-27.5,153.0],["Adelaide",-34.9,138.6],
  ["Gold Coast",-28.0,153.4],["Newcastle",-32.9,151.8],["Hobart",-42.9,147.3],
  ["Osaka",34.7,135.5],["Yokohama",35.5,139.6],["Nagoya",35.2,136.9],["Sapporo",43.1,141.4],
  ["Fukuoka",33.6,130.4],["Kobe",34.7,135.2],["Kyoto",35.0,135.8],["Kawasaki",35.5,139.7],
  ["Saitama",35.9,139.6],["Hiroshima",34.4,132.5],["Sendai",38.3,140.9],
  ["Busan",35.2,129.1],["Incheon",37.5,126.7],["Daegu",35.9,128.6],["Daejeon",36.4,127.4],
  ["Guangzhou",23.1,113.3],["Shenzhen",22.5,114.1],["Chengdu",30.6,104.1],
  ["Nanjing",32.1,118.8],["Wuhan",30.6,114.3],["Xi'an",34.3,108.9],["Hangzhou",30.3,120.2],
  ["Dongguan",23.0,113.8],["Foshan",23.0,113.1],["Shenyang",41.8,123.4],
  ["Harbin",45.8,126.5],["Qingdao",36.1,120.4],["Dalian",38.9,121.6],["Jinan",36.7,117.0],
  ["Zhengzhou",34.8,113.7],["Changsha",28.2,112.9],["Kunming",25.0,102.7],
  ["Changchun",43.9,125.3],["Urumqi",43.8,87.6],["Shijiazhuang",38.0,114.5],
  ["Taipei",25.0,121.5],["Taichung",24.1,120.7],["Kaohsiung",22.6,120.3],
  ["Tehran",35.7,51.4],["Mashhad",36.3,59.6],["Isfahan",32.7,51.7],["Shiraz",29.6,52.5],
  ["Tabriz",38.1,46.3],["Ahvaz",31.3,48.7],["Qom",34.6,50.9],
  ["Ankara",39.9,32.9],["Izmir",38.4,27.2],["Bursa",40.2,29.1],["Adana",37.0,35.3],
  ["Gaziantep",37.1,37.4],["Konya",37.9,32.5],["Antalya",36.9,30.7],
  ["Alexandria",31.2,29.9],["Giza",30.0,31.2],["Casablanca",33.6,-7.6],
  ["Fes",34.0,-5.0],["Tangier",35.8,-5.8],["Marrakesh",31.6,-8.0],
  ["Dar es Salaam",-6.8,39.3],["Mombasa",-4.0,39.7],["Kano",12.0,8.5],
  ["Ibadan",7.4,3.9],["Port Harcourt",4.8,7.0],  ["Benin City",6.3,5.6],
  ["Kumasi",6.7,-1.6],["Douala",4.1,9.7],
  ["Geneva",46.2,6.1],["Zurich",47.4,8.5],
  ["Washington",38.9,-77.0],["Beijing",39.9,116.4],["Brussels",50.8,4.3],
  ["Singapore",1.3,103.8],["Tokyo",35.7,139.7],["New Delhi",28.6,77.2],
  ["Abu Dhabi",24.5,54.4],["London",51.5,-0.1],["Brasilia",-15.8,-47.9],
  ["Cape Town",-33.9,18.4],["Canberra",-35.3,149.1],["Moscow",55.8,37.6],
  ["Riyadh",24.7,46.7],["Nairobi",-1.3,36.8],["Buenos Aires",-34.6,-58.4],
  ["Seoul",37.6,127.0],["Cairo",30.0,31.2],["Mexico City",19.4,-99.1],
  ["Jakarta",-6.2,106.8],["Chennai",13.1,80.3],["Dubai",25.2,55.3],
  ["Istanbul",41.0,29.0],["Bangkok",13.8,100.5],["Sydney",-33.9,151.2],
  ["Lagos",6.5,3.4],["San Francisco",37.8,-122.4],["Mumbai",19.1,72.9],
  ["Shanghai",31.2,121.5],["Frankfurt",50.1,8.7],
];

const CONTINENTS: [number, number][][] = [
  // North America
  [
    [70,-160],[72,-140],[70,-100],[68,-80],[60,-65],[48,-55],[45,-65],[38,-76],
    [35,-78],[30,-82],[25,-80],[22,-88],[19,-92],[10,-84],[8,-78],
    [10,-76],[14,-78],[18,-95],[20,-105],[28,-115],[32,-117],[36,-122],[42,-124],
    [48,-124],[52,-128],[58,-134],[62,-140],[65,-148],[70,-160],
  ],
  // South America
  [
    [12,-72],[8,-60],[5,-52],[0,-50],[-5,-35],[-8,-35],[-12,-38],[-15,-40],
    [-18,-42],[-22,-43],[-25,-48],[-30,-50],[-33,-54],[-35,-58],[-38,-62],
    [-42,-64],[-46,-68],[-50,-72],[-52,-74],[-54,-72],[-55,-68],[-50,-65],
    [-46,-64],[-40,-62],[-34,-58],[-30,-56],[-23,-44],[-18,-40],[-15,-38],
    [-10,-36],[-5,-34],[0,-50],[5,-52],[8,-60],[12,-72],
  ],
  // Africa
  [
    [35,-5],[33,-9],[28,-13],[22,-17],[18,-17],[14,-17],[10,-15],[7,-12],
    [5,-9],[2,-4],[0,2],[-2,8],[-5,12],[-8,14],[-12,14],[-16,14],
    [-20,14],[-24,16],[-28,18],[-32,20],[-35,22],[-35,28],
    [-30,31],[-26,33],[-22,36],[-18,38],[-14,40],[-10,42],[-6,44],
    [-2,46],[2,48],[6,50],[10,52],[12,48],[14,44],[16,42],
    [18,40],[20,38],[22,36],[24,34],[26,33],[28,31],[30,28],
    [32,26],[34,24],[36,22],[37,18],[35,14],[34,10],[36,6],
    [36,2],[35,-5],
  ],
  // Europe
  [
    [35,-5],[38,-9],[42,-9],[44,-8],[47,-5],[49,-4],[51,-3],[52,-1],
    [52,2],[53,4],[54,5],[55,8],[57,9],[58,12],[60,18],[63,24],
    [66,28],[68,35],[70,45],[72,50],[73,60],[72,65],[70,68],
    [68,64],[66,62],[64,60],[60,56],[56,54],[52,52],[48,50],
    [44,48],[42,46],[40,44],[38,42],[36,40],[34,38],[32,36],
    [30,34],[30,32],[32,30],[34,28],[36,26],[38,24],[36,22],
    [34,20],[36,18],[35,14],[34,10],[36,6],[36,2],[35,-5],
  ],
  // Asia
  [
    [30,34],[32,36],[34,38],[36,40],[38,42],[42,44],[46,46],[50,48],
    [54,50],[58,52],[62,56],[66,60],[68,64],[70,68],[72,65],[73,60],
    [72,50],[72,60],[73,70],[73,80],[73,90],[73,100],[72,110],
    [72,120],[70,130],[68,140],[66,150],[64,160],[62,168],
    [60,172],[58,168],[56,162],[52,158],[48,152],[44,148],
    [40,144],[36,140],[34,136],[32,132],[30,128],[28,124],
    [26,122],[22,118],[18,114],[14,110],[10,106],[8,104],
    [6,102],[2,104],[2,108],[0,112],[-2,116],[-4,118],[-6,120],
    [-8,124],[-6,128],[-4,132],[-2,136],[0,140],[2,144],
    [2,148],[0,150],[-2,148],[-4,144],[-6,140],[-4,136],
    [-2,132],[0,128],[2,124],[6,120],[10,120],[14,120],
    [16,118],[18,116],[20,114],[22,112],[24,110],[26,108],
    [28,106],[30,104],[30,100],[28,96],[30,94],[32,92],
    [34,90],[36,88],[38,86],[40,84],[42,82],[44,80],
    [30,76],[28,72],[26,68],[28,64],[30,60],[30,56],
    [30,52],[28,48],[26,46],[28,44],[30,42],[30,38],[30,34],
  ],
  // Australia
  [
    [-12,132],[-12,136],[-14,140],[-16,142],[-18,144],[-20,146],
    [-22,148],[-24,150],[-26,152],[-28,154],[-30,156],
    [-32,158],[-34,160],[-36,158],[-38,156],[-38,152],
    [-36,148],[-34,144],[-32,140],[-30,138],[-28,136],
    [-26,134],[-24,132],[-22,130],[-20,128],[-18,126],
    [-16,124],[-14,122],[-12,120],[-10,122],[-10,126],
    [-10,130],[-12,132],
  ],
];

const SPHERE_RADIUS = 2.5;

const cityPositionsCache = CITIES.map(
  ([, lat, lng]) => latLngToVec3(lat, lng, SPHERE_RADIUS),
);

const continentOutlines = CONTINENTS.map((points) =>
  new THREE.BufferGeometry().setFromPoints(points.map(([lat, lng]) => latLngToVec3(lat, lng, SPHERE_RADIUS)))
);

const MAX_CITY_CONNECTIONS = 3;
const ARC_SEGMENTS = 20;

function slerp(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  const dot = Math.max(-1, Math.min(1, a.dot(b)));
  const theta = Math.acos(dot);
  if (theta < 0.001) return a.clone();
  const sinTheta = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sinTheta;
  const wb = Math.sin(t * theta) / sinTheta;
  return new THREE.Vector3().copy(a).multiplyScalar(wa).add(b.clone().multiplyScalar(wb));
}

function computeArcGeometry(): { positions: Float32Array; indices: Uint16Array } {
  const pts = cityPositionsCache;

  const nameToIdx = new Map<string, number>();
  CITIES.forEach(([name], i) => nameToIdx.set(name, i));

  const INTERCONTINENTAL: [string, string][] = [
    ["Washington","Beijing"],["Washington","London"],["Washington","Tokyo"],
    ["London","Singapore"],["London","Dubai"],["London","Mumbai"],
    ["Beijing","Moscow"],["Beijing","Sydney"],["Tokyo","Sydney"],
    ["Dubai","Singapore"],["San Francisco","Tokyo"],
    ["Brasilia","Washington"],["Buenos Aires","London"],
    ["Cape Town","London"],["Nairobi","London"],["Lagos","London"],
    ["Istanbul","Moscow"],["Mexico City","Madrid"],
    ["Jakarta","Tokyo"],["Dubai","Cape Town"],
    ["Singapore","Shanghai"],["Riyadh","Dubai"],
    ["Sydney","Los Angeles"],["New York","London"],
  ];

  const used = new Set<string>();
  const connections: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const dists: [number, number][] = [];
    for (let j = 0; j < pts.length; j++) {
      if (i === j) continue;
      dists.push([pts[i].distanceToSquared(pts[j]), j]);
    }
    dists.sort((a, b) => a[0] - b[0]);
    let count = 0;
    for (const [, j] of dists) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!used.has(key)) {
        used.add(key);
        connections.push([i, j]);
        count++;
        if (count >= MAX_CITY_CONNECTIONS) break;
      }
    }
  }

  INTERCONTINENTAL.forEach(([a, b]) => {
    const i = nameToIdx.get(a);
    const j = nameToIdx.get(b);
    if (i === undefined || j === undefined || i === j) return;
    const key = i < j ? `${i}-${j}` : `${j}-${i}`;
    if (!used.has(key)) {
      used.add(key);
      connections.push([i, j]);
    }
  });

  const pointCount = connections.length * (ARC_SEGMENTS + 1);
  const positions = new Float32Array(pointCount * 3);
  const indices: number[] = [];
  let offset = 0;

  connections.forEach(([i, j]) => {
    const a = pts[i], b = pts[j];
    const aN = a.clone().normalize();
    const bN = b.clone().normalize();
    const dist = a.distanceTo(b);
    const height = dist * 0.35;

    for (let k = 0; k <= ARC_SEGMENTS; k++) {
      const t = k / ARC_SEGMENTS;
      const p = slerp(aN, bN, t).multiplyScalar(SPHERE_RADIUS);
      const lift = Math.sin(t * Math.PI) * height;
      p.add(p.clone().normalize().multiplyScalar(lift));
      positions[(offset + k) * 3] = p.x;
      positions[(offset + k) * 3 + 1] = p.y;
      positions[(offset + k) * 3 + 2] = p.z;
    }
    for (let k = 0; k < ARC_SEGMENTS; k++) {
      indices.push(offset + k, offset + k + 1);
    }
    offset += ARC_SEGMENTS + 1;
  });

  return { positions, indices: new Uint16Array(indices) };
}

const arcGeometry = computeArcGeometry();

function LatLongLines({ rippleActive }: { rippleActive: boolean }) {
  const lines = useMemo(() => {
    const geos: THREE.BufferGeometry[] = [];
    const seg = 64;
    for (let lat = -75; lat <= 75; lat += 15) {
      if (lat === 0) continue;
      const phi = (90 - lat) * (Math.PI / 180);
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= seg; i++) {
        const theta = (i / seg) * Math.PI * 2;
        pts.push(new THREE.Vector3(
          -SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta),
          SPHERE_RADIUS * Math.cos(phi),
          SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta),
        ));
      }
      geos.push(new THREE.BufferGeometry().setFromPoints(pts));
    }
    for (let lng = 0; lng < 360; lng += 15) {
      const theta = lng * (Math.PI / 180);
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= seg; i++) {
        const phi = (i / seg) * Math.PI;
        pts.push(new THREE.Vector3(
          -SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta),
          SPHERE_RADIUS * Math.cos(phi),
          SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta),
        ));
      }
      geos.push(new THREE.BufferGeometry().setFromPoints(pts));
    }
    return geos;
  }, []);

  return (
    <group>
      {lines.map((geo, i) => (
        <Line key={i} geometry={geo} color="#1E6FE8" opacity={rippleActive ? 0.22 : 0.12} />
      ))}
    </group>
  );
}

function Line({ geometry, color, opacity }: { geometry: THREE.BufferGeometry; color: string; opacity: number }) {
  const ref = useRef<THREE.LineSegments>(null!);
  const lineGeo = useMemo(() => {
    const pos = geometry.getAttribute("position");
    const count = pos.count;
    const indices: number[] = [];
    for (let i = 0; i < count - 1; i++) indices.push(i, i + 1);
    const idx = new THREE.BufferAttribute(new Uint16Array(indices), 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", pos.clone());
    g.setIndex(idx);
    return g;
  }, [geometry]);

  return (
    <lineSegments ref={ref} geometry={lineGeo}>
      <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </lineSegments>
  );
}

function CityDots() {
  const ref = useRef<THREE.Points>(null!);
  const geo = useMemo(() => {
    const pos = new Float32Array(cityPositionsCache.length * 3);
    cityPositionsCache.forEach((p, i) => {
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.07} color="#6CA9FF" sizeAttenuation transparent opacity={0.9} />
    </points>
  );
}



function CityConnections() {
  const ref = useRef<THREE.LineSegments>(null!);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arcGeometry.positions, 3));
    g.setIndex(new THREE.BufferAttribute(arcGeometry.indices, 1));
    return g;
  }, []);

  return (
    <lineSegments ref={ref} geometry={geo}>
      <lineBasicMaterial color="#6CA9FF" transparent opacity={0.2} depthWrite={false} />
    </lineSegments>
  );
}

function ContinentOutlines() {
  const geometries = useMemo(() => continentOutlines, []);
  return (
    <group>
      {geometries.map((geo, i) => {
        const pos = geo.getAttribute("position");
        const count = pos.count;
        const indices: number[] = [];
        for (let j = 0; j < count; j++) indices.push(j, (j + 1) % count);
        const idx = new THREE.BufferAttribute(new Uint16Array(indices), 1);
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", pos.clone());
        g.setIndex(idx);
        return (
          <lineSegments key={i} geometry={g}>
            <lineBasicMaterial color="#1E6FE8" transparent opacity={0.8} depthWrite={false} />
          </lineSegments>
        );
      })}
    </group>
  );
}

function RippleRing({ center, progress }: { center: THREE.Vector3; progress: number }) {
  const geo = useMemo(() => {
    const segments = 48;
    const radius = 0.05 + progress * 0.6;
    const tangent = new THREE.Vector3(1, 0, 0);
    const bitangent = new THREE.Vector3(0, 1, 0);
    const dir = center.clone().normalize();
    if (Math.abs(dir.dot(tangent)) > 0.9) {
      tangent.set(0, 0, 1).cross(dir).normalize();
    } else {
      tangent.cross(dir).normalize();
    }
    bitangent.copy(dir).cross(tangent).normalize();
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const p = new THREE.Vector3()
        .addScaledVector(tangent, Math.cos(angle) * radius)
        .addScaledVector(bitangent, Math.sin(angle) * radius)
        .add(center);
      pts.push(p);
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const pos = g.getAttribute("position");
    const indices: number[] = [];
    for (let i = 0; i < pos.count - 1; i++) indices.push(i, i + 1);
    const idx = new THREE.BufferAttribute(new Uint16Array(indices), 1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", pos.clone());
    geo.setIndex(idx);
    return geo;
  }, [center, progress]);

  const opacity = Math.max(0, 1 - progress);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#6CA9FF" transparent opacity={opacity} depthWrite={false} />
    </lineSegments>
  );
}

function InnerGlobe({ onGlobeClick }: { onGlobeClick: () => void }) {
  const groupRef = useRef<THREE.Group>(null!);
  const [rippleActive, setRippleActive] = useState(false);
  const [rippleCenter, setRippleCenter] = useState<THREE.Vector3 | null>(null);
  const [rippleProgress, setRippleProgress] = useState(0);
  const rotationSpeed = useRef(0.06);
  const hasSetInitialRotation = useRef(false);

  useEffect(() => {
    if (groupRef.current && !hasSetInitialRotation.current) {
      groupRef.current.rotation.x = 0.1;
      groupRef.current.rotation.y = -0.4;
      hasSetInitialRotation.current = true;
    }
  }, []);

  const handlePointerDown = useCallback((e: any) => {
    if (e.point) {
      const hitPoint = e.point.clone();
      const dir = hitPoint.clone().normalize();
      const onSphere = dir.multiplyScalar(SPHERE_RADIUS);
      setRippleCenter(onSphere);
      setRippleActive(true);
      setRippleProgress(0);

      rotationSpeed.current = 0.12;
      setTimeout(() => { rotationSpeed.current = 0.06; }, 800);
      setTimeout(() => { setRippleActive(false); }, 2000);
    }
    onGlobeClick();
  }, [onGlobeClick]);

  useFrame((_, delta) => {
    groupRef.current.rotation.y += delta * rotationSpeed.current;

    if (rippleActive && rippleProgress < 1) {
      setRippleProgress((p) => Math.min(p + delta * 1.5, 1));
    }
  });

  return (
    <group ref={groupRef}>
      <mesh onPointerDown={handlePointerDown}>
        <sphereGeometry args={[SPHERE_RADIUS, 48, 48]} />
        <meshBasicMaterial color="#05162D" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <LatLongLines rippleActive={rippleActive} />
      <CityConnections />
      <ContinentOutlines />
      <CityDots />
      {rippleActive && rippleCenter && (
        <RippleRing center={rippleCenter} progress={rippleProgress} />
      )}
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS * 0.99, 32, 32]} />
        <meshBasicMaterial color="#05162D" transparent opacity={0.3} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

export default function Globe({ className }: { className?: string }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (!mounted) {
    return <div className={`w-full h-full ${className ?? ""}`} />;
  }

  return (
    <div className={`w-full h-full ${className ?? ""}`}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        style={{ touchAction: "none" }}
      >
        <color attach="background" args={["#05162D"]} />
        <ambientLight intensity={0.5} />
        <InnerGlobe onGlobeClick={() => {}} />
      </Canvas>
    </div>
  );
}
