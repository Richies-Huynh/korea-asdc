import { FireEvent } from "@/lib/types";

// Real, catastrophic fires in and around Gwangju, Korea. Every entry is backed
// by a published source so the map reads as verifiable history, not scare copy.
// Coordinates are placed at the reported district; where a report withheld the
// exact neighborhood the marker sits at the city center and location_name says so.
export const FIRE_EVENTS: FireEvent[] = [
  {
    id: "kumho-tire-2025",
    title: "Kumho Tire Gwangju Plant Fire",
    location_name: "Sochon-dong, Gwangsan-gu, Gwangju",
    latitude: 35.1466,
    longitude: 126.792,
    occurred_at: new Date("2025-05-17T07:11:00+09:00").getTime(),
    cause:
      "Sparks from an industrial oven preheating natural rubber ignited nearby flammable materials. Roughly 20 tons of raw rubber was stored in the refining section where the blaze began.",
    casualties: "3 injured (1 plant worker, 2 firefighters)",
    severity: FireEvent.SEVERITY_CATASTROPHIC,
    summary:
      "A massive fire tore through the rubber refining section of Kumho Tire's Gwangju plant, burning an area roughly the size of five soccer fields. It halted the site's daily output of about 3,300 tires and left equipment expected to take months to restore.",
    sources: [
      {
        title: "Kumho Tire plant blaze in Gwangju nears containment",
        publisher: "The Korea Herald",
        url: "https://www.koreaherald.com/article/10489815",
      },
      {
        title: "Kumho Tire shuts Gwangju plant after fire, derailing record sales run",
        publisher: "KED Global",
        url: "https://www.kedglobal.com/automobiles/newsView/ked202505180002",
      },
      {
        title: "'Massive' fire damages Kumho's Gwangju plant",
        publisher: "Tire Business",
        url: "https://www.tirebusiness.com/news/massive-fire-damages-kumhos-gwangju-plant",
      },
    ],
  },
  {
    id: "duam-motel-arson-2019",
    title: "Duam-dong Motel Arson",
    location_name: "Duam-dong, Buk-gu, Gwangju",
    latitude: 35.1855,
    longitude: 126.9265,
    occurred_at: new Date("2019-12-22T05:45:00+09:00").getTime(),
    cause:
      "Arson. A guest on the third floor set a pillow alight, smothered it, then reopened the door and the fire flashed over. The arsonist was later sentenced to 25 years in prison.",
    casualties: "1 dead, dozens injured (about 33 casualties in total)",
    severity: FireEvent.SEVERITY_MAJOR,
    summary:
      "A pre-dawn arson fire at a motel filled with sleeping guests spread through the upper floors on thick smoke. Most of those hurt suffered smoke inhalation, and several were in cardiac arrest or respiratory distress when rescued.",
    sources: [
      {
        title: "1 dead in Gwangju motel fire, arson suspect arrested",
        publisher: "The Korea Economic Daily (Hankyung)",
        url: "https://www.hankyung.com/society/article/2019122239057",
      },
      {
        title: "Gwangju motel arson, man in his 30s who set pillow alight arrested",
        publisher: "The Hankook Ilbo",
        url: "https://www.hankookilbo.com/news/article/201912221053397727",
      },
    ],
  },
  {
    id: "gwangju-apartment-2019",
    title: "Gwangju Apartment Fire",
    location_name: "Gwangju (district not disclosed in reports)",
    latitude: 35.151,
    longitude: 126.916,
    occurred_at: new Date("2019-09-12T04:20:00+09:00").getTime(),
    cause: "Undetermined. An investigation was opened to find the origin of the blaze.",
    casualties: "2 dead, 4 injured",
    severity: FireEvent.SEVERITY_MAJOR,
    summary:
      "A fire broke out before dawn on the fifth floor of an apartment building where a family was asleep. A husband died after falling from the apartment while trying to escape, his wife was found dead inside, and four others were hurt. Firefighters put it out in about 20 minutes.",
    sources: [
      {
        title: "Married couple dead in apartment building fire in Gwangju: officials",
        publisher: "The Korea Herald",
        url: "https://www.koreaherald.com/article/2098907",
      },
    ],
  },
  {
    id: "sinan-hospital-2025",
    title: "Sinan-dong Hospital Fire",
    location_name: "Sinan-dong, Buk-gu, Gwangju",
    latitude: 35.1772,
    longitude: 126.9088,
    occurred_at: new Date("2025-07-10T00:00:00+09:00").getTime(),
    cause: "Under investigation. The fire started near the hospital's emergency room.",
    casualties: "No deaths. 29 medical staff and patients evacuated safely",
    severity: FireEvent.SEVERITY_MODERATE,
    summary:
      "A fire near a hospital emergency room forced medical staff and patients to evacuate on their own before firefighters brought it under control. The quick, orderly escape kept a potentially deadly blaze in a building full of vulnerable patients from causing loss of life.",
    sources: [
      {
        title: "Hospital fire in Gwangju, 29 medical staff and patients self-evacuate",
        publisher: "Nate News",
        url: "https://news.nate.com/view/20250710n04151",
      },
    ],
  },
  {
    id: "yangdong-market-arson-2023",
    title: "Yangdong Market Area Arson",
    location_name: "Yangdong Market, Seo-gu, Gwangju",
    latitude: 35.1547,
    longitude: 126.9027,
    occurred_at: new Date("2023-03-17T06:00:00+09:00").getTime(),
    cause:
      "Arson. Trash and paper were deliberately set alight against buildings near the market, and a parked truck was set on fire, before the suspect fled.",
    casualties: "No casualties",
    severity: FireEvent.SEVERITY_MODERATE,
    summary:
      "A string of early morning arson fires near the crowded Yangdong traditional market was extinguished within about 20 minutes with no one hurt. Set among tightly packed shops and homes, it showed how quickly a deliberate fire could have turned deadly.",
    sources: [
      {
        title: "2023 Gwangju Yangdong Market area arson incident",
        publisher: "NamuWiki",
        url: "https://namu.wiki/w/2023%EB%85%84%20%EA%B4%91%EC%A3%BC%20%EC%96%91%EB%8F%99%EC%8B%9C%EC%9E%A5%20%EC%9D%B8%EA%B7%BC%20%EB%B0%A9%ED%99%94%20%EC%82%AC%EA%B1%B4",
      },
    ],
  },
];

// Marker and badge styling per severity. Fire severity is the one place this
// otherwise neutral theme uses chromatic color, so the values live here and are
// shared by the map markers, the detail badges, and the legend to stay
// consistent. The colors form a clear red to yellow scale so the levels read
// apart at a glance, reinforced by marker size in fire-map.tsx.
export function fireSeverityStyle(severity: string): {
  color: string;
  label: string;
  description: string;
} {
  if (severity === FireEvent.SEVERITY_CATASTROPHIC)
    return {
      color: "#dc2626",
      label: "Catastrophic",
      description: "Mass destruction or a major facility lost",
    };
  if (severity === FireEvent.SEVERITY_MAJOR)
    return {
      color: "#f97316",
      label: "Major",
      description: "Deaths or many people injured",
    };
  return {
    color: "#eab308",
    label: "Moderate",
    description: "Contained with few or no casualties",
  };
}

// Severity levels from most to least severe, for rendering the map legend.
export const SEVERITY_LEGEND: string[] = [
  FireEvent.SEVERITY_CATASTROPHIC,
  FireEvent.SEVERITY_MAJOR,
  FireEvent.SEVERITY_MODERATE,
];
