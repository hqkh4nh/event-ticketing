export const VIETNAM_PROVINCES = [
  'An Giang',
  'Bắc Ninh',
  'Cà Mau',
  'Cần Thơ',
  'Cao Bằng',
  'Đà Nẵng',
  'Đắk Lắk',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Nội',
  'Hà Tĩnh',
  'Hải Phòng',
  'Hồ Chí Minh',
  'Huế',
  'Hưng Yên',
  'Khánh Hòa',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Nghệ An',
  'Ninh Bình',
  'Phú Thọ',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sơn La',
  'Tây Ninh',
  'Thái Nguyên',
  'Thanh Hóa',
  'Tuyên Quang',
  'Vĩnh Long',
] as const;

export type VietnamProvince = (typeof VIETNAM_PROVINCES)[number];

function normalizeProvinceIdentity(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi-VN')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^(?:tinh|thanh pho|tp)\s+/, '')
    .replace(/\s+(?:province|city)$/, '');
}

const provinceByIdentity = new Map<string, VietnamProvince>(
  VIETNAM_PROVINCES.map((province) => [
    normalizeProvinceIdentity(province),
    province,
  ]),
);

const provinceAliases = new Map<string, VietnamProvince>([
  ['hanoi', 'Hà Nội'],
  ['hcm', 'Hồ Chí Minh'],
  ['tphcm', 'Hồ Chí Minh'],
  ['sai gon', 'Hồ Chí Minh'],
  ['saigon', 'Hồ Chí Minh'],
  ['danang', 'Đà Nẵng'],
]);

export function getVietnamProvince(value: string): VietnamProvince | null {
  const identity = normalizeProvinceIdentity(value);
  return provinceByIdentity.get(identity) ?? provinceAliases.get(identity) ?? null;
}

export function isSameVietnamProvince(first: string, second: string): boolean {
  const firstProvince = getVietnamProvince(first);
  const secondProvince = getVietnamProvince(second);

  if (firstProvince && secondProvince) return firstProvince === secondProvince;
  return normalizeProvinceIdentity(first) === normalizeProvinceIdentity(second);
}
