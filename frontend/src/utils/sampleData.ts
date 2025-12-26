import { BrandKeyword, RankedKeyword } from '../types';

export const SAMPLE_BRAND_KEYWORDS: BrandKeyword[] = [
  { keyword: 'lavera', searchVolume: 12100, isOwnBrand: true },
  { keyword: 'lavera naturkosmetik', searchVolume: 1300, isOwnBrand: true },
  { keyword: 'lavera lippenstift', searchVolume: 480, isOwnBrand: true },
  { keyword: 'weleda', searchVolume: 18100, isOwnBrand: false },
  { keyword: 'dr hauschka', searchVolume: 14800, isOwnBrand: false },
  { keyword: 'annemarie börlind', searchVolume: 5400, isOwnBrand: false },
  { keyword: 'alverde', searchVolume: 27100, isOwnBrand: false },
];

export const SAMPLE_RANKED_KEYWORDS: RankedKeyword[] = [
  { keyword: 'naturkosmetik', searchVolume: 22200, position: 4, url: '/naturkosmetik' },
  { keyword: 'bio gesichtscreme', searchVolume: 3600, position: 2, url: '/gesichtspflege' },
  { keyword: 'vegane kosmetik', searchVolume: 4400, position: 3, url: '/vegan' },
  { keyword: 'natürliche hautpflege', searchVolume: 2900, position: 1, url: '/hautpflege' },
  { keyword: 'bio lippenstift', searchVolume: 1900, position: 5, url: '/lippen' },
  { keyword: 'naturkosmetik gesicht', searchVolume: 2400, position: 6, url: '/gesicht' },
  { keyword: 'bio shampoo', searchVolume: 5400, position: 8, url: '/haarpflege' },
  { keyword: 'naturkosmetik marken', searchVolume: 1600, position: 2, url: '/marken' },
  { keyword: 'zertifizierte naturkosmetik', searchVolume: 880, position: 1, url: '/zertifiziert' },
  { keyword: 'bio bodylotion', searchVolume: 1300, position: 7, url: '/koerperpflege' },
];
