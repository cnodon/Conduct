export interface MarketplaceSkill {
  name: string;
  description: string;
  author: string;
  stars: number;
  tags: string[];
  url: string;
}

export const theme = {
  bg: '#0c0a09',
  surface: '#1c1917',
  surfaceHover: '#292524',
  border: '#44403c',
  textSecondary: '#a8a29e',
  accent: '#f97316',
  accentHover: '#ea580c',
};

export const iconPalette = ['#f97316', '#ef4444', '#f59e0b', '#ec4899', '#fb7185', '#f43f5e'];

export const tagIconMap: Record<string, string> = {
  git: 'terminal',
  github: 'terminal',
  docker: 'inventory_2',
  sql: 'storage',
  db: 'storage',
  database: 'storage',
  refactor: 'tune',
  lint: 'check_circle',
  format: 'code',
  docs: 'description',
  test: 'science',
  build: 'construction',
  design: 'palette',
};

export const getIconForSkill = (skill: MarketplaceSkill) => {
  const tag = skill.tags.find((item) => tagIconMap[item.toLowerCase()]);
  if (tag) {
    return { type: 'symbol' as const, value: tagIconMap[tag.toLowerCase()] };
  }
  return { type: 'symbol' as const, value: 'extension' };
};

export const getAccentColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % iconPalette.length;
  }
  return iconPalette[hash];
};
