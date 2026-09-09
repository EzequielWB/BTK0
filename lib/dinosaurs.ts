export type Dino = {
  id: string;
  code: string;
  species: string;
  role: string;
  art: string;
};

const art = {
  tyra: [
    "▄▄▄▄▄▄▄▄▄",
    "█▀▀▀▀▀▀▀▄",
    "█▄░▄▄▄▄▄█",
    "██▄▄▄▄▄▄█",
    "▀▀▀▀▀▀▀█▄",
    "▄▄▄▄▄▄▄▄▄",
  ].join("\n"),
  nod0: [
    "▄▄▄▄▄▄▄▄▄",
    "█▀▀▀▀▀▀▀▄",
    "█▄░░░░░░█",
    "█▄██▄▄▄▄█",
    "▀▀▀▀▀▀▀▀▀",
  ].join("\n"),
  ank: [
    "▄▄▄▄▄▄▄▄▄",
    "█▀▀▀▀▀▀▀█",
    "█▀░▀▀▀░▀█",
    "█▄▄▄▄▄▄▄█",
    "▀▀▀▀▀▀▀▀▀",
  ].join("\n"),
  v3l0: [
    "▄▄▄▄▄▄▄▄▄",
    "█▀▀▀▀▀▀▀▄",
    "█▄░▄░░░░█",
    "█▄▄░░░░░▄",
    "▀▀▀▀▀▀▀▀█",
    "▄▄▄▄▄▄▄▄▄",
  ].join("\n"),
  br4ch0: [
    "▄▄▄▄▄▄▄▄▄",
    "██▀▀▀▀▀▀▄",
    "██▄░▄▄▄▄█",
    "██▄░▄▄▄▄█",
    "███▄▄▄▄▄▄",
    "▀▀▀▀▀▀▀▀▀",
  ].join("\n"),
  tr1l0: [
    "▀▀▄▄▄▄▄▀▀",
    "▄█▄▀▀▀▄█▄",
    "▄█░▀▀▀░▄█",
    "▄▄▄██▄▄▄▄",
    "▄▄▄▄▄▄▄▄▄",
    "▀▀▀▀▀▀▀▀▀",
  ].join("\n"),
} as const;

export const DINOSAURS: Dino[] = [
  {
    id: "tyra",
    code: "TYrA_",
    species: "Tiranosaurio",
    role: "El que manda",
    art: art.tyra,
  },
  {
    id: "nod0",
    code: "N0d-0",
    species: "Iguanodonte",
    role: "El compañero",
    art: art.nod0,
  },
  {
    id: "ank",
    code: "4nky",
    species: "Anquilosaurio",
    role: "El sabio tranquilo",
    art: art.ank,
  },
  {
    id: "v3l0",
    code: "V3L0",
    species: "Velociraptor",
    role: "El ágil",
    art: art.v3l0,
  },
  {
    id: "br4ch0",
    code: "BR4ch0",
    species: "Brachiosaurio",
    role: "El que ve lejos",
    art: art.br4ch0,
  },
  {
    id: "tr1l0",
    code: "Tr1l0_",
    species: "Triceratops",
    role: "El metódico",
    art: art.tr1l0,
  },
];

export function getDinoById(id: string): Dino | undefined {
  return DINOSAURS.find((d) => d.id === id || d.code === id);
}