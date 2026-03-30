/**
 * Faction bazlı otomatik şehir/kale isimleri.
 * Her faction'ın kendine özgü isim havuzu var.
 */

export const CITY_NAMES: Record<string, string[]> = {
  turkic: [
    'Otüken', 'Balasagun', 'Karakurum', 'Almalık', 'Saray',
    'Yesi', 'Talas', 'İtil', 'Suvar', 'Bulgar',
    'Semerkant', 'Buhara', 'Kaşgar', 'Hotan', 'Turfan',
    'Beşbalık', 'Suyab', 'Orda', 'Saraycık', 'Derbent',
  ],
  norse: [
    'Asgard', 'Midgard', 'Uppsala', 'Birka', 'Hedeby',
    'Kaupang', 'Jorvik', 'Vinland', 'Ribe', 'Trondheim',
    'Nidaros', 'Skiringsal', 'Roskilde', 'Lund', 'Visby',
    'Sigtuna', 'Staraya', 'Aldeigjuborg', 'Holmgard', 'Miklagard',
  ],
  arab: [
    'Bağdat', 'Şam', 'Kahire', 'Kurtuba', 'İsfahan',
    'Basra', 'Kufe', 'Medine', 'Fustat', 'Kayrevan',
    'Merv', 'Nişabur', 'Rey', 'Tebriz', 'Halep',
    'Musul', 'Samarra', 'Fas', 'Tunus', 'Gırnata',
  ],
  slavic: [
    'Kiev', 'Novgorod', 'Moskova', 'Pskov', 'Suzdal',
    'Vladimir', 'Smolensk', 'Çernigov', 'Ryazan', 'Tver',
    'Rostov', 'Murom', 'Galich', 'Polotsk', 'Turov',
    'Pereyslavl', 'Vışgorod', 'Belgorod', 'Ladoga', 'Izborsk',
  ],
};

// Kullanılmış isimleri takip et (oyun başına)
const usedNames = new Set<string>();

export function resetCityNames() {
  usedNames.clear();
}

export function getNextCityName(factionId: string): string {
  const names = CITY_NAMES[factionId] ?? CITY_NAMES.turkic;
  for (const name of names) {
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
  }
  // Tum isimler kullanıldıysa numaralı isim
  const idx = usedNames.size + 1;
  const fallback = `Sehir ${idx}`;
  usedNames.add(fallback);
  return fallback;
}
